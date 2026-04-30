/**
 * Motor de Ingesta de Datos (ETL) - Versión 100% Dinámica
 * Sin "Magic Numbers": Busca columnas por nombre en Catálogos y Hechos.
 * Incluye limpieza de texto (Trim) y explosión de Grids.
 */
class DataIngestionEngine {
    constructor() {
        this.config = new Config();
        this.ss = SpreadsheetApp.getActiveSpreadsheet();

        // 1. Conexión a Hoja FACT
        const nombreHojaFact = this.config.get('HOJA_FACT_HISTORIAL');
        this.factSheet = this.ss.getSheetByName(nombreHojaFact);
        if (!this.factSheet) throw new Error(`No se halló la hoja: ${nombreHojaFact}`);

        // 2. Mapeo Dinámico de la Hoja FACT
        const encabezadosFact = this.factSheet.getRange(1, 1, 1, this.factSheet.getLastColumn()).getValues()[0];
        this.mapaColumnas = this._mapearEncabezados(encabezadosFact);

        // 3. Conexión y Mapeo Dinámico del CATÁLOGO DE PREGUNTAS
        const hojaCat = this.ss.getSheetByName(this.config.get('HOJA_CAT_PREGUNTAS'));
        const dataCat = hojaCat.getDataRange().getValues();
        this.mapaCatPreguntas = this._mapearEncabezados(dataCat[0]); // Mapea la fila 1
        this.catPreguntas = dataCat.slice(1); // Guardamos los datos sin el encabezado

        // 4. Catálogo de Escalas
        this.catEscalas = this.ss.getSheetByName('CAT_ESCALAS').getDataRange().getValues();
    }

    /**
     * Ejecución principal del proceso
     */
    run(e) {
        let respuesta = e.response;
        if (!respuesta) {
            Logger.log("⚠️ Detectado trigger desde Sheets, obteniendo última respuesta del Form...");
            const formId = this.config.get('ID_FORMULARIO');
            const form = FormApp.openById(formId);
            respuesta = form.getResponses().pop();
        }

        const itemResponses = respuesta.getItemResponses();
        const timestamp = respuesta.getTimestamp();
        const idTransaccion = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");

        Logger.log(`🔍 Total de respuestas leídas: ${itemResponses.length}`);

        // FASE 1: Extraer Contexto (DIMs)
        const contexto = this._extraerDimensiones(itemResponses);
        Logger.log(`🧩 Contexto extraído (DIMs): ${JSON.stringify(contexto)}`);

        // FASE 2: Procesar Hechos (Preguntas y Grids)
        const filasParaInsertar = [];

        itemResponses.forEach(itemRes => {
            const item = itemRes.getItem();
            const tipo = item.getType();
            const titulo = item.getTitle();

            // Si es una tabla (Cuadrícula)
            if (tipo === FormApp.ItemType.CHECKBOX_GRID || tipo === FormApp.ItemType.GRID) {
                const gridItem = tipo === FormApp.ItemType.CHECKBOX_GRID ? item.asCheckboxGridItem() : item.asGridItem();
                const filasGrid = gridItem.getRows();
                const respuestaRaw = itemRes.getResponse();

                filasGrid.forEach((nombreFila, index) => {
                    const infoPreguntaFila = this._buscarInfoPregunta(nombreFila);
                    Logger.log(`[GRID] Fila: "${nombreFila}" | ¿Hallada?: ${infoPreguntaFila ? 'SÍ (' + infoPreguntaFila.id + ')' : 'NO'}`);

                    if (infoPreguntaFila && !infoPreguntaFila.id.startsWith('DIM_')) {
                        const valorFila = respuestaRaw[index];
                        if (valorFila != null && valorFila !== "") {
                            filasParaInsertar.push(this._ensamblarFila(idTransaccion, timestamp, contexto, infoPreguntaFila.id, valorFila, infoPreguntaFila.escalaId));
                        }
                    }
                });

            } else {
                // Si es pregunta simple
                const infoPregunta = this._buscarInfoPregunta(titulo);
                Logger.log(`[SIMPLE] Pregunta: "${titulo}" | ¿Hallada?: ${infoPregunta ? 'SÍ (' + infoPregunta.id + ')' : 'NO'}`);

                if (infoPregunta && !infoPregunta.id.startsWith('DIM_')) {
                    const valor = itemRes.getResponse();
                    if (valor != null && valor !== "") {
                        filasParaInsertar.push(this._ensamblarFila(idTransaccion, timestamp, contexto, infoPregunta.id, valor, infoPregunta.escalaId));
                    }
                }
            }
        });

        Logger.log(`📊 Filas listas para insertar: ${filasParaInsertar.length}`);

        // FASE 3: Insertar en la Hoja de Hechos
        if (filasParaInsertar.length > 0) {
            this.factSheet.getRange(this.factSheet.getLastRow() + 1, 1, filasParaInsertar.length, filasParaInsertar[0].length)
                .setValues(filasParaInsertar);
            Logger.log(`✅ ETL Exitoso: ${filasParaInsertar.length} registros insertados.`);
        } else {
            Logger.log("⚠️ No hubo filas para insertar.");
        }
    }

    /**
     * Crea un diccionario { "NOMBRE_COLUMNA": IndiceNumérico }
     * @private
     */
    _mapearEncabezados(encabezados) {
        const mapa = {};
        encabezados.forEach((nombre, index) => {
            if (nombre) mapa[String(nombre).trim()] = index;
        });
        return mapa;
    }

    /**
     * Extrae las dimensiones (DIM_*)
     * @private
     */
    _extraerDimensiones(itemResponses) {
        const contexto = {};
        itemResponses.forEach(itemRes => {
            const info = this._buscarInfoPregunta(itemRes.getItem().getTitle());
            if (info && info.id.startsWith('DIM_')) {
                contexto[info.id] = itemRes.getResponse();
            }
        });
        return contexto;
    }

    /**
     * Ensambla la fila usando el mapa de columnas dinámico
     * @private
     */
    _ensamblarFila(id, fecha, ctx, idPregunta, valor, escalaId) {
        const columnasTotales = Object.keys(this.mapaColumnas).length;
        const fila = new Array(columnasTotales).fill("");

        if (this.mapaColumnas['ID_TRANSACCION'] !== undefined) fila[this.mapaColumnas['ID_TRANSACCION']] = id;
        if (this.mapaColumnas['FECHA_INSPECCION'] !== undefined) fila[this.mapaColumnas['FECHA_INSPECCION']] = fecha;
        if (this.mapaColumnas['ID_PREGUNTA'] !== undefined) fila[this.mapaColumnas['ID_PREGUNTA']] = idPregunta;
        if (this.mapaColumnas['RESPUESTA_RAW'] !== undefined) {
            fila[this.mapaColumnas['RESPUESTA_RAW']] = Array.isArray(valor) ? valor.join(", ") : valor;
        }
        if (this.mapaColumnas['PUNTAJE'] !== undefined) {
            fila[this.mapaColumnas['PUNTAJE']] = this._calcularPuntaje(escalaId, valor);
        }

        Object.keys(this.mapaColumnas).forEach(colNombre => {
            if (colNombre.startsWith('DIM_')) {
                fila[this.mapaColumnas[colNombre]] = ctx[colNombre] || "N/A";
            }
        });

        return fila;
    }

    /**
     * Calcula el puntaje buscando en CAT_ESCALAS
     * @private
     */
    _calcularPuntaje(escalaId, respuesta) {
        if (!escalaId || escalaId === 'N/A') return 0;
        const filaEscala = this.catEscalas.find(r => r[0] === escalaId);
        if (!filaEscala) return 0;

        const opciones = filaEscala[1].split(",").map(s => s.trim().toLowerCase());
        const puntos = filaEscala[2].split(",").map(s => s.trim());

        if (Array.isArray(respuesta)) {
            return respuesta.reduce((acc, r) => {
                const i = opciones.indexOf(String(r).trim().toLowerCase());
                return acc + (i !== -1 ? parseFloat(puntos[i]) : 0);
            }, 0);
        }
        const i = opciones.indexOf(String(respuesta).trim().toLowerCase());
        return i !== -1 ? parseFloat(puntos[i]) : 0;
    }

    /**
     * Búsqueda inteligente: Usa los nombres de las columnas para no depender del orden
     * y limpia espacios/mayúsculas para un match perfecto.
     * @private
     */
    _buscarInfoPregunta(titulo) {
        if (!titulo) return null;

        // Obtenemos en qué número de columna quedaron TEXTO, ID_PREGUNTA y ID_ESCALA
        const idxTexto = this.mapaCatPreguntas['TEXTO'];
        const idxId = this.mapaCatPreguntas['ID_PREGUNTA'];
        const idxEscala = this.mapaCatPreguntas['ID_ESCALA'];

        if (idxTexto === undefined || idxId === undefined) {
            Logger.log("⚠️ Error: No se encontraron las columnas 'TEXTO' o 'ID_PREGUNTA' en CAT_PREGUNTAS.");
            return null;
        }

        const tituloLimpio = String(titulo).trim().toLowerCase();

        const fila = this.catPreguntas.find(r => {
            if (!r[idxTexto]) return false;
            return String(r[idxTexto]).trim().toLowerCase() === tituloLimpio;
        });

        return fila ? { id: fila[idxId], escalaId: fila[idxEscala] } : null;
    }
}

/**
 * Trigger global
 */
function registrarRespuestaETL(e) {
    try {
        const engine = new DataIngestionEngine();
        engine.run(e);
    } catch (err) {
        Logger.log(`❌ Error: ${err.message}\n${err.stack}`);
    }
}
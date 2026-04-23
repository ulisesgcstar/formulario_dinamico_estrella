/**
 * Clase encargada de interpretar el Sheets y construir el núcleo dinámico del Formulario.
 * Ajustado para filtrar por ID_REVISION y organizar por GRUPO_VISUAL.
 */
class MotorConstructor {
    constructor() {
        // 1. Cargamos los punteros desde nuestra clase Config
        this.sheetName = config.get('HOJA_CAT_PREGUNTAS');
        // Ahora el filtro es el ID de la revisión (ej: GTE-FMT-MTO-01)
        this.filtroRevision = config.get('FILTRO_CONSTRUCCION_DINAMICA');
        this.formId = config.get('ID_FORMULARIO');

        // 2. Conexiones principales
        this.ss = SpreadsheetApp.getActiveSpreadsheet();
        this.form = FormApp.openById(this.formId);

        // 3. Mapeo de columnas (Se autoejecuta)
        this.cols = this._mapearColumnas();
    }

    /**
     * Identifica los índices de las columnas según su encabezado.
     * @private
     */
    _mapearColumnas() {
        const sheet = this.ss.getSheetByName(this.sheetName);
        if (!sheet) throw new Error(`No existe la hoja: ${this.sheetName}`);

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        // Añadimos ID_REVISION a las columnas requeridas
        const columnasRequeridas = [
            'ID_PREGUNTA',
            'ID_REVISION', // <--- Nueva columna crítica para el filtro
            'GRUPO_VISUAL',
            'GRUPO_CUADRICULA',
            'TEXTO',
            'TEXTO_AYUDA',
            'TIPO_CONTROL',
            'ID_ESCALA',
            'OBLIGATORIO',
            'ESTADO',
        ];

        const mapa = {};
        columnasRequeridas.forEach((col) => {
            const idx = headers.indexOf(col);
            if (idx === -1) {
                throw new Error(`Columna crítica no hallada: "${col}" en ${this.sheetName}`);
            }
            mapa[col] = idx;
        });

        return mapa;
    }

    /**
     * Filtra las filas de la hoja según el ID_REVISION y el estado activo.
     * @returns {Array<Object>} Lista de preguntas estructuradas.
     */
    obtenerPreguntasParaConstruir() {
        const sheet = this.ss.getSheetByName(this.sheetName);
        const data = sheet.getDataRange().getValues().slice(1);

        // Ajustamos el filtro para usar ID_REVISION
        const filasFiltradas = data.filter((row) => {
            const coincideRevision = row[this.cols.ID_REVISION] === this.filtroRevision;
            const estaActiva = row[this.cols.ESTADO] === true || row[this.cols.ESTADO] === 'TRUE';
            return coincideRevision && estaActiva;
        });

        Logger.log(`🔍 Motor: Filtrando por Revisión: "${this.filtroRevision}". Encontradas: ${filasFiltradas.length}`);

        return filasFiltradas.map((row) => ({
            id: row[this.cols.ID_PREGUNTA],
            revision: row[this.cols.ID_REVISION],
            grupoVisual: row[this.cols.GRUPO_VISUAL], // Lo guardamos para los PageBreaks
            gridId: row[this.cols.GRUPO_CUADRICULA],
            titulo: row[this.cols.TEXTO],
            ayuda: row[this.cols.TEXTO_AYUDA],
            tipo: row[this.cols.TIPO_CONTROL],
            escalaId: row[this.cols.ID_ESCALA],
            obligatorio: row[this.cols.OBLIGATORIO],
        }));
    }

    /**
   * Ejecuta la construcción física de los elementos en el Formulario.
   */
    construir() {
        const preguntas = this.obtenerPreguntasParaConstruir();
        if (preguntas.length === 0) return Logger.log('⚠️ No hay preguntas para inyectar.');

        // Este "buzón" guardará las preguntas de tipo GRID agrupadas por nombre de grupo
        const bufferGrids = {};
        const bufferCheckboxGrids = {};

        preguntas.forEach((p) => {
            const tipo = p.tipo.toUpperCase();

            if (tipo === 'GRID') {
                if (!bufferGrids[p.grupoVisual]) bufferGrids[p.grupoVisual] = [];
                bufferGrids[p.grupoVisual].push(p);
            } else if (tipo === 'CHECKBOX_GRID') { // <--- NUEVO CASO
                if (!bufferCheckboxGrids[p.grupoVisual]) bufferCheckboxGrids[p.grupoVisual] = [];
                bufferCheckboxGrids[p.grupoVisual].push(p);
            } else if (tipo === 'TEXT') {
                this._crearPreguntaTexto(p);
            } else if (tipo === 'DATE') {
                this._crearPreguntaFecha(p);
            } else if (tipo === 'PARAGRAPH') { // <--- NUEVO
                this._crearPreguntaParrafo(p);
            } else if (tipo === 'TIME') {      // <--- NUEVO
                this._crearPreguntaHora(p);
            } else if (tipo === 'LIST') {      // <--- NUEVO
                this._crearPreguntaLista(p);
            }
        });

        // Una vez que terminamos el bucle, creamos UN solo Grid por cada grupo encontrado
        for (const nombreDelGrupo in bufferGrids) {
            this._crearGridAgrupado(nombreDelGrupo, bufferGrids[nombreDelGrupo]);
        }

        for (const nombreDelGrupo in bufferCheckboxGrids) { // <--- NUEVO PROCESO
            this._crearCheckboxGridAgrupado(nombreDelGrupo, bufferCheckboxGrids[nombreDelGrupo]);
        }

        Logger.log('✅ Construcción finalizada.');
    }

    /**
     * Crea una pregunta de respuesta corta.
     * @private
     */
    _crearPreguntaTexto(p) {
        const item = this.form.addTextItem();
        item.setTitle(p.titulo)
            .setHelpText(p.ayuda || '')
            .setRequired(p.obligatorio === true || p.obligatorio === 'TRUE');

        Logger.log(`   📝 Creada Pregunta Texto: ${p.titulo}`);
    }

    /**
     * Crea una pregunta de tipo Fecha.
     * @private
     */
    _crearPreguntaFecha(p) {
        const item = this.form.addDateItem();
        item.setTitle(p.titulo)
            .setHelpText(p.ayuda || '')
            .setRequired(p.obligatorio === true || p.obligatorio === 'TRUE');

        Logger.log(`   📅 Creada Pregunta Fecha: ${p.titulo}`);
    }

    /**
   * Crea una cuadrícula (Grid) o añade una fila a una existente.
   * @private
   */
    _crearPreguntaGrid(p) {
        // 1. Obtenemos las opciones (columnas) desde la hoja de escalas
        const opciones = this._obtenerOpcionesEscala(p.escalaId);

        // 2. Creamos el Grid Item
        // NOTA: En esta versión simple, cada pregunta GRID crea su propia tabla.
        // Si quisieras agrupar varias preguntas en una sola tabla, 
        // se compararía el gridId con el anterior (similar a la lógica de secciones).
        const item = this.form.addGridItem();

        item.setTitle(p.titulo)
            .setHelpText(p.ayuda || '')
            .setRows([p.titulo]) // La pregunta es la fila
            .setColumns(opciones) // La escala son las columnas
            .setRequired(p.obligatorio === true || p.obligatorio === 'TRUE');

        Logger.log(`   📊 Creada Cuadrícula (1 fila): ${p.id}`);
    }

    /**
     * Busca en CAT_ESCALAS y devuelve un array de strings.
     * @private
     * @param {string} escalaId ID a buscar (ej: 'C-NC-NA')
     */
    _obtenerOpcionesEscala(escalaId) {
        const sheetEscalas = this.ss.getSheetByName('CAT_ESCALAS');
        const data = sheetEscalas.getDataRange().getValues();

        // Buscamos la fila que coincida con el ID_ESCALA
        const filaEscala = data.find(row => row[0] === escalaId);

        if (!filaEscala) {
            Logger.log(`⚠️ No se encontró la escala "${escalaId}". Usando opciones por defecto.`);
            return ['SÍ', 'NO', 'N/A'];
        }

        // El valor viene como "C, NC, NA", lo convertimos en ["C", "NC", "NA"]
        return filaEscala[1].split(',').map(opcion => opcion.trim());
    }
    /**
 * Toma un grupo de preguntas y crea una sola tabla (GridItem).
 * @private
 */
    _crearGridAgrupado(nombreDelGrupo, listaDePreguntas) {
        // 1. Obtenemos la escala (usamos la del primer elemento del grupo)
        const escalaId = listaDePreguntas[0].escalaId;
        const opciones = this._obtenerOpcionesEscala(escalaId);

        // 2. Extraemos solo los textos de las preguntas para que sean las filas
        const filas = listaDePreguntas.map(p => p.titulo);

        // 3. Creamos el elemento en el Formulario
        const item = this.form.addGridItem();
        item.setTitle(nombreDelGrupo) // El título de la tabla es el GRUPO_VISUAL
            .setRows(filas)           // Todas las preguntas del grupo son las filas
            .setColumns(opciones)     // La escala son las columnas
            .setRequired(listaDePreguntas[0].obligatorio === true || listaDePreguntas[0].obligatorio === 'TRUE');

        Logger.log(`   📊 Cuadrícula agrupada creada: "${nombreDelGrupo}" con ${filas.length} filas.`);
    }
    /**
     * Crea una pregunta de respuesta larga (Párrafo).
     * @private
     */
    _crearPreguntaParrafo(p) {
        this.form.addParagraphTextItem()
            .setTitle(p.titulo)
            .setHelpText(p.ayuda || '')
            .setRequired(p.obligatorio === true || p.obligatorio === 'TRUE');
        Logger.log(`   📝 Párrafo: ${p.titulo}`);
    }

    /**
     * Crea una pregunta de selección de hora.
     * @private
     */
    _crearPreguntaHora(p) {
        this.form.addTimeItem()
            .setTitle(p.titulo)
            .setHelpText(p.ayuda || '')
            .setRequired(p.obligatorio === true || p.obligatorio === 'TRUE');
        Logger.log(`   🕒 Hora: ${p.titulo}`);
    }

    /**
     * Crea solo la estructura de una lista desplegable.
     * Las opciones se llenan externamente con la lógica de catálogos.
     * @private
     */
    _crearPreguntaLista(p) {
        this.form.addListItem()
            .setTitle(p.titulo)
            .setHelpText(p.ayuda || '')
            .setRequired(p.obligatorio === true || p.obligatorio === 'TRUE');
        Logger.log(`   📜 Lista (Estructura creada): ${p.titulo}`);
    }

    /**
   * Crea una sola tabla de casillas de verificación (CheckboxGridItem).
   * @private
   */
    _crearCheckboxGridAgrupado(nombreDelGrupo, listaDePreguntas) {
        const escalaId = listaDePreguntas[0].escalaId;
        const opciones = this._obtenerOpcionesEscala(escalaId);
        const filas = listaDePreguntas.map(p => p.titulo);

        const item = this.form.addCheckboxGridItem(); // <--- La diferencia clave
        item.setTitle(nombreDelGrupo)
            .setRows(filas)
            .setColumns(opciones)
            .setRequired(listaDePreguntas[0].obligatorio === true || listaDePreguntas[0].obligatorio === 'TRUE');

        Logger.log(`   ☑️ Checkbox Grid agrupado: "${nombreDelGrupo}"`);
    }

}

//const motor = new MotorConstructor();
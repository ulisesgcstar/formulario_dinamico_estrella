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

        let ultimoGrupo = null;

        preguntas.forEach((p) => {
            // 1. Lógica de Salto de Página (PageBreak)
            // Si el grupo cambia, insertamos una nueva sección
            if (p.grupoVisual !== ultimoGrupo) {
                this.form.addPageBreakItem().setTitle(p.grupoVisual);
                ultimoGrupo = p.grupoVisual;
                Logger.log(`📖 Nueva Sección: ${p.grupoVisual}`);
            }

            // 2. Switch de Tipos: ¿Qué vamos a crear?
            switch (p.tipo.toUpperCase()) {
                case 'TEXT':
                    this._crearPreguntaTexto(p);
                    break;
                case 'GRID':
                    // La lógica de GRID es especial y la veremos en el siguiente paso
                    Logger.log(`📦 Preparando Grid para ID: ${p.id}`);
                    break;
                case 'DATE':
                    this._crearPreguntaFecha(p);
                    break;
                default:
                    Logger.log(`⚠️ Tipo de control no soportado: ${p.tipo}`);
            }
        });

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
}

const motor = new MotorConstructor();
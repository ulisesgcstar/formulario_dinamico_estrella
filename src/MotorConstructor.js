/**
 * Clase encargada de interpretar el Sheets y construir el núcleo dinámico del Formulario.
 * Sigue un enfoque de inyección selectiva por grupos.
 */
class MotorConstructor {
    constructor() {
        // 1. Cargamos los punteros desde nuestra clase Config
        this.sheetName = config.get('HOJA_CAT_PREGUNTAS');
        this.filtroGrupo = config.get('FILTRO_CONSTRUCCION_DINAMICA');
        this.formId = config.get('ID_FORMULARIO');

        // 2. Conexiones principales
        this.ss = SpreadsheetApp.getActiveSpreadsheet();
        this.form = FormApp.openById(this.formId);

        // 3. Mapeo de columnas (Se autoejecuta para saber dónde está cada dato)
        this.cols = this._mapearColumnas();
    }

    /**
     * Identifica los índices de las columnas según su encabezado.
     * @private
     * @returns {Object} Diccionario con nombres de columnas y su índice (0-based).
     */
    _mapearColumnas() {
        const sheet = this.ss.getSheetByName(this.sheetName);
        if (!sheet) throw new Error(`No existe la hoja: ${this.sheetName}`);

        // Obtenemos solo la primera fila (headers)
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        const columnasRequeridas = [
            'ID_PREGUNTA',
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
     * Filtra las filas de la hoja según el grupo visual y el estado activo.
     * @returns {Array<Object>} Lista de preguntas estructuradas.
     */
    obtenerPreguntasParaConstruir() {
        const sheet = this.ss.getSheetByName(this.sheetName);
        const data = sheet.getDataRange().getValues().slice(1); // Quitamos encabezados

        // Aplicamos el filtro: Coincidencia de grupo Y que esté activo
        const filasFiltradas = data.filter((row) => {
            const coincideGrupo = row[this.cols.GRUPO_VISUAL] === this.filtroGrupo;
            const estaActiva = row[this.cols.ESTADO] === true || row[this.cols.ESTADO] === 'TRUE';
            return coincideGrupo && estaActiva;
        });

        Logger.log(`🔍 Motor: Se encontraron ${filasFiltradas.length} preguntas para el grupo: "${this.filtroGrupo}"`);

        // Transformamos las filas en objetos legibles para facilitar el siguiente paso
        return filasFiltradas.map((row) => ({
            id: row[this.cols.ID_PREGUNTA],
            gridId: row[this.cols.GRUPO_CUADRICULA],
            titulo: row[this.cols.TEXTO],
            ayuda: row[this.cols.TEXTO_AYUDA],
            tipo: row[this.cols.TIPO_CONTROL],
            escalaId: row[this.cols.ID_ESCALA],
            obligatorio: row[this.cols.OBLIGATORIO],
        }));
    }
}

// Instancia global para ser usada en todo el proyecto
const motor = new MotorConstructor();
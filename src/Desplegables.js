/**
 * Clase encargada de la sincronización de listas desplegables.
 * Conecta las pestañas de origen con los elementos del Google Form.
 */
class GestorDesplegables {
    constructor() {
        this.sheetName = 'CAT_DESPLEGABLES';
        this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        this.form = FormApp.openById(config.get('ID_FORMULARIO'));
    }

    /**
     * Ejecuta la sincronización completa de todos los catálogos registrados.
     */
    syncAll() {
        const sheet = this.spreadsheet.getSheetByName(this.sheetName);
        const data = sheet.getDataRange().getValues();

        // Iteramos sobre la tabla de mapeo (CAT_DESPLEGABLES)
        for (let i = 1; i < data.length; i++) {
            const [preguntaTitulo, hojaOrigen, columnaNombre] = data[i];

            if (preguntaTitulo && hojaOrigen && columnaNombre) {
                const opciones = this._fetchSourceData(hojaOrigen, columnaNombre);
                this._updateFormItem(preguntaTitulo, opciones);
            }
        }
        Logger.log('✅ Sincronización de catálogos finalizada.');
    }

    /**
     * Extrae los valores únicos de una columna específica en una hoja catálogo.
     * @private
     */
    _fetchSourceData(hoja, columna) {
        const sourceSheet = this.spreadsheet.getSheetByName(hoja);
        const data = sourceSheet.getDataRange().getValues();
        const headers = data[0];
        const colIndex = headers.indexOf(columna);

        if (colIndex === -1) throw new Error(`Columna "${columna}" no hallada en ${hoja}`);

        // Extraemos los datos omitiendo encabezado y filtrando celdas vacías
        return data.slice(1)
            .map(row => row[colIndex])
            .filter(cell => cell !== "" && cell !== null);
    }

    /**
     * Busca la pregunta en el Forms y actualiza sus opciones.
     * @private
     */
    _updateFormItem(titulo, opciones) {
        const items = this.form.getItems(FormApp.ItemType.LIST);
        const item = items.find(i => i.getTitle() === titulo);

        if (item) {
            item.asListItem().setChoiceValues(opciones);
            Logger.log(`   Actualizado: ${titulo} (${opciones.length} opciones)`);
        } else {
            Logger.log(`   ⚠️ No se encontró la lista: "${titulo}" en el Formulario.`);
        }
    }
}

// Instancia global
const desplegables = new GestorDesplegables();
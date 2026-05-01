/**
 * Clase encargada de la sincronización de listas desplegables.
 * Conecta las pestañas de origen con los elementos del Google Form.
 * Implementa lógica de filtrado agnóstico por dimensión.
 */
class GestorDesplegables {
    constructor() {
        this.sheetName = 'CAT_DESPLEGABLES';
        this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        // Instancia global 'config' definida en Config.js[cite: 3]
        this.form = FormApp.openById(config.get('ID_FORMULARIO'));
    }

    /**
     * Ejecuta la sincronización completa de todos los catálogos registrados.
     */
    syncAll() {
        const sheet = this.spreadsheet.getSheetByName(this.sheetName);
        const data = sheet.getDataRange().getValues();

        // Iteramos sobre la tabla de mapeo, saltando los encabezados
        for (let i = 1; i < data.length; i++) {
            // Desestructuración de las 5 columnas acordadas
            const [preguntaTitulo, hojaOrigen, columnaNombre, atributoCriterio, valorFiltro] = data[i];

            if (preguntaTitulo && hojaOrigen && columnaNombre) {
                const opciones = this._fetchSourceData(hojaOrigen, columnaNombre, atributoCriterio, valorFiltro);
                this._updateFormItem(preguntaTitulo, opciones);
            }
        }
        Logger.log('✅ Sincronización de catálogos finalizada.');
    }

    /**
     * Extrae y filtra los valores únicos de la hoja origen.
     * @private
     */
    _fetchSourceData(hoja, columna, criterio, valorFiltro) {
        const sourceSheet = this.spreadsheet.getSheetByName(hoja);
        if (!sourceSheet) throw new Error(`Hoja origen no encontrada: ${hoja}`);

        const data = sourceSheet.getDataRange().getValues();
        const headers = data[0];

        const colIndex = headers.indexOf(columna);
        const filterIndex = criterio ? headers.indexOf(criterio) : -1;
        const estadoIndex = headers.indexOf('ESTADO');

        if (colIndex === -1) throw new Error(`Columna de datos "${columna}" no hallada en ${hoja}`);

        // Solo lanzamos error si se definió un criterio pero no existe en la hoja origen
        if (criterio && filterIndex === -1) throw new Error(`Atributo criterio "${criterio}" no hallado en ${hoja}`);

        return data.slice(1)
            .filter(row => {
                // Verificación de estado (si existe la columna ESTADO)[cite: 1]
                const activo = estadoIndex === -1 || row[estadoIndex] === true || row[estadoIndex] === "TRUE";

                // Verificación de filtro (si se definió un atributo criterio)
                const coincideFiltro = !criterio || row[filterIndex] == valorFiltro;

                return activo && coincideFiltro;
            })
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
            // Si el filtro no arroja resultados, mostramos 'SIN DATOS' para no romper el form
            const opcionesValidas = opciones.length > 0 ? opciones : ['SIN DATOS'];
            item.asListItem().setChoiceValues(opcionesValidas);
            Logger.log(`   Actualizado: ${titulo} (${opcionesValidas.length} opciones)`);
        } else {
            Logger.log(`   ⚠️ No se encontró la lista: "${titulo}" en el Formulario.`);
        }
    }
}
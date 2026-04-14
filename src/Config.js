/**
 * Clase para gestionar la configuración del sistema desde la pestaña _CONFIG_
 * Implementa un patrón de diccionario para evitar el uso de celdas fijas.
 */
class Config {
    constructor() {
        this.sheetName = '_CONFIG_';
        this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        this.values = this._loadConfig();
    }

    /**
     * Lee la pestaña _CONFIG_ y mapea las variables en un objeto plano.
     * @private
     */
    _loadConfig() {
        const sheet = this.spreadsheet.getSheetByName(this.sheetName);
        if (!sheet) {
            throw new Error(`No se encontró la pestaña "${this.sheetName}" en el Sheets.`);
        }

        const data = sheet.getDataRange().getValues();
        const configObj = {};

        // Iteramos saltando el encabezado (fila 0)
        for (let i = 1; i < data.length; i++) {
            const variable = data[i][0]; // Columna A
            const valor = data[i][1];    // Columna B

            if (variable) {
                configObj[variable] = valor;
            }
        }
        return configObj;
    }

    /**
     * Recupera el valor de una variable de configuración.
     * @param {string} key Nombre de la variable en la columna A.
     * @returns {string} Valor de la columna B.
     */
    get(key) {
        const value = this.values[key];
        if (value === undefined) {
            throw new Error(`La variable "${key}" no existe en la pestaña de configuración.`);
        }
        return value;
    }
}

// Instancia global para ser utilizada por el resto de los módulos
const config = new Config();
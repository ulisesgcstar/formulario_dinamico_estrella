/**
 * Función para probar la lectura de configuración.
 * Ejecútala desde el editor de Apps Script después de hacer el push.
 */
function testConfig() {
    try {
        const idForm = config.get('ID_FORMULARIO');
        const idSheet = config.get('ID_SPREADSHEET');

        Logger.log('✅ Conexión exitosa');
        Logger.log('ID Formulario recuperado: ' + idForm);
        Logger.log('ID Spreadsheet recuperado: ' + idSheet);

    } catch (error) {
        Logger.log('❌ Error en la prueba: ' + error.message);
    }
}
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

/**
 * Prueba la sincronización de listas desplegables.
 * Verifica la conexión entre CAT_DESPLEGABLES y el Formulario.
 */
function testSincronizarDesplegables() {
    try {
        Logger.log('Iniciando prueba de sincronización...');

        // Llamamos al método principal de nuestra instancia global
        desplegables.syncAll();

        Logger.log('✅ Prueba finalizada con éxito. Revisa tu Google Form.');
    } catch (error) {
        Logger.log('❌ Error en la prueba de desplegables: ' + error.message);
    }
}

/**
 * Prueba la construcción del núcleo dinámico.
 * Verifica que el motor lea el ID_REVISION y cree los elementos en el Forms.
 */
function testConstruirMotor() {
    try {
        Logger.log('🚀 Iniciando prueba del Motor Constructor...');

        // Ejecutamos el método principal
        motor.construir();

        Logger.log('✅ Prueba finalizada. Revisa tu Google Form para ver los cambios.');
    } catch (error) {
        Logger.log('❌ Error en la prueba del motor: ' + error.stack);
    }
}
/**
 * Configuración del menú superior en Google Sheets.
 * Se ejecuta automáticamente al abrir el documento.
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Actualizar 🚀')
        .addItem('Sincronizar Listas', 'ejecutarSync')
        .addToUi();

    Logger.log('✅ Menú "Actualizar 🚀" cargado correctamente.');
}

/**
 * Función puente que conecta el menú con la lógica de Desplegables.
 * Incluye manejo de errores y logs de seguimiento.
 */
function ejecutarSync() {
    const ui = SpreadsheetApp.getUi();
    Logger.log('🚀 Iniciando sincronización manual desde el menú...');

    try {
        // Intentamos ejecutar la sincronización de catálogos
        desplegables.syncAll();

        Logger.log('✅ Sincronización completada sin errores.');
        ui.alert('✅ Actualizar 🚀', 'Sincronizar Listas: Éxito.', ui.ButtonSet.OK);

    } catch (error) {
        // Log detallado del error para depuración
        Logger.log('❌ ERROR en ejecutarSync: ' + error.stack);

        // Alerta visual para el usuario
        ui.alert('❌ Error en Actualizar 🚀',
            'No se pudo sincronizar:\n' + error.message,
            ui.ButtonSet.OK);
    }
}
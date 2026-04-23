/**
 * Configuración del menú superior en Google Sheets.
 * Ahora incluye las dos herramientas.
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Actualizar 🚀')
        .addItem('1. Sincronizar Listas', 'ejecutarSync')       // Tu función de ayer
        .addItem('2. Construir Formulario', 'ejecutarMotorManual') // La nueva de hoy
        .addToUi();
}

/**
 * Función para el SEGUNDO botón (Motor Constructor de preguntas y GRIDS)
 */
function ejecutarMotorManual() {
    const ui = SpreadsheetApp.getUi();
    try {
        const motor = new MotorConstructor();
        motor.construir();
        ui.alert('✅ Motor Constructor', 'Formulario construido con éxito.', ui.ButtonSet.OK);
    } catch (e) {
        ui.alert('❌ Error en Motor', e.message, ui.ButtonSet.OK);
    }
}

/**
 * Función para el PRIMER botón (Tus Listas Desplegables)
 * Mantenemos tu lógica original intacta.
 */
function ejecutarSync() {
    const ui = SpreadsheetApp.getUi();
    try {
        // 1. INSTANCIAMOS LA CLASE AQUÍ ADENTRO (Bajo demanda)
        const desplegables = new GestorDesplegables();

        // 2. Ejecutamos tu lógica
        desplegables.syncAll();

        Logger.log('✅ Sincronización completada sin errores.');
        ui.alert('✅ Actualizar 🚀', 'Sincronizar Listas: Éxito.', ui.ButtonSet.OK);

    } catch (error) {
        Logger.log('❌ ERROR en ejecutarSync: ' + error.stack);
        ui.alert('❌ Error en Actualizar 🚀', 'No se pudo sincronizar:\n' + error.message, ui.ButtonSet.OK);
    }
}

/**
 * Clase encargada de la lógica de archivos: crear carpetas, mover y renombrar.
 */
class GestorArchivos {
    constructor() {
        this.template = config.get('ESTRUCTURA_NOMBRE_FOTO');
        this.rootFolderId = config.get('ID_CARPETA_FOTOS');
        this.catSheetName = 'CAT_DESPLEGABLES';
    }

    procesarEnvio(e) {
        // Si el activador es desde Sheets, e.response es undefined. 
        // En ese caso, obtenemos la última respuesta directamente del Formulario.
        let respuesta = e.response;

        if (!respuesta) {
            const formId = config.get('ID_FORMULARIO');
            const form = FormApp.openById(formId);
            respuesta = form.getResponses().pop();
        }

        const items = respuesta.getItemResponses();
        const timestamp = respuesta.getTimestamp();

        const mapaRespuestas = {};
        items.forEach(item => {
            mapaRespuestas[item.getItem().getTitle()] = item.getResponse();
        });

        Logger.log('🚀 Procesando archivos de la última respuesta...');

        items.forEach(item => {
            if (item.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) {
                const fileIds = item.getResponse();
                this._organizarEvidencias(fileIds, mapaRespuestas, timestamp);
            }
        });
    }

    /**
     * Gestiona la creación de carpetas por mes y el guardado de fotos.
     * @private
     */
    _organizarEvidencias(fileIds, mapaRespuestas, timestamp) {
        const rootFolder = DriveApp.getFolderById(this.rootFolderId);

        // 1. Obtener o crear la carpeta del mes (ej: "2024-04 Abril")
        const carpetaMes = this._obtenerOCrearCarpetaMes(rootFolder, timestamp);

        const nombreBase = this._construirNombre(mapaRespuestas, timestamp);

        fileIds.forEach((id, index) => {
            try {
                const archivo = DriveApp.getFileById(id);
                const extension = archivo.getName().split('.').pop();
                const nombreFinal = `${nombreBase}_${index + 1}.${extension}`;

                // Movemos a la subcarpeta del mes
                archivo.moveTo(carpetaMes);
                archivo.setName(nombreFinal);

                Logger.log(`   📸 Foto guardada en [${carpetaMes.getName()}]: ${nombreFinal}`);
            } catch (err) {
                Logger.log(`   ❌ Error con archivo ID ${id}: ${err.message}`);
            }
        });
    }

    /**
     * Busca la carpeta del mes o la crea si no existe.
     * @private
     */
    _obtenerOCrearCarpetaMes(rootFolder, timestamp) {
        const prefijoMes = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM");
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const nombreMes = meses[timestamp.getMonth()];
        const nombreCarpetaCompleto = `${prefijoMes} ${nombreMes}`;

        const carpetas = rootFolder.getFoldersByName(nombreCarpetaCompleto);

        if (carpetas.hasNext()) {
            return carpetas.next(); // Ya existe, la devolvemos
        } else {
            Logger.log(`📂 Creando nueva carpeta mensual: ${nombreCarpetaCompleto}`);
            return rootFolder.createFolder(nombreCarpetaCompleto); // No existe, la creamos
        }
    }

    _construirNombre(mapaRespuestas, timestamp) {
        let nombre = this.template;

        if (nombre.includes('[FECHA]')) {
            const fechaStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd");
            nombre = nombre.replace('[FECHA]', fechaStr);
        }
        if (nombre.includes('[HORA]')) {
            const horaStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "HH-mm");
            nombre = nombre.replace('[HORA]', horaStr);
        }

        const etiquetas = nombre.match(/\[(.*?)\]/g);
        if (etiquetas) {
            const sheetCat = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.catSheetName);
            const dataCat = sheetCat.getDataRange().getValues();

            etiquetas.forEach(tag => {
                const limpio = tag.replace('[', '').replace(']', '');
                const fila = dataCat.find(r => r[2] === limpio);

                if (fila) {
                    const preguntaTitulo = fila[0];
                    const valor = mapaRespuestas[preguntaTitulo] || 'S-D';
                    nombre = nombre.replace(tag, valor);
                }
            });
        }

        return nombre.replace(/[/\\?%*:|"<>]/g, '-');
    }
}

const gestorArchivos = new GestorArchivos();

function alRecibirRespuesta(e) {
    gestorArchivos.procesarEnvio(e);
}
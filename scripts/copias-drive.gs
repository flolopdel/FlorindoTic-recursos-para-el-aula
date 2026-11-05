// Copias de Moodle en Google Drive: recibe de GitHub los .mbz (scripts/subir-copias-drive.py) y los
// deja en una carpeta de Drive, para descargarlos desde allí al restaurarlos en Moodle.
//
// Es un proyecto aparte del de las marcas de sesión: necesita permiso sobre Drive y las marcas no.
//
// Instalación (una sola vez):
//   1. Entra en script.google.com con la cuenta cuyo Drive quieres usar → Nuevo proyecto.
//   2. Pega este archivo, guarda y ejecuta la función instalar. Autoriza los permisos.
//      En el registro de ejecución aparecen la carpeta creada y la clave: guarda la clave.
//   3. Implementar → Nueva implementación → Aplicación web.
//      Ejecutar como: yo. Quién tiene acceso: cualquier usuario.
//   4. En GitHub, Settings → Secrets and variables → Actions, crea dos secretos:
//        COPIAS_DRIVE_URL   la URL que termina en /exec
//        COPIAS_DRIVE_CLAVE la clave del paso 2
//   5. Lanza a mano el workflow «Copias de Moodle» (Actions → Run workflow) para la primera subida.
//
// Este repositorio es público: no escribas aquí la clave. La carpeta se puede mover o renombrar en
// Drive sin tocar nada. Para usar otra, cambia CARPETA en Configuración del proyecto → Propiedades del script.
//
// Si cambias este código, publícalo en Implementar → Gestionar implementaciones → Nueva versión:
// así la URL no cambia.

const NOMBRE_CARPETA = 'Copias de Moodle';
const NOMBRE_VALIDO = /^[a-z0-9-]+-moodle\.mbz$/;
const HUELLA_VALIDA = /^[0-9a-f]{64}$/;
const MAX_BYTES = 20 * 1024 * 1024;

function instalar() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CARPETA')) props.setProperty('CARPETA', DriveApp.createFolder(NOMBRE_CARPETA).getId());
  if (!props.getProperty('CLAVE')) props.setProperty('CLAVE', Utilities.getUuid());
  Logger.log('Carpeta: ' + carpeta_().getUrl());
  Logger.log('Clave (secreto COPIAS_DRIVE_CLAVE en GitHub): ' + props.getProperty('CLAVE'));
}

function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (_) {
    return json_({ ok: false, error: 'datos' });
  }
  if (!d || typeof d !== 'object') return json_({ ok: false, error: 'datos' });
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave || d.clave !== clave) return json_({ ok: false, error: 'clave' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (d.accion === 'lista') return json_({ ok: true, archivos: lista_() });
    if (d.accion === 'subir') return subir_(d);
    if (d.accion === 'limpiar') return limpiar_(d);
    return json_({ ok: false, error: 'datos' });
  } finally {
    lock.releaseLock();
  }
}

// nombre del archivo → huella guardada en su descripción
function lista_() {
  const archivos = {};
  const it = carpeta_().getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (NOMBRE_VALIDO.test(f.getName())) archivos[f.getName()] = f.getDescription() || '';
  }
  return archivos;
}

// Crea la copia nueva antes de enviar la anterior a la papelera: si algo falla, no se pierde.
function subir_(d) {
  if (!NOMBRE_VALIDO.test(String(d.nombre)) || !HUELLA_VALIDA.test(String(d.huella)) || typeof d.contenido !== 'string') {
    return json_({ ok: false, error: 'datos' });
  }
  const bytes = Utilities.base64Decode(d.contenido);
  if (!bytes.length || bytes.length > MAX_BYTES) return json_({ ok: false, error: 'tamano' });

  const carpeta = carpeta_();
  const anteriores = [];
  const it = carpeta.getFilesByName(d.nombre);
  while (it.hasNext()) anteriores.push(it.next());
  const nuevo = carpeta.createFile(Utilities.newBlob(bytes, 'application/octet-stream', d.nombre));
  nuevo.setDescription(d.huella);
  anteriores.forEach((f) => f.setTrashed(true));
  return json_({ ok: true });
}

// Envía a la papelera las copias de SdA que ya no existen. Solo toca archivos *-moodle.mbz de la carpeta.
function limpiar_(d) {
  // Una lista vacía sería un fallo de quien llama: no debe vaciar la carpeta.
  if (!Array.isArray(d.nombres) || !d.nombres.length) return json_({ ok: false, error: 'datos' });
  const quitados = [];
  const it = carpeta_().getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (NOMBRE_VALIDO.test(f.getName()) && !d.nombres.includes(f.getName())) {
      f.setTrashed(true);
      quitados.push(f.getName());
    }
  }
  return json_({ ok: true, quitados });
}

function carpeta_() {
  return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('CARPETA'));
}

function json_(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}

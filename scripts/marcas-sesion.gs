// Marcas de sesión: guarda en una hoja de Google por qué sesión va cada grupo.
// Las guías del profesorado las leen y escriben con js/marcas-sesion.js.
// Instalación (una sola vez):
//   1. Crea una hoja de cálculo de Google y abre Extensiones → Apps Script.
//   2. Pega este archivo, guarda y ejecuta la función instalar. Autoriza los permisos.
//      En el registro de ejecución aparece la clave para editar: guárdala.
//   3. Implementar → Nueva implementación → Aplicación web.
//      Ejecutar como: yo. Quién tiene acceso: cualquier usuario.
//   4. Copia la URL que termina en /exec y ponla en ENDPOINT, en js/marcas-sesion.js.
//
// Clave fácil de recordar (opcional): en Configuración del proyecto → Propiedades del script,
// añade CLAVE_FACIL con la que quieras. Sirve igual que la clave larga, pero tras 5 intentos
// fallidos se bloquea 15 minutos; la larga sigue funcionando. Este repositorio es público:
// no escribas aquí ninguna de las dos.
//
// Si cambias este código, publícalo en Implementar → Gestionar implementaciones → Nueva versión:
// así la URL no cambia.

const HOJA = 'Marcas';
const CABECERA = ['Guía', 'Sesión', 'Grupo', 'Actualizado'];
const MAX_FALLOS = 5;
const BLOQUEO_SEGUNDOS = 900;

function instalar() {
  hoja_();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CLAVE')) props.setProperty('CLAVE', Utilities.getUuid());
  Logger.log('Clave para editar las marcas: ' + props.getProperty('CLAVE'));
}

function doGet(e) {
  return json_({ ok: true, marcas: leer_(String(e.parameter.guia || '')) });
}

function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (_) {
    return json_({ ok: false, error: 'datos' });
  }
  if (!d || typeof d !== 'object') return json_({ ok: false, error: 'datos' });

  const guia = String(d.guia || '');
  // Sin el arranque =, +, - o @ la hoja nunca lo interpreta como una fórmula.
  const nota = String(d.nota || '').replace(/^[=+\-@\s]+/, '').trim().slice(0, 40);
  const sesion = Number(d.sesion);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const rechazo = rechazoClave_(d.clave);
    if (rechazo) return json_({ ok: false, error: rechazo });
    if (!/^[a-z0-9\/-]{1,150}$/.test(guia) || !nota) return json_({ ok: false, error: 'datos' });
    if (d.accion === 'poner' && (!Number.isInteger(sesion) || sesion < 0 || sesion > 999)) return json_({ ok: false, error: 'datos' });

    // Un grupo solo está en una sesión de cada guía: si ya existe, se mueve.
    quitar_(guia, nota);
    if (d.accion === 'poner') hoja_().appendRow([guia, sesion, nota, new Date().toISOString().slice(0, 10)]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, marcas: leer_(guia) });
}

// Devuelve el motivo del rechazo, o null si la clave vale. Como CLAVE_FACIL es fácil de adivinar,
// se limitan los intentos; la clave larga sigue entrando durante un bloqueo.
function rechazoClave_(clave) {
  const props = PropertiesService.getScriptProperties();
  const larga = props.getProperty('CLAVE');
  const facil = props.getProperty('CLAVE_FACIL');
  if (larga && clave === larga) return null;

  const cache = CacheService.getScriptCache();
  const fallos = Number(cache.get('fallos')) || 0;
  if (fallos >= MAX_FALLOS) return 'bloqueado';
  if (facil && clave === facil) {
    cache.remove('fallos');
    return null;
  }
  cache.put('fallos', String(fallos + 1), BLOQUEO_SEGUNDOS);
  return 'clave';
}

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(CABECERA);
    hoja.setFrozenRows(1);
    hoja.getRange('A:D').setNumberFormat('@'); // texto: «3/4» no se convierte en una fecha
  }
  return hoja;
}

function filas_() {
  return hoja_().getDataRange().getDisplayValues().slice(1);
}

function leer_(guia) {
  return filas_()
    .filter((f) => f[0] === guia)
    .map((f) => ({ sesion: Number(f[1]), nota: f[2], fecha: f[3] }));
}

function quitar_(guia, nota) {
  const hoja = hoja_();
  const filas = filas_();
  for (let i = filas.length - 1; i >= 0; i--) {
    if (filas[i][0] === guia && filas[i][2].toLowerCase() === nota.toLowerCase()) hoja.deleteRow(i + 2);
  }
}

function json_(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}

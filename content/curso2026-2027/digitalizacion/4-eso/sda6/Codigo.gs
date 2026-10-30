/**
 * SdA 6 · Gestión de Datos y Hoja de Cálculo Cooperativa · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «DIG4_SDA6.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       DIG4_SDA6_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   DIG4_SDA6_crearF1_SdA6EncuestaInicial()  →  SdA 6 · Encuesta inicial: hojas de cálculo (sesión 1, anónimo)
 *   DIG4_SDA6_crearF2_SdA6ValidacionCruzada()  →  SdA 6 · Validación cruzada entre parejas (sesión 8)
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 6 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 6 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var DIG4_SDA6 = (function () {
var SDA = "SdA 6";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_SdA6EncuestaInicial() { return crearFormulario_("F1"); }
function crearF2_SdA6ValidacionCruzada() { return crearFormulario_("F2"); }

function crearFormulario_(id) {
  var f = FORMULARIOS.filter(function (x) { return x.id === id; })[0];
  var form = FormApp.create(SDA + ' · ' + f.titulo);
  form.setDescription(f.descripcion || '');
  form.setCollectEmail(!f.anonimo);
  try { form.setRequireLogin(true); } catch (e) { /* cuenta personal: no se puede limitar al centro */ }
  try { if (form.setPublished) form.setPublished(true); } catch (e) { /* versiones sin estado de publicación */ }
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(!!f.repetible);
  if (f.confirmacion) form.setConfirmationMessage(f.confirmacion);
  f.preguntas.forEach(function (q) {
    var it;
    switch (q.tipo) {
      case 'opcion':      it = form.addMultipleChoiceItem().setChoiceValues(q.opciones); if (q.otra) it.showOtherOption(true); break;
      case 'casillas':    it = form.addCheckboxItem().setChoiceValues(q.opciones); if (q.otra) it.showOtherOption(true); break;
      case 'desplegable': it = form.addListItem().setChoiceValues(q.opciones); break;
      case 'escala':      it = form.addScaleItem().setBounds(q.min === undefined ? 1 : q.min, q.max || 5);
                          if (q.etiquetas) it.setLabels(q.etiquetas[0] || '', q.etiquetas[1] || ''); break;
      case 'texto':       it = form.addTextItem(); break;
      case 'parrafo':     it = form.addParagraphTextItem(); break;
      case 'cuadricula':  it = form.addGridItem().setRows(q.filas).setColumns(q.columnas); break;
      case 'seccion':     it = form.addPageBreakItem(); break;
      case 'info':        it = form.addSectionHeaderItem(); break;
      default: throw new Error('Tipo de pregunta desconocido: ' + q.tipo);
    }
    it.setTitle(q.titulo);
    if (q.ayuda) it.setHelpText(q.ayuda);
    var obligatoria = q.obligatoria === undefined ? !!f.obligatorias : !!q.obligatoria;
    if (it.setRequired) it.setRequired(obligatoria);
  });
  try { DriveApp.getFileById(form.getId()).moveTo(carpeta_()); } catch (e) { /* se queda en Mi unidad */ }
  var url = form.getPublishedUrl();
  try { url = form.shortenFormUrl(url); } catch (e) {}
  try { registrarEnlace_(f, url, form.getEditUrl()); } catch (e) { Logger.log('No se pudo apuntar el enlace: ' + e); }
  Logger.log('✔ ' + f.id + ' «' + f.titulo + '» (' + f.sesiones + ')');
  Logger.log('    Alumnado: ' + url);
  Logger.log('    Editar y ver respuestas: ' + form.getEditUrl());
  return form;
}

var CARPETA_SDA = "1_asR6hE570T1YjTRWF3omhYPMhNLa5tw";  // carpeta de la SdA en tu Drive

function carpeta_() {
  var nombre = SDA + ' · Formularios';
  var raiz;
  try { raiz = DriveApp.getFolderById(CARPETA_SDA); } catch (e) { raiz = DriveApp.getRootFolder(); }
  var it = raiz.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : raiz.createFolder(nombre);
}

// Apunta el enlace en la hoja «SdA N · Enlaces de formularios» (Claude la lee para enlazarlos en la web de clase).
function registrarEnlace_(f, url, edicion) {
  var raiz;
  try { raiz = DriveApp.getFolderById(CARPETA_SDA); } catch (e) { raiz = DriveApp.getRootFolder(); }
  var nombre = SDA + ' · Enlaces de formularios';
  var it = raiz.getFilesByName(nombre), ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create(nombre);
    DriveApp.getFileById(ss.getId()).moveTo(raiz);
    ss.getSheets()[0].appendRow(['id', 'titulo', 'alumnado', 'edicion', 'fecha']);
  }
  var h = ss.getSheets()[0], datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (datos[i][0] === f.id) { h.deleteRow(i + 1); break; }
  h.appendRow([f.id, f.titulo, url, edicion, new Date()]);
}

// ----------------------------------------------------------------- formularios (puedes editar los textos)
var FORMULARIOS = [
  {
    "id": "F1",
    "titulo": "SdA 6 · Encuesta inicial: hojas de cálculo",
    "anonimo": true,
    "obligatorias": true,
    "descripcion": "Es anónima. Sirve para saber qué sabéis ya de hojas de cálculo y preparar los retos. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Veremos el resumen de la clase en pantalla.",
    "preguntas": [
      {
        "tipo": "casillas",
        "titulo": "¿Qué hojas de cálculo has usado alguna vez?",
        "opciones": [
          "Google Sheets (Hojas de cálculo de Google)",
          "Microsoft Excel",
          "LibreOffice Calc",
          "Numbers (Apple)",
          "Ninguna"
        ]
      },
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué sabes hacer en una hoja de cálculo?",
        "filas": [
          "Escribir datos y cambiar el ancho de las columnas",
          "Poner formato de moneda o porcentaje",
          "Hacer una suma con una fórmula",
          "Usar funciones como SUMA o PROMEDIO",
          "Hacer un gráfico",
          "Trabajar a la vez con otra persona en la misma hoja"
        ],
        "columnas": [
          "Sé hacerlo",
          "Más o menos",
          "No sé"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te apetece aprender a hacer hojas de cálculo?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "Si tuvieras que elegir hoy, ¿qué proyecto te gustaría hacer?",
        "opciones": [
          "🎒 Presupuesto del viaje de fin de curso",
          "📚 Control de mis hábitos de estudio",
          "🧮 Calculadora de mis notas",
          "Todavía no lo sé"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué te gustaría calcular o controlar con una hoja de cálculo?",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "SdA 6 · Validación cruzada entre parejas",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Rellenadlo después de probar la hoja de la otra pareja con el guion de 5 pasos de la web de clase. Responde una persona por pareja revisora.",
    "confirmacion": "¡Gracias! La otra pareja verá vuestros comentarios en su hoja. Recordad dejar al menos 3 comentarios con @.",
    "preguntas": [
      {
        "tipo": "texto",
        "titulo": "Nombres de vuestra pareja (revisora)"
      },
      {
        "tipo": "texto",
        "titulo": "Nombres de la pareja cuya hoja habéis revisado"
      },
      {
        "tipo": "cuadricula",
        "titulo": "Comprobaciones",
        "filas": [
          "La nota de uso explica qué hay que hacer",
          "Al añadir datos nuevos, los totales cambian solos",
          "Al añadir datos nuevos, los gráficos se actualizan",
          "La hoja impide escribir un texto donde va un número",
          "Las pestañas de cálculos y panel están protegidas",
          "Hay al menos una alerta de color que funciona",
          "Los gráficos tienen título y el eje empieza en 0"
        ],
        "columnas": [
          "Sí",
          "En parte",
          "No"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Usaríais esta hoja de verdad?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "No",
          "Sí, seguro"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Lo mejor de su hoja"
      },
      {
        "tipo": "parrafo",
        "titulo": "El fallo más importante que habéis encontrado y cómo lo arreglaríais",
        "ayuda": "Usad el modelo: «Al escribir… pasa… Podríais…»"
      }
    ],
    "sesiones": "Sesión 8"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_SdA6EncuestaInicial: crearF1_SdA6EncuestaInicial,
    crearF2_SdA6ValidacionCruzada: crearF2_SdA6ValidacionCruzada
  };
})();

function DIG4_SDA6_crearTodosLosFormularios() { return DIG4_SDA6.crearTodosLosFormularios(); }
function DIG4_SDA6_crearF1_SdA6EncuestaInicial() { return DIG4_SDA6.crearF1_SdA6EncuestaInicial(); }
function DIG4_SDA6_crearF2_SdA6ValidacionCruzada() { return DIG4_SDA6.crearF2_SdA6ValidacionCruzada(); }

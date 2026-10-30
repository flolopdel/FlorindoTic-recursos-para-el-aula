/**
 * SdA 9 · IA, Big Data, e-Administración y Comercio Electrónico · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «DIG4_SDA9.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       DIG4_SDA9_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   DIG4_SDA9_crearF1_SdA9EncuestaInicial()  →  SdA 9 · Encuesta inicial (anónima) (sesión 1, anónimo)
 *        ya creado: https://forms.gle/ygAGuZJALDraY4PK6
 *   DIG4_SDA9_crearF2_SdA9AutoevaluacionFinal()  →  SdA 9 · Autoevaluación final (sesión 9)
 *        ya creado: https://forms.gle/gCsxbHvSH8Lepmtt7
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 9 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 9 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var DIG4_SDA9 = (function () {
var SDA = "SdA 9";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_SdA9EncuestaInicial() { return crearFormulario_("F1"); }
function crearF2_SdA9AutoevaluacionFinal() { return crearFormulario_("F2"); }

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

var CARPETA_SDA = "1Zx9QhKqg9UWvAtWOMw3hh1T4mWib-4Aa";  // carpeta de la SdA en tu Drive

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
    "titulo": "SdA 9 · Encuesta inicial (anónima)",
    "anonimo": true,
    "obligatorias": false,
    "descripcion": "Encuesta anónima para saber qué sabe y qué hace la clase con la IA, las compras en línea y los trámites. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Veremos los resultados de toda la clase juntos.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Con qué frecuencia usas una IA tipo chatbot (Gemini, ChatGPT, Claude, Meta AI…)?",
        "opciones": [
          "Nunca",
          "Alguna vez al mes",
          "Alguna vez a la semana",
          "Casi todos los días"
        ],
        "obligatoria": true
      },
      {
        "tipo": "casillas",
        "titulo": "¿Para qué la usas?",
        "opciones": [
          "Deberes y estudiar",
          "Buscar información",
          "Crear imágenes o vídeos",
          "Hablar o pedir consejo",
          "No la uso"
        ],
        "otra": true
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te fías de lo que te dice una IA?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has comprado algo por internet tú mismo/a?",
        "opciones": [
          "Sí, varias veces",
          "Sí, alguna vez",
          "No, pero me ayudan",
          "Nunca"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Cómo has pagado alguna vez en internet?",
        "opciones": [
          "Tarjeta",
          "Bizum",
          "PayPal",
          "Tarjeta regalo o recarga",
          "Contra reembolso",
          "No he pagado nunca"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has hecho o ayudado a hacer algún trámite en internet (cita médica, beca, DGT…)?",
        "opciones": [
          "Sí, yo solo/a",
          "Sí, ayudando a mi familia",
          "No"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Cuáles de estas cosas te suenan?",
        "opciones": [
          "Big Data",
          "Cl@ve",
          "Certificado digital",
          "DNI electrónico",
          "Criptomonedas",
          "Sesgo algorítmico"
        ]
      }
    ],
    "enlace": "https://forms.gle/ygAGuZJALDraY4PK6",
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "SdA 9 · Autoevaluación final",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Valora con sinceridad lo que has aprendido y cómo ha funcionado tu pareja. Recoge tu correo del centro para que el docente lo tenga en cuenta.",
    "confirmacion": "¡Gracias! Tu autoevaluación ayuda a mejorar la próxima SdA.",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué he logrado?",
        "filas": [
          "Escribir prompts completos (RCTF) y comprobar lo que dice la IA",
          "Detectar sesgos en las respuestas de la IA",
          "Explicar qué es la brecha digital",
          "Saber cómo identificarme ante la Administración (DNIe, certificado, Cl@ve)",
          "Reconocer una tienda en línea fiable y un pago seguro",
          "Crear una web con IA y mejorarla con mis cambios"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo ha funcionado mi pareja (roles de piloto y copiloto)?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Mal",
          "Muy bien"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "Después de esta SdA, ¿cuánto te fías de lo que te dice una IA?",
        "opciones": [
          "Más que antes",
          "Igual",
          "Menos que antes: ahora compruebo"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Una cosa que haré diferente en internet a partir de ahora",
        "obligatoria": false
      }
    ],
    "enlace": "https://forms.gle/gCsxbHvSH8Lepmtt7",
    "sesiones": "Sesión 9"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_SdA9EncuestaInicial: crearF1_SdA9EncuestaInicial,
    crearF2_SdA9AutoevaluacionFinal: crearF2_SdA9AutoevaluacionFinal
  };
})();

function DIG4_SDA9_crearTodosLosFormularios() { return DIG4_SDA9.crearTodosLosFormularios(); }
function DIG4_SDA9_crearF1_SdA9EncuestaInicial() { return DIG4_SDA9.crearF1_SdA9EncuestaInicial(); }
function DIG4_SDA9_crearF2_SdA9AutoevaluacionFinal() { return DIG4_SDA9.crearF2_SdA9AutoevaluacionFinal(); }

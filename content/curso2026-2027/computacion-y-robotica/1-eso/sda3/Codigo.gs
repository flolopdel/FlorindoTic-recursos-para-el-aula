/**
 * SdA 3 · Nuestra placa robótica se comunica con el mundo · 1.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Borra el contenido de Código.gs, pega este archivo completo y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   crearF1_AntesDeEmpezarQue()  →  Antes de empezar: ¿qué sabemos de los robots? (sesión 1, anónimo)
 *        ya creado: https://forms.gle/zU2bcyTVVHrQgeoJ8
 *   crearF2_AutoevaluacionQueHasConseguido()  →  Autoevaluación: ¿qué has conseguido? (sesión 9)
 *        ya creado: https://forms.gle/TT64EkjcGhPakDzU7
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 3 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 3 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var SDA = "SdA 3";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_AntesDeEmpezarQue() { return crearFormulario_("F1"); }
function crearF2_AutoevaluacionQueHasConseguido() { return crearFormulario_("F2"); }

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

var CARPETA_SDA = "14u_qQvJhlq9UfcQ-awdMVvkT3xC5qzrz";  // carpeta de la SdA en tu Drive

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
    "titulo": "Antes de empezar: ¿qué sabemos de los robots?",
    "anonimo": true,
    "descripcion": "Formulario anónimo para saber de dónde partimos. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Veremos las respuestas de toda la clase en la pantalla.",
    "preguntas": [
      {
        "tipo": "parrafo",
        "titulo": "¿Qué crees que es un robot?",
        "obligatoria": true
      },
      {
        "tipo": "texto",
        "titulo": "¿Cuál sería el primer mensaje que te gustaría que dijera tu robot al despertar?"
      },
      {
        "tipo": "opcion",
        "titulo": "¿Crees que los robots pueden «sentir»?",
        "opciones": [
          "Sí, como las personas",
          "Sí, con sensores, pero no como las personas",
          "No",
          "No lo sé"
        ],
        "obligatoria": true
      },
      {
        "tipo": "casillas",
        "titulo": "¿Con qué has programado alguna vez?",
        "opciones": [
          "Scratch",
          "MakeCode",
          "Python",
          "App Inventor",
          "Nunca he programado"
        ],
        "otra": true
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto crees que te servirá en el futuro entender cómo funcionan los robots?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Conoces algún robot que mejore la vida de las personas? ¿Cuál?"
      },
      {
        "tipo": "opcion",
        "titulo": "¿Te imaginas inventando una máquina que todavía no existe?",
        "opciones": [
          "Sí, ya tengo una idea",
          "Puede ser",
          "No"
        ]
      }
    ],
    "enlace": "https://forms.gle/zU2bcyTVVHrQgeoJ8",
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "Autoevaluación: ¿qué has conseguido?",
    "anonimo": false,
    "descripcion": "Autoevaluación final, basada en la rúbrica del REA de José Pujol Pérez (CC BY-SA). Sé sincero o sincera.",
    "confirmacion": "¡Gracias! Guarda tu insignia de Mega-Estratega: te la has ganado.",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "Lo que he hecho",
        "filas": [
          "He identificado los componentes de la placa",
          "Sé clasificar los componentes en entradas, procesamiento y salidas",
          "He programado un ¡Hola, Mundo! en mi placa",
          "He hecho un programa interactivo",
          "He hecho un programa que comprueba que la placa funciona",
          "He preparado la presentación",
          "He presentado el proyecto"
        ],
        "columnas": [
          "De forma autónoma",
          "Con algo de ayuda",
          "Con mucha ayuda",
          "No he podido"
        ],
        "obligatoria": true
      },
      {
        "tipo": "cuadricula",
        "titulo": "Lo que sé explicar",
        "filas": [
          "La importancia de los microcontroladores hoy",
          "Qué son y cómo funcionan los microcontroladores",
          "Las ventajas de las tecnologías abiertas",
          "Las partes del entorno de programación",
          "Para qué sirve el ¡Hola, Mundo!",
          "Qué es un robot y cómo se relaciona con su entorno"
        ],
        "columnas": [
          "Sabría explicarlo",
          "Con ayuda",
          "Lo entiendo, no sé explicarlo",
          "No lo he entendido"
        ],
        "obligatoria": true
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué ha sido lo más difícil, cómo lo has resuelto y qué mejorarías de tu programa?"
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te ha gustado esta situación de aprendizaje?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Muchísimo"
        ]
      }
    ],
    "enlace": "https://forms.gle/TT64EkjcGhPakDzU7",
    "sesiones": "Sesión 9"
  }
];

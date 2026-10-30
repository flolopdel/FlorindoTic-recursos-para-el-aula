/**
 * SdA 4 · Arquitectura, Sistemas Operativos y Elección Consciente · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «DIG4_SDA4.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       DIG4_SDA4_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   DIG4_SDA4_crearF1_SdA4EncuestaInicial()  →  SdA 4 · Encuesta inicial: mis dispositivos (anónima) (sesión 1, anónimo)
 *        ya creado: https://forms.gle/XncaqS4XMdakZ28y7
 *   DIG4_SDA4_crearF2_SdA4AutoevaluacionDel()  →  SdA 4 · Autoevaluación del estudio de mercado (sesión 9)
 *        ya creado: https://forms.gle/EeqPnQY5kWMkPbmv6
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 4 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 4 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var DIG4_SDA4 = (function () {
var SDA = "SdA 4";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_SdA4EncuestaInicial() { return crearFormulario_("F1"); }
function crearF2_SdA4AutoevaluacionDel() { return crearFormulario_("F2"); }

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

var CARPETA_SDA = "1Fj3ObPKP6KwIT2Xels6gqUhapCfb0wV4";  // carpeta de la SdA en tu Drive

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
    "titulo": "SdA 4 · Encuesta inicial: mis dispositivos (anónima)",
    "anonimo": true,
    "obligatorias": false,
    "descripcion": "Encuesta anónima para saber cómo usamos y cambiamos nuestros dispositivos. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Ahora veremos los resultados de toda la clase en la pantalla.",
    "preguntas": [
      {
        "tipo": "casillas",
        "titulo": "¿Qué dispositivos tienes para ti?",
        "opciones": [
          "Smartphone",
          "Ordenador portátil",
          "Ordenador de sobremesa",
          "Tableta",
          "Smartwatch o pulsera",
          "Consola",
          "Ninguno"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Cuántos años tiene tu móvil actual?",
        "opciones": [
          "Menos de 1 año",
          "1-2 años",
          "2-3 años",
          "Más de 3 años",
          "No tengo móvil"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Por qué cambiaste tu último móvil?",
        "opciones": [
          "Se rompió (pantalla, caída, agua)",
          "La batería no aguantaba",
          "Iba lento o la memoria estaba llena",
          "Dejó de actualizarse o algunas apps no funcionaban",
          "Quería uno mejor o más moderno",
          "Me lo regalaron",
          "Es mi primer móvil"
        ],
        "otra": true
      },
      {
        "tipo": "opcion",
        "titulo": "¿Qué pasó con tu móvil anterior?",
        "opciones": [
          "Está en un cajón",
          "Lo usa otra persona de mi familia",
          "Lo vendí o lo di",
          "Lo llevé a reciclar (tienda o punto limpio)",
          "Lo tiré a la basura",
          "No lo sé"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "Cuando eliges un móvil, ¿qué miras? (máximo 3)",
        "opciones": [
          "Precio",
          "Marca",
          "Cámara",
          "Batería",
          "Memoria (GB)",
          "Diseño o color",
          "Lo que tienen mis amigos",
          "Opiniones en TikTok o YouTube",
          "Que se pueda reparar"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto crees que sabes de lo que hay dentro de un ordenador o un móvil?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      }
    ],
    "enlace": "https://forms.gle/XncaqS4XMdakZ28y7",
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "SdA 4 · Autoevaluación del estudio de mercado",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Valora tu informe de la Tarea 4.3 con las líneas de la rúbrica. Sé sincero/a: sirve para mejorar, no para la nota.",
    "confirmacion": "¡Gracias! Compararemos tu autoevaluación con la valoración del docente.",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Cómo ha quedado mi informe?",
        "filas": [
          "Tabla comparativa con tres modelos y enlaces",
          "El modelo cumple las necesidades y el presupuesto",
          "Sistema operativo y años de actualizaciones",
          "Análisis del ciclo de vida (criterios verdes)",
          "Recomendación con datos, punto débil y accesibilidad"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Qué parte te ha costado más?",
        "opciones": [
          "Entender las especificaciones técnicas",
          "Buscar los modelos y los datos",
          "Analizar la sostenibilidad",
          "Escribir la recomendación"
        ],
        "otra": true
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué has aprendido sobre tu propio móvil u ordenador?"
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto crees que sabes ahora de lo que hay dentro de un ordenador o un móvil?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      }
    ],
    "enlace": "https://forms.gle/EeqPnQY5kWMkPbmv6",
    "sesiones": "Sesión 9"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_SdA4EncuestaInicial: crearF1_SdA4EncuestaInicial,
    crearF2_SdA4AutoevaluacionDel: crearF2_SdA4AutoevaluacionDel
  };
})();

function DIG4_SDA4_crearTodosLosFormularios() { return DIG4_SDA4.crearTodosLosFormularios(); }
function DIG4_SDA4_crearF1_SdA4EncuestaInicial() { return DIG4_SDA4.crearF1_SdA4EncuestaInicial(); }
function DIG4_SDA4_crearF2_SdA4AutoevaluacionDel() { return DIG4_SDA4.crearF2_SdA4AutoevaluacionDel(); }

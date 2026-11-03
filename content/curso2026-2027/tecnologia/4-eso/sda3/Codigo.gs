/**
 * SdA 3 · Electrónica analógica · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «TEC4_SDA3.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       TEC4_SDA3_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   TEC4_SDA3_crearF1_DiagnosticoInicialQueSe()  →  Diagnóstico inicial: ¿qué sé de electrónica? (sesión 1, anónimo)
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 3 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 3 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var TEC4_SDA3 = (function () {
var SDA = "SdA 3";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_DiagnosticoInicialQueSe() { return crearFormulario_("F1"); }

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

var CARPETA_SDA = "1IIjAsi5anvzLaMycOMSSXPgqYkxVt25d";  // carpeta de la SdA en tu Drive

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
    "titulo": "Diagnóstico inicial: ¿qué sé de electrónica?",
    "anonimo": true,
    "obligatorias": true,
    "descripcion": "Cuestionario anónimo para saber qué conoces de electrónica antes de empezar. No cuenta para nota.",
    "confirmacion": "¡Gracias! Veremos los resultados de la clase juntos.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Qué es un LED?",
        "opciones": [
          "Un tipo de bombilla de filamento",
          "Un diodo que emite luz",
          "Una resistencia que brilla",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Para qué sirve una resistencia en un circuito con un LED?",
        "opciones": [
          "Para que brille más",
          "Para limitar la corriente y que no se queme",
          "Para guardar energía",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Un diodo deja pasar la corriente en los dos sentidos?",
        "opciones": [
          "Sí",
          "No, solo en un sentido",
          "Depende del color",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Cuál de estos materiales es un semiconductor?",
        "opciones": [
          "Cobre",
          "Plástico",
          "Silicio",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has usado alguna vez una protoboard (placa de prototipos)?",
        "opciones": [
          "Sí, varias veces",
          "Una vez",
          "Nunca",
          "No sé qué es"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has usado Tinkercad Circuits?",
        "opciones": [
          "Sí",
          "Solo Tinkercad 3D",
          "No"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te interesa construir una maqueta de ciudad inteligente?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Nombra un aparato de tu casa que creas que tiene electrónica y di qué hace.",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 1"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_DiagnosticoInicialQueSe: crearF1_DiagnosticoInicialQueSe
  };
})();

function TEC4_SDA3_crearTodosLosFormularios() { return TEC4_SDA3.crearTodosLosFormularios(); }
function TEC4_SDA3_crearF1_DiagnosticoInicialQueSe() { return TEC4_SDA3.crearF1_DiagnosticoInicialQueSe(); }

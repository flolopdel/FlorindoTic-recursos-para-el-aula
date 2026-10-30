/**
 * SdA 8 · Ciberseguridad, redes domésticas y prevención de riesgos · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «DIG4_SDA8.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       DIG4_SDA8_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   DIG4_SDA8_crearF1_SdA8EncuestaInicial()  →  SdA 8 · Encuesta inicial: ¿cómo me conecto? (sesión 1, anónimo)
 *   DIG4_SDA8_crearF2_SdA8CoevaluacionDel()  →  SdA 8 · Coevaluación del estreno de los vídeos (sesión 9, anónimo)
 *   DIG4_SDA8_crearF3_SdA8AutoevaluacionFinal()  →  SdA 8 · Autoevaluación final (sesión 9)
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 8 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 8 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var DIG4_SDA8 = (function () {
var SDA = "SdA 8";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_SdA8EncuestaInicial() { return crearFormulario_("F1"); }
function crearF2_SdA8CoevaluacionDel() { return crearFormulario_("F2"); }
function crearF3_SdA8AutoevaluacionFinal() { return crearFormulario_("F3"); }

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

var CARPETA_SDA = "19CvX8F-PqfgPQiiuwUTa8G2FCFTUn_J5";  // carpeta de la SdA en tu Drive

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
    "titulo": "SdA 8 · Encuesta inicial: ¿cómo me conecto?",
    "anonimo": true,
    "obligatorias": false,
    "descripcion": "Encuesta anónima para preparar la SdA de ciberseguridad. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Veremos los resultados de la clase en conjunto, nunca respuestas de nadie en concreto.",
    "preguntas": [
      {
        "tipo": "casillas",
        "titulo": "¿Cómo te conectas a Internet en casa?",
        "opciones": [
          "Wi-Fi de casa",
          "Cable",
          "Datos del móvil",
          "No tengo Internet en casa"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Qué redes sociales usas?",
        "opciones": [
          "TikTok",
          "Instagram",
          "WhatsApp",
          "YouTube",
          "Snapchat",
          "Discord",
          "Ninguna"
        ],
        "otra": true
      },
      {
        "tipo": "opcion",
        "titulo": "¿Cuántas horas al día usas las redes sociales?",
        "opciones": [
          "Menos de 1",
          "Entre 1 y 3",
          "Entre 3 y 5",
          "Más de 5"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Tu cuenta principal es privada?",
        "opciones": [
          "Sí",
          "No",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has recibido alguna vez un mensaje sospechoso (premio, paquete, código, enlace raro)?",
        "opciones": [
          "Sí",
          "No",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Sabes qué es un router?",
        "opciones": [
          "Sí, y sabría explicarlo",
          "Más o menos",
          "No"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto crees que sabes de protegerte en Internet?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué te gustaría aprender sobre seguridad en Internet?"
      }
    ],
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "SdA 8 · Coevaluación del estreno de los vídeos",
    "anonimo": true,
    "repetible": true,
    "obligatorias": true,
    "descripcion": "Valora cada vídeo después de verlo. Envía una respuesta por vídeo. Sé respetuoso/a: valora el vídeo, no a las personas.",
    "confirmacion": "Valoración enviada. Pulsa «Enviar otra respuesta» para valorar el siguiente vídeo.",
    "preguntas": [
      {
        "tipo": "desplegable",
        "titulo": "¿Qué vídeo valoras?",
        "ayuda": "El docente cambiará estas opciones por los títulos o números de los vídeos.",
        "opciones": [
          "Vídeo 1",
          "Vídeo 2",
          "Vídeo 3",
          "Vídeo 4",
          "Vídeo 5",
          "Vídeo 6",
          "Vídeo 7",
          "Vídeo 8",
          "Vídeo 9",
          "Vídeo 10",
          "Vídeo 11"
        ]
      },
      {
        "tipo": "cuadricula",
        "titulo": "Valora el vídeo",
        "filas": [
          "Se entiende cómo funciona Internet",
          "Explica bien los dos riesgos",
          "Los consejos son útiles",
          "No aparecen datos personales",
          "Engancha y se ve bien"
        ],
        "columnas": [
          "Sí",
          "En parte",
          "No"
        ]
      },
      {
        "tipo": "texto",
        "titulo": "Lo mejor del vídeo",
        "obligatoria": false
      },
      {
        "tipo": "texto",
        "titulo": "Una mejora",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 9"
  },
  {
    "id": "F3",
    "titulo": "SdA 8 · Autoevaluación final",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Reflexiona sobre lo que has aprendido en la SdA 8. Se recoge tu correo del centro para que el docente pueda leer tu reflexión.",
    "confirmacion": "¡Gracias por tu reflexión!",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué he logrado?",
        "filas": [
          "Montar una red doméstica en Packet Tracer",
          "Explicar qué hacen el router, la IP y el DNS",
          "Proteger un Wi-Fi y un router",
          "Reconocer un fraude o un bulo",
          "Saber qué hacer y a quién pedir ayuda ante un riesgo"
        ],
        "columnas": [
          "Lo he hecho de manera autónoma",
          "Lo he hecho con ayuda",
          "He necesitado una guía continua",
          "Todavía no lo he logrado"
        ],
        "ayuda": "Niveles tomados de la rúbrica final del REA «¿Controlas las redes? No dejes que te controlen» (CC BY-NC-SA 4.0) (autoría: José Pujol Pérez)."
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué riesgo te ha sorprendido más y por qué?"
      },
      {
        "tipo": "casillas",
        "titulo": "¿Qué has cambiado en tu privacidad durante esta SdA?",
        "opciones": [
          "He puesto mi cuenta en privado",
          "He activado la verificación en dos pasos",
          "He desactivado la ubicación",
          "He limitado quién me escribe",
          "He cambiado alguna contraseña",
          "Nada todavía"
        ],
        "otra": true
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo ha funcionado tu pareja?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Mal",
          "Muy bien"
        ]
      },
      {
        "tipo": "texto",
        "titulo": "Lo que más me ha gustado de la SdA",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 9"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_SdA8EncuestaInicial: crearF1_SdA8EncuestaInicial,
    crearF2_SdA8CoevaluacionDel: crearF2_SdA8CoevaluacionDel,
    crearF3_SdA8AutoevaluacionFinal: crearF3_SdA8AutoevaluacionFinal
  };
})();

function DIG4_SDA8_crearTodosLosFormularios() { return DIG4_SDA8.crearTodosLosFormularios(); }
function DIG4_SDA8_crearF1_SdA8EncuestaInicial() { return DIG4_SDA8.crearF1_SdA8EncuestaInicial(); }
function DIG4_SDA8_crearF2_SdA8CoevaluacionDel() { return DIG4_SDA8.crearF2_SdA8CoevaluacionDel(); }
function DIG4_SDA8_crearF3_SdA8AutoevaluacionFinal() { return DIG4_SDA8.crearF3_SdA8AutoevaluacionFinal(); }

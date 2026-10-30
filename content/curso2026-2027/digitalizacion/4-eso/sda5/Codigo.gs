/**
 * SdA 5 · El mundo de la imagen, edición y transparencia algorítmica · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «DIG4_SDA5.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       DIG4_SDA5_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   DIG4_SDA5_crearF1_SdA5EncuestaInicial()  →  SdA 5 · Encuesta inicial (anónima) (sesión 1, anónimo)
 *        ya creado: https://forms.gle/DumEYmaaLG3Hk2jL6
 *   DIG4_SDA5_crearF2_SdA5AutoevaluacionFinal()  →  SdA 5 · Autoevaluación final (sesión 9)
 *        ya creado: https://forms.gle/4p1H4XF6F35GGbP59
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 5 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 5 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var DIG4_SDA5 = (function () {
var SDA = "SdA 5";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_SdA5EncuestaInicial() { return crearFormulario_("F1"); }
function crearF2_SdA5AutoevaluacionFinal() { return crearFormulario_("F2"); }

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

var CARPETA_SDA = "1E8H0NqyXJEFZYBwVHE_YIigO-fc9B_sv";  // carpeta de la SdA en tu Drive

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
    "titulo": "SdA 5 · Encuesta inicial (anónima)",
    "anonimo": true,
    "obligatorias": true,
    "descripcion": "Encuesta anónima para saber de dónde partimos. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Veremos los resultados de la clase en conjunto, sin nombres.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Usas filtros o retocas tus fotos antes de subirlas a redes?",
        "opciones": [
          "Siempre",
          "A veces",
          "Casi nunca",
          "No subo fotos"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Con qué has editado alguna vez una imagen?",
        "opciones": [
          "Filtros de Instagram o TikTok",
          "CapCut",
          "Canva",
          "GIMP o Photoshop",
          "Una app de IA",
          "Nunca he editado imágenes"
        ],
        "otra": true
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has creado alguna imagen con inteligencia artificial?",
        "opciones": [
          "Sí, muchas veces",
          "Alguna vez",
          "Nunca, pero sé que se puede",
          "No sabía que se podía"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Te ves capaz de distinguir una imagen hecha con IA de una foto real?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "Si una imagen aparece en Google Imágenes, ¿la puedes usar en un cartel?",
        "opciones": [
          "Sí, si está en internet es gratis",
          "Depende de su licencia",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Qué pasa si amplías mucho una foto del móvil?",
        "opciones": [
          "Se ve igual de bien",
          "Se pixela (se ven cuadraditos)",
          "No lo sé"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué te gustaría aprender a hacer con imágenes?",
        "obligatoria": false
      }
    ],
    "enlace": "https://forms.gle/DumEYmaaLG3Hk2jL6",
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "SdA 5 · Autoevaluación final",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Valora con sinceridad lo que has logrado en esta situación de aprendizaje.",
    "confirmacion": "¡Gracias! Tu autoevaluación ayuda a mejorar las próximas SdA.",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué he logrado?",
        "filas": [
          "Distingo mapa de bits y vectorial y elijo el formato adecuado",
          "Retoco una imagen con capas y la exporto con el tamaño correcto",
          "Uso imágenes con licencia y las cito bien",
          "Detecto sesgos en las imágenes generadas con IA",
          "Compruebo si una imagen es real, retocada o generada",
          "Etiqueto lo que he hecho con IA",
          "He presentado mi cartel explicando mis decisiones"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué es lo que más te ha costado y cómo lo has resuelto?"
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué harás distinto la próxima vez que veas o compartas una imagen viral?"
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te ha gustado esta SdA?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      }
    ],
    "enlace": "https://forms.gle/4p1H4XF6F35GGbP59",
    "sesiones": "Sesión 9"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_SdA5EncuestaInicial: crearF1_SdA5EncuestaInicial,
    crearF2_SdA5AutoevaluacionFinal: crearF2_SdA5AutoevaluacionFinal
  };
})();

function DIG4_SDA5_crearTodosLosFormularios() { return DIG4_SDA5.crearTodosLosFormularios(); }
function DIG4_SDA5_crearF1_SdA5EncuestaInicial() { return DIG4_SDA5.crearF1_SdA5EncuestaInicial(); }
function DIG4_SDA5_crearF2_SdA5AutoevaluacionFinal() { return DIG4_SDA5.crearF2_SdA5AutoevaluacionFinal(); }

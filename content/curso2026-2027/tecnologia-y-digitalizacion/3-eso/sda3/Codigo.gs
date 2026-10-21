/**
 * SdA 3 · Un Aula del Futuro · 3.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Borra el contenido de Código.gs, pega este archivo completo y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   crearF1_QueSeDeDibujo()  →  ¿Qué sé de dibujo técnico? (diagnóstico) (sesión 1)
 *        ya creado: https://forms.gle/KMgAVCf63Whz4mpq8
 *   crearF2_CompruebaTusEscalas()  →  Comprueba tus escalas (sesión 5)
 *        ya creado: https://forms.gle/SXDUpPBiopeRQd696
 *   crearF3_TesteoDelDisenoDe()  →  Testeo del diseño de otro equipo (sesión 15)
 *        ya creado: https://forms.gle/oKBAH9yTzodFCmE28
 *   crearF4_CoevaluacionDelElevatorPitch()  →  Coevaluación del Elevator Pitch (sesión 17)
 *        ya creado: https://forms.gle/meSWF8Jzy1VvZEnK8
 *   crearF5_DianaDeAutoevaluacionDe()  →  Diana de autoevaluación de la SdA 3 (sesión 17)
 *        ya creado: https://forms.gle/oAwknj94G6HrLKjG8
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 3 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 3 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 *  Documento de la SdA: ejecuta guardarDocumentoSdA() después de que Claude suba el documento temporal.
 *     Lo pasa a la pestaña «SdA 3» de «Situaciones de Aprendizajes TYD 3 ESO» (carpeta TYD 3 ESO).
 *     La primera vez añade el servicio «Google Docs API» (Servicios + → Google Docs API → Añadir).
 */

var SDA = "SdA 3";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_QueSeDeDibujo() { return crearFormulario_("F1"); }
function crearF2_CompruebaTusEscalas() { return crearFormulario_("F2"); }
function crearF3_TesteoDelDisenoDe() { return crearFormulario_("F3"); }
function crearF4_CoevaluacionDelElevatorPitch() { return crearFormulario_("F4"); }
function crearF5_DianaDeAutoevaluacionDe() { return crearFormulario_("F5"); }

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

var CARPETA_SDA = "10gYdlKJYbJBvjMT6EHNlVfjMaTvLsnQr";  // carpeta de la SdA en tu Drive

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
    "titulo": "¿Qué sé de dibujo técnico? (diagnóstico)",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "No cuenta para la nota: sirve para formar equipos equilibrados en la SdA 3. Responde con sinceridad.",
    "confirmacion": "¡Gracias! En la sesión 10 conocerás tu equipo de consultoría.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "Si miras una casa desde arriba, ¿qué vista estás viendo?",
        "opciones": [
          "Alzado",
          "Planta",
          "Perfil",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "En un plano a escala 1:100, 1 cm del dibujo son…",
        "opciones": [
          "1 cm reales",
          "10 cm reales",
          "1 m real",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Qué es una cota en un plano?",
        "opciones": [
          "Una línea con flechas y un número que indica una medida",
          "El título del plano",
          "Un tipo de escala",
          "No lo sé"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Qué programas o herramientas has usado alguna vez?",
        "opciones": [
          "Tinkercad",
          "SketchUp",
          "Floorplanner u otro programa de planos",
          "Canva",
          "Videojuegos de construir (Minecraft, The Sims…)",
          "Ninguno"
        ],
        "obligatoria": false
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo de seguro o segura te sientes dibujando con escuadra y cartabón?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo de cómodo o cómoda te sientes hablando en público?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué cambiarías de tu aula para estar más a gusto?",
        "obligatoria": false
      }
    ],
    "enlace": "https://forms.gle/KMgAVCf63Whz4mpq8",
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "Comprueba tus escalas",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Autocomprobación antes de la prueba (no cuenta para la nota). Haz las cuentas en un papel y elige la respuesta.",
    "confirmacion": "Soluciones: 1) 1,8 cm · 2) 6 m · 3) 40 mm · 4) 15 mm · 5) 1:50 · 6) 14,4 cm · 7) Ampliación · 8) 2,5 m. Apunta en tu ficha las que has fallado y pregúntalas al inicio de la próxima sesión.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "1. Una puerta de 90 cm dibujada a 1:50 mide…",
        "opciones": [
          "4,5 cm",
          "1,8 cm",
          "18 cm",
          "45 cm"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "2. En un plano a 1:50 una pared mide 12 cm. En realidad mide…",
        "opciones": [
          "60 cm",
          "6 m",
          "2,4 m",
          "600 m"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "3. Un tornillo de 8 mm dibujado a 5:1 mide en el dibujo…",
        "opciones": [
          "1,6 mm",
          "13 mm",
          "40 mm",
          "80 mm"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "4. Una pieza dibujada de 30 mm a escala 2:1 mide en realidad…",
        "opciones": [
          "15 mm",
          "60 mm",
          "32 mm",
          "3 mm"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "5. Para dibujar un aula de 8 × 7 m en un A4 con margen, la mejor escala es…",
        "opciones": [
          "1:10",
          "1:50",
          "1:500",
          "2:1"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "6. Una pared de 7,20 m a escala 1:50 mide en el plano…",
        "opciones": [
          "1,44 cm",
          "14,4 cm",
          "144 cm",
          "36 cm"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "7. La escala 5:1 es de…",
        "opciones": [
          "Reducción",
          "Ampliación",
          "Natural"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "8. En un plano a 1:100 una ventana mide 2,5 cm. En realidad mide…",
        "opciones": [
          "25 cm",
          "2,5 m",
          "250 m",
          "0,25 cm"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo de seguro o segura te sientes para la prueba?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      }
    ],
    "enlace": "https://forms.gle/SXDUpPBiopeRQd696",
    "sesiones": "Sesión 5"
  },
  {
    "id": "F3",
    "titulo": "Testeo del diseño de otro equipo",
    "anonimo": false,
    "repetible": true,
    "obligatorias": true,
    "descripcion": "Haced el paseo 3D por la propuesta de otro equipo y respondedle con respeto y propuestas concretas. Una respuesta por equipo evaluado.",
    "confirmacion": "¡Gracias! Vuestra opinión ayudará a mejorar su diseño.",
    "preguntas": [
      {
        "tipo": "texto",
        "titulo": "Nuestro equipo"
      },
      {
        "tipo": "desplegable",
        "titulo": "Equipo que testeamos",
        "ayuda": "El docente puede cambiar estas opciones por los nombres reales de los equipos.",
        "opciones": [
          "Equipo 1",
          "Equipo 2",
          "Equipo 3",
          "Equipo 4",
          "Equipo 5",
          "Equipo 6",
          "Equipo 7"
        ]
      },
      {
        "tipo": "cuadricula",
        "titulo": "Valorad la propuesta",
        "filas": [
          "Se reconocen las cinco zonas",
          "Cada zona está en un lugar lógico",
          "Se puede circular en silla de ruedas (pasillos de 90 cm)",
          "Aprovecha la luz natural sin reflejos en pantallas",
          "Tiene mobiliario ergonómico y flexible"
        ],
        "columnas": [
          "Sí",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Lo que más nos gusta"
      },
      {
        "tipo": "parrafo",
        "titulo": "Una mejora concreta que proponemos"
      }
    ],
    "enlace": "https://forms.gle/oKBAH9yTzodFCmE28",
    "sesiones": "Sesión 15"
  },
  {
    "id": "F4",
    "titulo": "Coevaluación del Elevator Pitch",
    "anonimo": false,
    "repetible": true,
    "obligatorias": true,
    "descripcion": "Valora cada pitch al terminar. Envía una respuesta por cada equipo que escuchas (no te valores a ti mismo/a).",
    "confirmacion": "Respuesta guardada. Pulsa «Enviar otra respuesta» para el siguiente equipo.",
    "preguntas": [
      {
        "tipo": "desplegable",
        "titulo": "Equipo que presenta",
        "ayuda": "El docente puede cambiar estas opciones por los nombres reales de los equipos.",
        "opciones": [
          "Equipo 1",
          "Equipo 2",
          "Equipo 3",
          "Equipo 4",
          "Equipo 5",
          "Equipo 6",
          "Equipo 7"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "La propuesta resuelve un problema claro del aula",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Explica bien las zonas y por qué están ahí",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Tiene en cuenta la ergonomía, la accesibilidad y la sostenibilidad",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Participa todo el equipo y se entiende bien",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "Premios (marca si lo merece)",
        "opciones": [
          "Más innovadora",
          "Más sostenible",
          "Más accesible"
        ],
        "obligatoria": false
      },
      {
        "tipo": "texto",
        "titulo": "Un consejo para mejorar",
        "obligatoria": false
      }
    ],
    "enlace": "https://forms.gle/meSWF8Jzy1VvZEnK8",
    "sesiones": "Sesión 17"
  },
  {
    "id": "F5",
    "titulo": "Diana de autoevaluación de la SdA 3",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Piensa en todo lo que has hecho en la SdA 3 y valora tu aprendizaje con sinceridad.",
    "confirmacion": "¡Gracias! Tu reflexión ayuda a preparar la próxima SdA.",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué he aprendido?",
        "filas": [
          "Dibujar alzado, planta y perfil",
          "Calcular y elegir escalas",
          "Acotar según la norma",
          "Dibujar el plano del aula a escala",
          "Diseñar en Floorplanner",
          "Buscar información fiable",
          "Organizar mis archivos en Drive",
          "Presentar en público"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Mi participación en el equipo",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Muy poca",
          "Muy activa"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Lo que mejor me ha salido y por qué"
      },
      {
        "tipo": "parrafo",
        "titulo": "Algo que mejoraré en la próxima SdA"
      }
    ],
    "enlace": "https://forms.gle/oAwknj94G6HrLKjG8",
    "sesiones": "Sesión 17"
  }
];

// ----------------------------------------------------------------- documento de la SdA en una pestaña
// Pasa el documento de la SdA (subido por Claude a la carpeta del curso como «SdA 3 · Documento para la pestaña (temporal)»,
// o el archivo «SdA3_documento.docx» subido a mano a esa carpeta)
// a la pestaña «SdA 3» del documento «Situaciones de Aprendizajes TYD 3 ESO». Crea el documento o la pestaña si no existen;
// si la pestaña ya existe, sustituye su contenido (lo anterior queda en el historial de versiones del documento).
// Necesita el servicio avanzado «Google Docs API»: en el editor, «Servicios» (+) → Google Docs API → Añadir
// (y «Drive API» solo si hay que convertir un .docx subido a mano).
var DOC_SDA = {"carpeta": "1PhhTFr9A_piST9ec8YzEBRZvhcVNcimU", "curso": "TYD 3 ESO", "documento": "Situaciones de Aprendizajes TYD 3 ESO", "pestana": "SdA 3", "orden": 3, "temporal": "SdA 3 · Documento para la pestaña (temporal)", "docx": "SdA3_documento.docx"};

function guardarDocumentoSdA() {
  if (typeof Docs === 'undefined')
    throw new Error('Falta el servicio «Google Docs API»: en el editor pulsa «Servicios» (+), elige Google Docs API, pulsa «Añadir» y vuelve a ejecutar guardarDocumentoSdA().');
  var carpeta = DriveApp.getFolderById(DOC_SDA.carpeta), borrar = [];
  var temporal = primero_(carpeta.getFilesByName(DOC_SDA.temporal));
  if (!temporal) {                                             // plan B: el .docx subido a mano a la carpeta del curso
    var docx = primero_(carpeta.getFilesByName(DOC_SDA.docx)) ||           // tal cual o ya convertido por Drive
               primero_(carpeta.getFilesByName(DOC_SDA.docx.replace(/\.docx$/, '')));
    if (!docx) throw new Error('No encuentro «' + DOC_SDA.temporal + '» ni «' + DOC_SDA.docx + '» en la carpeta «' + carpeta.getName() + '». Sube allí el .docx de la SdA (o pide a Claude que lo suba) y vuelve a ejecutar.');
    borrar.push(docx);
    if (docx.getMimeType() === MimeType.GOOGLE_DOCS) temporal = docx;
    else {
      if (typeof Drive === 'undefined')
        throw new Error('Para convertir el .docx falta el servicio «Drive API»: «Servicios» (+) → Drive API → Añadir. (O ábrelo en Drive con Documentos de Google y guárdalo como documento de Google con el nombre «' + DOC_SDA.temporal + '».)');
      var copia = Drive.Files.copy({ name: DOC_SDA.temporal, mimeType: MimeType.GOOGLE_DOCS, parents: [DOC_SDA.carpeta] }, docx.getId());
      temporal = DriveApp.getFileById(copia.id);
    }
  }
  borrar.push(temporal);
  var origen = DocumentApp.openById(temporal.getId());

  var existente = primero_(carpeta.getFilesByName(DOC_SDA.documento)), doc, nuevo = false;
  if (existente) doc = DocumentApp.openById(existente.getId());
  else {
    doc = DocumentApp.create(DOC_SDA.documento); nuevo = true;
    DriveApp.getFileById(doc.getId()).moveTo(carpeta);
  }
  var id = doc.getId(), tab = buscarPestana_(doc.getTabs(), DOC_SDA.orden);
  if (!tab) {
    var tabs = doc.getTabs();
    if (nuevo && tabs.length === 1) {               // documento recién creado: se renombra su primera pestaña
      Docs.Documents.batchUpdate({ requests: [{ updateDocumentTabProperties: {
        tabProperties: { tabId: tabs[0].getId(), title: DOC_SDA.pestana }, fields: 'title' } }] }, id);
      tab = tabs[0].getId();
    } else {                                         // se coloca en orden: SdA 1, SdA 2, SdA 3…
      var pos = tabs.length;
      for (var i = 0; i < tabs.length; i++) {
        var m = tabs[i].getTitle().match(/^\s*SdA\s*(\d+)(?!\d)/i);
        if (m && +m[1] > DOC_SDA.orden) { pos = i; break; }
      }
      var r = Docs.Documents.batchUpdate({ requests: [{ addDocumentTab: {
        tabProperties: { title: DOC_SDA.pestana, index: pos } } }] }, id);
      tab = r.replies[0].addDocumentTab.tabProperties.tabId;
    }
    doc.saveAndClose(); doc = DocumentApp.openById(id);
  } else tab = tab.getId();

  var body = doc.getTab(tab).asDocumentTab().getBody();
  body.clear();
  copiarCuerpo_(origen.getBody(), body);
  try { var p0 = body.getChild(0);                   // quita el párrafo vacío que deja clear()
        if (body.getNumChildren() > 1 && p0.getType() === DocumentApp.ElementType.PARAGRAPH && !p0.asParagraph().getText()) p0.removeFromParent();
  } catch (e) { /* Docs no deja quitarlo si va justo antes de una tabla */ }
  doc.saveAndClose();
  borrar.forEach(function (f) { try { f.setTrashed(true); } catch (e) {} });
  Logger.log('✔ ' + DOC_SDA.pestana + ' guardada en «' + DOC_SDA.documento + '»');
  Logger.log('    ' + 'https://docs.google.com/document/d/' + id + '/edit?tab=' + tab);
}

// Primer archivo que no esté en la papelera (getFilesByName también devuelve los que están en ella).
function primero_(it) {
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return null;
}

// Pestaña cuyo título empieza por «SdA N» (también entre las pestañas hijas).
function buscarPestana_(tabs, n) {
  for (var i = 0; i < tabs.length; i++) {
    var m = tabs[i].getTitle().match(/^\s*SdA\s*(\d+)(?!\d)/i);
    if (m && +m[1] === n) return tabs[i];
    var h = buscarPestana_(tabs[i].getChildTabs(), n);
    if (h) return h;
  }
  return null;
}

function copiarCuerpo_(de, a) {
  var T = DocumentApp.ElementType;
  for (var i = 0; i < de.getNumChildren(); i++) {
    var el = de.getChild(i).copy(), t = el.getType();
    if (t === T.PARAGRAPH) a.appendParagraph(el);
    else if (t === T.LIST_ITEM) a.appendListItem(el);
    else if (t === T.TABLE) a.appendTable(el);
    else if (t === T.PAGE_BREAK) a.appendPageBreak(el);
    else if (t === T.HORIZONTAL_RULE) a.appendHorizontalRule();
  }
}

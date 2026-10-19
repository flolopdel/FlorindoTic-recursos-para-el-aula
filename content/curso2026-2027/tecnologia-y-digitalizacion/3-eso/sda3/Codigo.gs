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
 *   crearF2_CompruebaTusEscalas()  →  Comprueba tus escalas (sesión 5)
 *   crearF3_TesteoDelDisenoDe()  →  Testeo del diseño de otro equipo (sesión 15)
 *   crearF4_CoevaluacionDelElevatorPitch()  →  Coevaluación del Elevator Pitch (sesión 17)
 *   crearF5_DianaDeAutoevaluacionDe()  →  Diana de autoevaluación de la SdA 3 (sesión 17)
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
    "sesiones": "Sesión 17"
  }
];

/**
 * SdA 7 · Programación, Pensamiento Computacional e IoT · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Crea un archivo nuevo (p. ej. «DIG4_SDA7.gs») o usa Código.gs, pega este archivo completo (puede convivir con los de otras SdA en el mismo proyecto) y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       DIG4_SDA7_crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   DIG4_SDA7_crearF1_SdA7EncuestaInicial()  →  SdA 7 · Encuesta inicial: jugar y programar (anónima) (sesión 1, anónimo)
 *   DIG4_SDA7_crearF2_SdA7PlaytestingPruebo()  →  SdA 7 · Playtesting: pruebo el juego de otra persona (sesiones 9, 15, anónimo)
 *   DIG4_SDA7_crearF3_SdA7AutoevaluacionFinal()  →  SdA 7 · Autoevaluación final (sesión 15)
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Sus enlaces quedan en la hoja «SdA 7 · Enlaces de formularios» de la carpeta de la SdA:
 *     cuando termines, díselo a Claude y los pondrá en la web de clase.
 *     Los formularios se guardan dentro de la carpeta de la SdA, en «SdA 7 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var DIG4_SDA7 = (function () {
var SDA = "SdA 7";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_SdA7EncuestaInicial() { return crearFormulario_("F1"); }
function crearF2_SdA7PlaytestingPruebo() { return crearFormulario_("F2"); }
function crearF3_SdA7AutoevaluacionFinal() { return crearFormulario_("F3"); }

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

var CARPETA_SDA = "1WkbV-13TlPcfV-A4-0as-nkCnz7VVeBz";  // carpeta de la SdA en tu Drive

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
    "titulo": "SdA 7 · Encuesta inicial: jugar y programar (anónima)",
    "anonimo": true,
    "obligatorias": false,
    "descripcion": "Esta encuesta es anónima. Sirve para preparar el proyecto del videojuego a vuestra medida.",
    "confirmacion": "¡Gracias! Veremos los resultados en la próxima sesión.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Con qué frecuencia juegas a videojuegos?",
        "opciones": [
          "Casi nunca",
          "Alguna vez al mes",
          "Varias veces por semana",
          "Todos los días"
        ],
        "obligatoria": true
      },
      {
        "tipo": "casillas",
        "titulo": "¿Qué tipos de juego te gustan?",
        "opciones": [
          "Plataformas",
          "Laberintos o exploración",
          "Naves o disparos",
          "Deportes o carreras",
          "Puzles",
          "Juegos de móvil casuales"
        ],
        "otra": true
      },
      {
        "tipo": "casillas",
        "titulo": "¿Has programado alguna vez con…?",
        "opciones": [
          "Scratch",
          "MakeCode o micro:bit",
          "Code.org",
          "Python o JavaScript",
          "Nunca he programado"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te ves capaz de crear tu propio videojuego?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "Un sprite en un videojuego es…",
        "opciones": [
          "Un refresco",
          "Un personaje u objeto que se mueve",
          "Un tipo de nivel",
          "No lo sé"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has usado alguna vez una IA (chat) para hacer tareas?",
        "opciones": [
          "Nunca",
          "Alguna vez",
          "A menudo"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué te gustaría que tuviera tu videojuego?"
      }
    ],
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "SdA 7 · Playtesting: pruebo el juego de otra persona",
    "anonimo": true,
    "repetible": true,
    "obligatorias": false,
    "descripcion": "Rellena una respuesta por cada juego que pruebes. Critica el juego, no a la persona, y propón siempre una mejora.",
    "confirmacion": "Gracias por tu opinión. Si pruebas otro juego, pulsa «Enviar otra respuesta».",
    "preguntas": [
      {
        "tipo": "texto",
        "titulo": "Título del juego que has probado",
        "obligatoria": true
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te ha gustado?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "😕",
          "🤩"
        ]
      },
      {
        "tipo": "cuadricula",
        "titulo": "Dificultad de cada nivel",
        "filas": [
          "Nivel 1",
          "Nivel 2",
          "Nivel 3"
        ],
        "columnas": [
          "Muy fácil",
          "Justo",
          "Muy difícil",
          "No llegué"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Has encontrado algún fallo?",
        "opciones": [
          "Se atraviesa un muro",
          "Los enemigos se quedan atascados",
          "Se pierden todas las vidas de golpe",
          "No se pasa de nivel",
          "No he encontrado fallos"
        ],
        "otra": true
      },
      {
        "tipo": "parrafo",
        "titulo": "Lo que mejor funciona del juego"
      },
      {
        "tipo": "parrafo",
        "titulo": "Una propuesta de mejora",
        "obligatoria": true
      }
    ],
    "sesiones": "Sesiones 9, 15"
  },
  {
    "id": "F3",
    "titulo": "SdA 7 · Autoevaluación final",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Piensa en lo que sabías en la sesión 1 y en lo que sabes ahora. Responde con sinceridad: no cuenta para la nota.",
    "confirmacion": "¡Gracias! Tu autoevaluación ayuda a mejorar las próximas situaciones de aprendizaje.",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué sé hacer ahora?",
        "filas": [
          "Crear sprites y moverlos con los controles",
          "Programar eventos de choque, puntos y vidas",
          "Hacer un mapa de azulejos con cámara",
          "Programar enemigos aleatorios",
          "Encadenar niveles con una variable y una función",
          "Leer y modificar mi juego en JavaScript o Python",
          "Encontrar y corregir errores",
          "Usar la IA comprobando lo que dice y citándola",
          "Conectar dos micro:bit por radio con el acelerómetro"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo ha funcionado tu pareja o trío en el proyecto final?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Mal",
          "Muy bien"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "El error más difícil que resolví y cómo lo hice"
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué cambiarías de esta situación de aprendizaje?",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 15"
  }
];

  return {
    crearTodosLosFormularios: crearTodosLosFormularios,
    crearF1_SdA7EncuestaInicial: crearF1_SdA7EncuestaInicial,
    crearF2_SdA7PlaytestingPruebo: crearF2_SdA7PlaytestingPruebo,
    crearF3_SdA7AutoevaluacionFinal: crearF3_SdA7AutoevaluacionFinal
  };
})();

function DIG4_SDA7_crearTodosLosFormularios() { return DIG4_SDA7.crearTodosLosFormularios(); }
function DIG4_SDA7_crearF1_SdA7EncuestaInicial() { return DIG4_SDA7.crearF1_SdA7EncuestaInicial(); }
function DIG4_SDA7_crearF2_SdA7PlaytestingPruebo() { return DIG4_SDA7.crearF2_SdA7PlaytestingPruebo(); }
function DIG4_SDA7_crearF3_SdA7AutoevaluacionFinal() { return DIG4_SDA7.crearF3_SdA7AutoevaluacionFinal(); }

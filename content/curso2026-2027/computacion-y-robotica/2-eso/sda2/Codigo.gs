/**
 * SdA 2 · Código en Acción: Videojuegos e Historias Interactivas Sostenibles · 2.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Borra el contenido de Código.gs, pega este archivo completo y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   crearF1_EncuestaInicialVideojuegosY()  →  Encuesta inicial: videojuegos y programación (sesión 1, anónimo)
 *   crearF2_GameTestersValoracionDe()  →  Game testers: valoración de un videojuego (sesión 16)
 *   crearF3_DianaDeAutoevaluacionY()  →  Diana de autoevaluación y KWL (sesión 18)
 *     La primera vez Google pide permiso para crear formularios y guardarlos en tu Drive: acéptalo.
 *  4. En «Registro de ejecución» aparecen, de cada formulario, el enlace para el alumnado y el de edición.
 *     Los formularios se guardan en la carpeta «SdA 2 · Formularios» de tu Drive.
 *
 * Los formularios anónimos NO recogen el correo. Con una cuenta del centro, además solo pueden responder
 * cuentas del centro (sin que quede registrado quién responde). Revisa cada formulario antes de compartirlo.
 */

var SDA = "SdA 2";

function crearTodosLosFormularios() {
  FORMULARIOS.forEach(function (f) {
    if (f.enlace) { Logger.log('· ' + f.id + ' «' + f.titulo + '» ya existe: ' + f.enlace + ' (para crearlo de nuevo, ejecuta su función).'); return; }
    crearFormulario_(f.id);
  });
}

function crearF1_EncuestaInicialVideojuegosY() { return crearFormulario_("F1"); }
function crearF2_GameTestersValoracionDe() { return crearFormulario_("F2"); }
function crearF3_DianaDeAutoevaluacionY() { return crearFormulario_("F3"); }

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
  Logger.log('✔ ' + f.id + ' «' + f.titulo + '» (' + f.sesiones + ')');
  Logger.log('    Alumnado: ' + url);
  Logger.log('    Editar y ver respuestas: ' + form.getEditUrl());
  return form;
}

function carpeta_() {
  var nombre = SDA + ' · Formularios';
  var it = DriveApp.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nombre);
}

// ----------------------------------------------------------------- formularios (puedes editar los textos)
var FORMULARIOS = [
  {
    "id": "F1",
    "titulo": "Encuesta inicial: videojuegos y programación",
    "anonimo": true,
    "obligatorias": true,
    "descripcion": "Encuesta anónima para conocer al grupo antes de empezar. No hay respuestas buenas ni malas.",
    "confirmacion": "¡Gracias! Con tus respuestas prepararemos los equipos y las prácticas.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Con qué frecuencia juegas a videojuegos?",
        "opciones": [
          "Casi nunca",
          "Algún día a la semana",
          "Casi todos los días"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Dónde juegas?",
        "opciones": [
          "Móvil",
          "Consola",
          "Ordenador",
          "Tableta",
          "No juego"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has programado alguna vez?",
        "opciones": [
          "Nunca",
          "Un poco (en Primaria o en casa)",
          "Sí, bastante"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Conoces Scratch?",
        "opciones": [
          "No lo conozco",
          "Lo he visto",
          "He hecho algún proyecto"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Con tus palabras, ¿qué crees que es un algoritmo?",
        "obligatoria": false
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te preocupa el cuidado del medio ambiente?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "texto",
        "titulo": "Si crearas un videojuego, ¿de qué trataría?",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "Game testers: valoración de un videojuego",
    "anonimo": false,
    "repetible": true,
    "obligatorias": true,
    "descripcion": "Responde una vez por cada juego que pruebes. Sé concreto/a y respetuoso/a: tu valoración ayuda al equipo a mejorar.",
    "confirmacion": "¡Gracias, game tester! Pulsa «Enviar otra respuesta» para valorar el siguiente juego.",
    "preguntas": [
      {
        "tipo": "desplegable",
        "titulo": "Equipo que has probado",
        "ayuda": "El docente cambiará estas opciones por los nombres de los equipos.",
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
        "titulo": "¿Se entiende el objetivo del juego?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Funcionan bien los controles?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Perfectamente"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Se entiende el mensaje sobre el ODS?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has encontrado algún bug?",
        "opciones": [
          "No",
          "Sí, uno pequeño",
          "Sí, uno que impide jugar"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Describe el bug: qué hiciste y qué pasó",
        "obligatoria": false
      },
      {
        "tipo": "parrafo",
        "titulo": "Lo que más me ha gustado"
      },
      {
        "tipo": "parrafo",
        "titulo": "Una sugerencia para mejorarlo"
      }
    ],
    "sesiones": "Sesión 16"
  },
  {
    "id": "F3",
    "titulo": "Diana de autoevaluación y KWL",
    "anonimo": false,
    "obligatorias": true,
    "descripcion": "Reflexiona sobre lo que has aprendido en la SdA «Código en Acción». Sé sincero/a: no cuenta para la nota.",
    "confirmacion": "¡Gracias! Revisa tus respuestas cuando empieces la próxima SdA de programación.",
    "preguntas": [
      {
        "tipo": "seccion",
        "titulo": "Diana de autoevaluación"
      },
      {
        "tipo": "cuadricula",
        "titulo": "Marca tu nivel en cada aspecto",
        "filas": [
          "Escribo algoritmos y diagramas de flujo",
          "Uso bucles en Scratch",
          "Uso condicionales y sensores",
          "Uso variables de puntos y tiempo",
          "Encuentro y corrijo bugs",
          "Uso recursos libres y los cito",
          "Publico de forma segura en Scratch",
          "He cumplido mi rol en el equipo"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto has disfrutado creando tu videojuego?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Muchísimo"
        ]
      },
      {
        "tipo": "seccion",
        "titulo": "KWL: sabía, quería saber, he aprendido"
      },
      {
        "tipo": "parrafo",
        "titulo": "K · ¿Qué sabía de programación antes de empezar?"
      },
      {
        "tipo": "parrafo",
        "titulo": "W · ¿Qué quería aprender?"
      },
      {
        "tipo": "parrafo",
        "titulo": "L · ¿Qué he aprendido? Nombra al menos tres cosas."
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué mejorarías de tu trabajo o del de tu equipo?",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 18"
  }
];

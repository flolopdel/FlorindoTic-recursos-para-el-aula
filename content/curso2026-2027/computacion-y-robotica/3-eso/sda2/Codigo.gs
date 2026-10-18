/**
 * SdA 2 · Código en Acción - Videojuegos e Historias Interactivas Sostenibles · 3.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Borra el contenido de Código.gs, pega este archivo completo y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   crearF1_CoevaluacionArcadeGameFair()  →  Coevaluación Arcade Game Fair (sesiones 15-16)
 *        ya creado: https://forms.gle/Bve6vg1UUKw52h9N6
 *   crearF2_AutoevaluacionYValoracionDe()  →  Autoevaluación y valoración de la SdA 2 (sesión 16)
 *        ya creado: https://forms.gle/cY6bXcU17amPEqCGA
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

function crearF1_CoevaluacionArcadeGameFair() { return crearFormulario_("F1"); }
function crearF2_AutoevaluacionYValoracionDe() { return crearFormulario_("F2"); }

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
    "titulo": "Coevaluación Arcade Game Fair",
    "anonimo": false,
    "enlace": "https://forms.gle/Bve6vg1UUKw52h9N6",
    "repetible": true,
    "obligatorias": true,
    "descripcion": "Rellena un formulario por cada juego que juegues. Sé concreto/a y amable: tus comentarios ayudan a mejorar el juego.",
    "confirmacion": "¡Gracias! Pulsa «Enviar otra respuesta» para valorar el siguiente juego.",
    "preguntas": [
      {
        "tipo": "desplegable",
        "titulo": "Estudio cuyo juego valoras",
        "ayuda": "Docente: cambia «Estudio 1…» por los nombres reales de los estudios.",
        "opciones": [
          "Estudio 1",
          "Estudio 2",
          "Estudio 3",
          "Estudio 4",
          "Estudio 5",
          "Estudio 6"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Jugabilidad: ¿se juega bien y es divertido?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Controles e instrucciones: ¿se entiende qué hay que hacer?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Arte y sonido",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Poco cuidado",
          "Muy cuidado"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "Elevator pitch: ¿se entendió cómo funciona el juego?",
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
          "Sí, uno",
          "Sí, varios"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Si has encontrado un bug: ¿qué pasa y cuándo?",
        "obligatoria": false
      },
      {
        "tipo": "texto",
        "titulo": "Lo que más me ha gustado"
      },
      {
        "tipo": "texto",
        "titulo": "Una mejora para la versión 1.1"
      }
    ],
    "sesiones": "Sesiones 15-16"
  },
  {
    "id": "F2",
    "titulo": "Autoevaluación y valoración de la SdA 2",
    "anonimo": false,
    "enlace": "https://forms.gle/cY6bXcU17amPEqCGA",
    "obligatorias": true,
    "descripcion": "Responde con sinceridad: no cuenta para nota. Sirve para que veas lo que has aprendido y para mejorar la SdA.",
    "confirmacion": "¡Gracias! Has terminado la SdA 2. ¡Enhorabuena por tu juego!",
    "preguntas": [
      {
        "tipo": "cuadricula",
        "titulo": "¿Qué he logrado?",
        "filas": [
          "Explico cómo funciona un programa: variables, condicionales, bucles y listas",
          "Resuelvo retos programando y colaboro en mi estudio",
          "Programo eventos (botones, colisiones, tiempo)",
          "Construyo un juego jugable y entiendo qué pasa al compartirlo",
          "Publico mi juego sin datos personales",
          "Uso recursos con licencia y los atribuyo"
        ],
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ]
      },
      {
        "tipo": "desplegable",
        "titulo": "Mi rol en el estudio",
        "opciones": [
          "Lead Programmer",
          "UI/UX y Arte",
          "QA Tester y Documentación",
          "UI/UX y QA (pareja)"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo he cumplido mi rol?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Poco",
          "Muy bien"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo ha funcionado mi estudio?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Mal",
          "Muy bien"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "¿Has escrito alguna parte del juego en JavaScript o Python?",
        "opciones": [
          "Sí",
          "Lo he intentado",
          "No"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Lo que más me ha costado y cómo lo he resuelto"
      },
      {
        "tipo": "escala",
        "titulo": "¿Te ha gustado la SdA?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué cambiarías de la SdA?",
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 16"
  }
];

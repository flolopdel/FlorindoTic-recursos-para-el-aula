/**
 * SdA 3 · Ética, Salud Digital y Sostenibilidad Ecosocial · 4.º ESO
 * Formularios de Google de la situación de aprendizaje (generado a partir del JSON de la SdA).
 *
 * Cómo usarlo:
 *  1. Entra en https://script.google.com con tu cuenta del centro → «Nuevo proyecto».
 *  2. Borra el contenido de Código.gs, pega este archivo completo y guarda (icono del disquete).
 *  3. En la barra superior elige una función y pulsa «Ejecutar»:
 *       crearTodosLosFormularios()  crea los que aún no tienen enlace (los ya creados se saltan).
 *   crearF1_CuantoTeCuestaTu()  →  ¿Cuánto te cuesta tu scroll? (encuesta anónima) (sesión 1, anónimo)
 *        ya creado: https://forms.gle/VdcEyGex3hpTHNjEA
 *   crearF2_TestDeNomofobiaAnonimo()  →  Test de nomofobia (anónimo) (sesión 3, anónimo)
 *        ya creado: https://forms.gle/QJ8EuqAkaqKT1HtCA
 *   crearF3_PaseoDeGaleriaDos()  →  Paseo de galería: dos estrellas y un deseo (sesión 6, anónimo)
 *        ya creado: https://forms.gle/mY6ZWC8vV3njvxro7
 *   crearF4_CierreDelBloque1()  →  Cierre del bloque 1: mi compromiso de hábito saludable (sesión 6, anónimo)
 *        ya creado: https://forms.gle/14yGNMkaZ4iKNifu5
 *   crearF5_CierreDeLaSdA()  →  Cierre de la SdA: votación, autoevaluación y valoración (sesión 12)
 *        ya creado: https://forms.gle/fFNUjtyXrQGfgzW28
 *   crearF6_NosAutoevaluamosEnEl()  →  Nos autoevaluamos en el debate (sesión 11)
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

function crearF1_CuantoTeCuestaTu() { return crearFormulario_("F1"); }
function crearF2_TestDeNomofobiaAnonimo() { return crearFormulario_("F2"); }
function crearF3_PaseoDeGaleriaDos() { return crearFormulario_("F3"); }
function crearF4_CierreDelBloque1() { return crearFormulario_("F4"); }
function crearF5_CierreDeLaSdA() { return crearFormulario_("F5"); }
function crearF6_NosAutoevaluamosEnEl() { return crearFormulario_("F6"); }

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

var CARPETA_SDA = "1sybyZeZ-THvR-PtrO_hoSa7Xo_V6ma3K";  // carpeta de la SdA en tu Drive

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
    "titulo": "¿Cuánto te cuesta tu scroll? (encuesta anónima)",
    "anonimo": true,
    "enlace": "https://forms.gle/VdcEyGex3hpTHNjEA",
    "descripcion": "Encuesta ANÓNIMA de Digitalización (4.º ESO). No se recoge tu nombre ni tu correo. Responde con sinceridad: no hay respuestas buenas ni malas. Si no quieres contestar alguna pregunta, déjala en blanco. Veremos los resultados de toda la clase en la pantalla.",
    "confirmacion": "¡Gracias! Mira la pantalla: ahora vemos los resultados de toda la clase.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "1. ¿Cuántas horas al día usas pantallas fuera del instituto?",
        "ayuda": "Cuenta móvil, consola, ordenador y tele. Haz una estimación; si quieres comprobarlo, mira en casa «Bienestar digital» (Android) o «Tiempo de uso» (iPhone).",
        "opciones": [
          "Menos de 2 horas",
          "Entre 2 y 4 horas",
          "Entre 4 y 6 horas",
          "Más de 6 horas"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "2. ¿Dónde está tu móvil mientras duermes?",
        "opciones": [
          "En la cama o en la mesita, con sonido o vibración",
          "En la habitación, en silencio o en modo avión",
          "Fuera de mi habitación"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "3. ¿Usas el móvil en la última media hora antes de dormirte?",
        "opciones": [
          "Nunca",
          "Algunas noches",
          "Casi todas las noches",
          "Todas las noches"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "4. ¿Te duelen el cuello o la espalda después de usar el móvil o el ordenador?",
        "opciones": [
          "Nunca",
          "A veces",
          "A menudo",
          "Casi siempre"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "5. ¿Notas los ojos cansados, secos o con picor después de usar pantallas?",
        "opciones": [
          "Nunca",
          "A veces",
          "A menudo",
          "Casi siempre"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "6. ¿Te has sentido nervioso/a o agobiado/a al quedarte sin móvil o sin batería?",
        "opciones": [
          "Nunca",
          "Alguna vez",
          "A menudo",
          "Casi siempre"
        ]
      },
      {
        "tipo": "opcion",
        "titulo": "7. ¿Con qué frecuencia usas herramientas de IA generativa?",
        "ayuda": "Por ejemplo: ChatGPT, Gemini, Copilot, Meta AI (en WhatsApp o Instagram) o apps que crean imágenes o vídeos.",
        "opciones": [
          "Nunca",
          "Alguna vez al mes",
          "Cada semana",
          "Casi todos los días"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "8. Si usas IA generativa, ¿para qué la usas sobre todo?",
        "ayuda": "Puedes marcar varias.",
        "opciones": [
          "Deberes y estudiar",
          "Buscar información",
          "Crear imágenes, vídeos, música o memes",
          "Hablar con ella o pedirle consejos personales",
          "Entretenerme o curiosear",
          "No uso IA generativa"
        ]
      }
    ],
    "sesiones": "Sesión 1"
  },
  {
    "id": "F2",
    "titulo": "Test de nomofobia (anónimo)",
    "anonimo": true,
    "enlace": "https://forms.gle/QJ8EuqAkaqKT1HtCA",
    "descripcion": "Test ANÓNIMO de 10 afirmaciones adaptado de la escala NMP-Q (Yildirim y Correia, 2015). Marca de 1 (nada de acuerdo) a 7 (totalmente de acuerdo) y apunta en un papel el número de cada respuesta: al final sumarás. No es un diagnóstico y nadie comparte su resultado; sirve para pensar en tus hábitos.",
    "confirmacion": "Suma los 10 números que has marcado (de 10 a 70). Orientación: 10, sin nomofobia; de 11 a 29, leve; de 30 a 49, moderada; de 50 a 70, alta. No es un diagnóstico. Si tu resultado te preocupa, habla con tu tutor/a o con el Departamento de Orientación.",
    "obligatorias": true,
    "preguntas": [
      {
        "tipo": "escala",
        "titulo": "1. Me sentiría incómodo/a si no pudiera consultar información en el móvil cuando quisiera.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "2. Me molestaría no poder buscar algo en el móvil en el momento en que lo necesito.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "3. Me pondría nervioso/a si me quedara sin batería.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "4. Si me quedara sin datos o sin wifi, estaría pendiente de encontrar una conexión.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "5. Si no pudiera usar el móvil, me preocuparía no poder hablar con mi familia o mis amigos/as.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "6. Me agobiaría no recibir los mensajes y las llamadas al momento.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "7. Me sentiría nervioso/a por no saber lo que pasa en mis redes sociales.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "8. Me sentiría raro/a por no poder ver las notificaciones de mis apps.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "9. Me sentiría incómodo/a si no pudiera mirar el móvil durante un rato.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      },
      {
        "tipo": "escala",
        "titulo": "10. Si no llevara el móvil encima, me sentiría inseguro/a.",
        "min": 1,
        "max": 7,
        "etiquetas": [
          "Nada de acuerdo",
          "Totalmente de acuerdo"
        ]
      }
    ],
    "sesiones": "Sesión 3"
  },
  {
    "id": "F3",
    "titulo": "Paseo de galería: dos estrellas y un deseo",
    "anonimo": true,
    "enlace": "https://forms.gle/mY6ZWC8vV3njvxro7",
    "repetible": true,
    "descripcion": "Responde una vez por cada cómic que visites. Prueba antes sus interacciones. Escribe con respeto: tus comentarios ayudan al equipo a mejorar.",
    "confirmacion": "¡Gracias! Cuando cambies de estación, pulsa «Enviar otra respuesta» para valorar el siguiente cómic.",
    "obligatorias": true,
    "preguntas": [
      {
        "tipo": "desplegable",
        "titulo": "¿Qué cómic estás valorando?",
        "ayuda": "Docente: cambia «Equipo 1…» por los nombres de los equipos al editar el formulario.",
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
        "tipo": "opcion",
        "titulo": "¿Funcionan las interacciones (botones, ventanas emergentes, enlaces)?",
        "opciones": [
          "Sí, todas",
          "Alguna no funciona",
          "No he podido probarlas"
        ]
      },
      {
        "tipo": "texto",
        "titulo": "⭐ Una cosa que funciona"
      },
      {
        "tipo": "texto",
        "titulo": "⭐ Otra cosa que funciona"
      },
      {
        "tipo": "parrafo",
        "titulo": "💡 Un deseo: una mejora concreta"
      }
    ],
    "sesiones": "Sesión 6"
  },
  {
    "id": "F4",
    "titulo": "Cierre del bloque 1: mi compromiso de hábito saludable",
    "anonimo": true,
    "enlace": "https://forms.gle/14yGNMkaZ4iKNifu5",
    "descripcion": "Escribe un hábito saludable que te comprometes a mantener las próximas semanas. Lo recordaremos en la sesión 12.",
    "confirmacion": "¡Compromiso guardado! En la sesión 12 veremos si lo has mantenido.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Sobre qué es tu compromiso?",
        "opciones": [
          "Postura y vista",
          "Sueño",
          "Actividad física",
          "Tiempo de pantalla",
          "Notificaciones y redes sociales"
        ],
        "otra": true,
        "obligatoria": true
      },
      {
        "tipo": "parrafo",
        "titulo": "Mi compromiso: qué haré, cuándo y cómo",
        "ayuda": "Ejemplo: «Dejo el móvil en el salón a las 23:00 todas las noches».",
        "obligatoria": true
      },
      {
        "tipo": "casillas",
        "titulo": "¿Qué cómics propondrías al equipo directivo para difundirlos en los canales del centro?",
        "ayuda": "Elige hasta dos. Docente: cambia «Equipo 1…» por los nombres de los equipos.",
        "opciones": [
          "Equipo 1",
          "Equipo 2",
          "Equipo 3",
          "Equipo 4",
          "Equipo 5",
          "Equipo 6",
          "Equipo 7"
        ]
      }
    ],
    "sesiones": "Sesión 6"
  },
  {
    "id": "F5",
    "titulo": "Cierre de la SdA: votación, autoevaluación y valoración",
    "anonimo": false,
    "enlace": "https://forms.gle/fFNUjtyXrQGfgzW28",
    "descripcion": "Este formulario recoge tu correo del centro porque incluye tu autoevaluación. La votación y la valoración de la SdA solo se mostrarán como resultados de toda la clase.",
    "confirmacion": "¡Gracias! Tu opinión sirve para mejorar las próximas situaciones de aprendizaje.",
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Debería poder usar la IA generativa sin límites un/a menor de 16 años?",
        "ayuda": "Es la misma pregunta de las sesiones 1 y 7.",
        "opciones": [
          "Sí",
          "No",
          "Depende"
        ],
        "obligatoria": true
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué hábito digital has mantenido desde el bloque 1? Si no has podido, ¿qué te lo ha impedido?"
      },
      {
        "tipo": "opcion",
        "titulo": "¿Ha cambiado tu forma de ver la IA generativa?",
        "opciones": [
          "Sí, bastante",
          "Un poco",
          "No"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué ha cambiado o qué te ha hecho pensar?"
      },
      {
        "tipo": "seccion",
        "titulo": "Autoevaluación",
        "ayuda": "Piensa en lo que has hecho en las 12 sesiones."
      },
      {
        "tipo": "cuadricula",
        "titulo": "¿Cómo lo has conseguido?",
        "obligatoria": true,
        "columnas": [
          "Lo he logrado",
          "En parte",
          "Todavía no"
        ],
        "filas": [
          "Identifico riesgos físicos y psicológicos del uso de pantallas y su causa.",
          "Propongo y aplico hábitos saludables concretos.",
          "Sé a quién acudir ante una situación de riesgo en la red.",
          "He creado un cómic digital con información correcta y sus fuentes.",
          "Cito las imágenes con su licencia e indico las generadas con IA.",
          "Verifico la información y las imágenes antes de compartirlas.",
          "Debato con respeto, sin ataques personales.",
          "Identifico beneficios y riesgos (personales, sociales y ambientales) de la IA generativa.",
          "Argumento con datos y fuentes."
        ]
      },
      {
        "tipo": "seccion",
        "titulo": "Valoración de la situación de aprendizaje"
      },
      {
        "tipo": "escala",
        "titulo": "¿Cuánto te ha gustado esta situación de aprendizaje?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Mucho"
        ]
      },
      {
        "tipo": "casillas",
        "titulo": "¿Qué te ha resultado más útil?",
        "opciones": [
          "El cómic",
          "La presentación del cómic",
          "Mi radiografía digital",
          "El foro Cazabulos",
          "El tribunal de casos",
          "El debate"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "¿Qué mejorarías?"
      }
    ],
    "sesiones": "Sesión 12"
  },
  {
    "id": "F6",
    "titulo": "Nos autoevaluamos en el debate",
    "anonimo": false,
    "descripcion": "Autoevaluación de tu ensayo del debate, adaptada de la plantilla «Nos autoevaluamos» de la «Guía para el debate académico en el aula» (Proyecto REA/DUA Andalucía). Recoge tu correo del centro para que el docente pueda ayudarte. Conoce tus puntos fuertes y trabaja para mejorar el resto.",
    "confirmacion": "¡Gracias! Aplica tu propuesta de mejora en el debate de la sesión 12.",
    "obligatorias": true,
    "preguntas": [
      {
        "tipo": "opcion",
        "titulo": "¿Qué rol tienes en el debate?",
        "opciones": [
          "Introductor/a",
          "Refutador/a 1",
          "Refutador/a 2",
          "Conclusor/a",
          "Moderador/a",
          "Cronometrador/a",
          "Relator/a-jurado"
        ]
      },
      {
        "tipo": "cuadricula",
        "titulo": "En el ensayo…",
        "filas": [
          "¿He definido claramente las palabras más importantes del tema?",
          "¿He expresado con precisión la tesis principal?",
          "¿He conectado los argumentos con el tema?",
          "¿He usado argumentos sólidos?",
          "¿He evitado los argumentos falsos y poco fundamentados?",
          "¿He hablado con buen tono, de forma pausada y tranquila?",
          "¿He mirado a mis interlocutores?",
          "¿Me he movido con naturalidad?",
          "¿Mis gestos han servido para apoyar mis palabras?"
        ],
        "columnas": [
          "✔ Sí",
          "✘ Todavía no"
        ]
      },
      {
        "tipo": "parrafo",
        "titulo": "Mi propuesta de mejora para el debate",
        "ayuda": "Elige una de las casillas que has marcado con ✘ y escribe qué harás para mejorarla."
      },
      {
        "tipo": "escala",
        "titulo": "¿Cómo de preparado/a te sientes para el debate?",
        "min": 1,
        "max": 5,
        "etiquetas": [
          "Nada",
          "Totalmente"
        ],
        "obligatoria": false
      }
    ],
    "sesiones": "Sesión 11"
  }
];

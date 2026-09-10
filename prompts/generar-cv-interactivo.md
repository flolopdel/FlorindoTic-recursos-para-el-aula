Actúa como un desarrollador web Senior y diseñador instruccional/pedagógico experto en normativa educativa (LOMLOE / currículos autonómicos o nacionales).

Tu objetivo es crear una aplicación web SPA (Single Page Application) interactiva, moderna y completamente autocontenida en UN SOLO ARCHIVO HTML (`index.html`) a partir del documento o PDF de referencia adjunto.

---

### 1. TECNOLOGÍAS Y ESTILO
- **Formato:** Archivo único `.html` que integre HTML5, CSS (vía CDN de Tailwind CSS) y JavaScript Vanilla.
- **Librerías externas (vía CDN):**
  - Tailwind CSS (`https://cdn.tailwindcss.com`)
  - FontAwesome v6 (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`)
  - Tipografía 'Inter' de Google Fonts.
- **Diseño:** Limpio, profesional, responsivo (Mobile-first), con bordes redondeados (`rounded-2xl`), sombras suaves, paleta de colores acorde a la disciplina y transiciones fluidas.

---

### 2. ESTRUCTURA Y NAVEGACIÓN (TABS / PESTAÑAS)

La aplicación debe contar con un **Header fijo** (con título de la asignatura, contexto/ley, botón de "Imprimir/PDF" y botón de "Restablecer filtros") y un menú superior de **5 pestañas principales**:

#### Pestaña 1: Matriz Curricular
- Visualización jerárquica de las **Competencias Específicas** de la materia.
- Cada Competencia Específica debe mostrar:
  - Identificador y título corto.
  - Descripción oficial.
  - Badges/etiquetas con los **Descriptores Operativos del Perfil de Salida** asociados (ej. STEM1, CD3, CPSAA4, etc.).
  - Tarjetas con sus **Criterios de Evaluación** correspondientes.
  - Cada criterio de evaluación debe mostrar badges clicables con los códigos de los **Saberes Básicos** que desarrolla.

#### Pestaña 2: Mapa de Saberes Básicos
- Organización en tarjetas por **Bloques Temáticos (A, B, C, D...)**.
- Cada bloque con una paleta cromática distintiva (colores pastel/sky/teal/purple/emerald/amber/indigo/etc.).
- Cada tarjeta debe incluir el listado de saberes del bloque con su código (ej. MAT.1.A.1) y descripción completa.
- Al hacer clic en cualquier saber, se debe abrir un **Modal Detallado**.

#### Pestaña 3: Relación Cruzada (Matriz Tabular)
- Tabla completa que conecte en columnas:
  1. Competencia Específica.
  2. Criterio de Evaluación (Código).
  3. Descripción del Criterio.
  4. Saberes Básicos relacionados (badges interactivos).
- Permite una lectura panorámica e integrada de todo el currículo.

#### Pestaña 4: Diseñador de Situaciones de Aprendizaje (SDA)
- **Panel Izquierdo (Configuración):**
  - Campos de entrada: Título de la SDA, Producto Final/Reto, Temporalización y Justificación/Contexto.
  - Selector interactivo con checkboxes agrupados por Competencia para marcar los **Criterios de Evaluación** trabajados en la SDA.
- **Panel Derecho (Cálculo y Mapeo Automático):**
  - Mapeo en tiempo real de las Competencias Específicas seleccionadas.
  - Cálculo automático de los Descriptores del Perfil de Salida activados.
  - Listado automático agrupado de todos los Saberes Básicos requeridos.
- **Botones de Acción:**
  - "Limpiar formulario".
  - "Copiar borrador a portapapeles".
  - "Diseñar Secuencia Didáctica con IA (Gemini API / Prompt Integrado)": Botón interactivo que envíe los criterios y saberes seleccionados a la API de Gemini o genere una propuesta pedagógica estructurada (Fases, Actividades, Evaluación, Medidas DUA) desplegada en un box resultado.

#### Pestaña 5: Justificación & Métodos
- Resumen del enfoque pedagógico de la materia (Justificación curricular).
- Orientaciones metodológicas específicas (ej. ABP, Cultura Maker, Aprendizaje Basado en Indagación, DUA, Perspectiva de Género, Evaluación Formativa).

---

### 3. CONTROLES Y FILTROS DINÁMICOS
Ubicados debajo de las pestañas y visibles en las vistas que lo requieran:
1. **Buscador global por texto:** Filtra criterios, saberes o términos en tiempo real.
2. **Filtro por Competencia Específica:** Desplegable (`<select>`) para aislar una competencia.
3. **Filtro por Bloque de Saberes:** Desplegable (`<select>`) para filtrar por bloque (A-I u otros).
4. **Filtro por Descriptor Clave:** Desplegable (`<select>`) para filtrar por descriptores del perfil (STEM, CD, CPSAA, CCL, CC, etc.).
5. **Barra de estado:** Muestra el número de resultados/criterios visibles y chips dinámicos con los filtros activos.

---

### 4. MODAL INTERACTIVO DE DETALLE
Un diálogo modal emergente (`#detail-modal`) al hacer clic en cualquier saber básico que muestre:
- Código y título del saber.
- Bloque temático al que pertenece.
- Descripción completa del saber.
- Lista desplegada con todos los Criterios de Evaluación y Competencias que lo vinculan.

---

### 5. DATOS A EXTRAER DEL DOCUMENTO ADJUNTO
Extrae rigurosamente del texto/PDF proporcionado las siguientes estructuras en JavaScript (`const`):
1. `SABERES_BASICOS`: Objeto indexado por Bloque (letra y nombre), conteniendo el código y la descripción de cada saber.
2. `COMPETENCIAS_ESPECIFICAS`: Array de objetos conteniendo:
   - `id`: Número o identificador.
   - `title` / `shortTitle`: Título oficial y título corto descriptivo.
   - `description`: Texto explicativo de la competencia.
   - `descriptors`: Array de descriptores clave (ej. `["STEM1", "CD3"]`).
   - `criterios`: Array de objetos con `code` (ej. "1.1"), `description` y `saberes` (array de códigos de saberes asociados).

---

### Adjunto pdf de referencia a procesar:

# Aula TIC de Florindo — instrucciones para agentes

Web estática de recursos de clase (Informática/Tecnología, ESO, Andalucía) publicada en
**https://florindotic.es** con GitHub Pages. El menú, las portadas y el buscador se generan solos a partir
de las carpetas de `content/`: **nunca se editan a mano** `menu.json` ni los `_pagina.html`.

## Estructura (no cambiar sin preguntar)

```
content/
  curso2026-2027/                    # un curso académico = cursoAAAA-AAAA (meta.json con "current": true)
    <asignatura>/                    # tecnologia-y-digitalizacion · digitalizacion · tecnologia · computacion-y-robotica
      <curso>/                       # 1-eso, 2-eso, 3-eso, 4-eso
        sda<N>/                      # una carpeta por situación de aprendizaje
          clase.html                 # web de clase (se proyecta y es lo que enlaza Moodle)
          guia-profesorado.html      # documento de la SdA        ┐ grupo «Docente»
          moodle.html                # bloque para pegar en Moodle ┘ del menú
          sda<N>.json                # datos de la SdA (de aquí sale el título del menú)
          Codigo.gs                  # crea los Google Forms (solo si la SdA tiene formularios)
          guia-alumnado.html         # opcional
          teoria.html                # opcional
          sesiones/                  # opcional: páginas de sesiones concretas
        programacion.html, cv_interactivo_*.html …
      comunes/                       # material compartido por varios cursos de la asignatura
```

- Nombres de archivo y carpeta en **minúsculas, sin tildes ni espacios, con guiones** (`ficha-escalas.pdf`).
- Las SdA se generan con la skill **sda-andalucia-tecnologia**, que publica con esos nombres fijos en una rama
  `sda/<asignatura>-<curso>-sda<N>` y abre una Pull Request. **No hagas push a `main` ni fusiones PR**: las
  fusiona el docente.

## No romper enlaces (Moodle enlaza estas páginas)

- **Nunca borres ni renombres** una página publicada sin dejar una redirección en el nombre antiguo.
  Plantilla (cambia `clase.html` por el destino):

  ```html
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="florindotic:redirect" content="clase.html">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=clase.html">
    <link rel="canonical" href="clase.html">
    <title>Este material se ha movido</title>
    <script>location.replace('clase.html' + location.search + location.hash);</script>
  </head>
  <body><p>Este material se ha movido. <a href="clase.html">Ábrelo aquí</a>.</p></body>
  </html>
  ```

  Las páginas con `florindotic:redirect` no salen en el menú, el buscador ni el sitemap.
- `clase.html` **se queda siempre en la raíz de `sda<N>/`**: es la dirección que tiene Moodle.
- Un PDF no admite redirección: si se renombra, se deja también la copia con el nombre antiguo.
- Redirecciones existentes: en `sda1/` → `index.html`, `presentacion.html`; en `sda2/` de DIG 4.º, TYD 3.º y
  TEC 4.º → `1-guia-profesorado.html`, `2-guia-alumnado.html`, `3-presentacion.html`, `4-teoria.html`.
  PDF con nombre antiguo que se conservan en `sda1/`: los que tienen espacios (sus copias limpias son
  `sda1-guia-alumnado.pdf` y `sda1-guia-profesorado.pdf`).

## Menú (scripts/build-menu.mjs)

- Título de cada carpeta: `meta.json` (`title`, `description`, `current`, `hidden`) → si no, `meta.titulo` y
  `meta.subtitulo` de `sda<N>.json` → si no, el nombre de la carpeta embellecido. Si hay `meta.json` o
  `sda<N>.json`, se genera una portada `_pagina.html`.
- `"hidden": true` en un `meta.json` oculta esa carpeta del menú (se publica igual).
- Dentro de una SdA: `clase.html` primero, luego lo del alumnado, `sesiones/` y al final el grupo
  **Docente** (`guia-profesorado.html` y `moodle.html`).
- Etiquetas especiales de archivos: `EXACT_LABELS` en el script.

## Enlaces a Google Drive

- En las páginas del alumnado, los Google Docs/Hojas/Presentaciones se enlazan con `/preview` (ver) y
  `/copy` (copiar a su Drive), nunca con `/edit`. La web de clase lo hace sola: cualquier `enlace` de Docs
  en `sda<N>.json` se muestra como dos botones, **Ver anexo** y **Copiar a mi Drive**.
- Los documentos se comparten con el alumnado como **Lector**.

## Marcas de sesión (por dónde va cada grupo)

- `js/marcas-sesion.js` muestra en las guías del profesorado qué grupo va por cada sesión. Los datos están en
  una hoja de Google, a través de la aplicación web de `scripts/marcas-sesion.gs` (allí están los pasos para
  instalarla); su URL `/exec` va en `ENDPOINT`.
- `scripts/build-site.mjs` añade el script a cada `guia-profesorado.html` al publicar: no se escribe en las guías.
- Las marcas se leen sin clave: solo deben llevar el grupo, nunca datos personales del alumnado.
- Las claves para editar (`CLAVE` y `CLAVE_FACIL`) están en las propiedades del script de Apps Script. El
  repositorio es público: nunca se escriben en él.

## Material para imprimir

Los campos `imprimir` e `imprimir_nota` de `sda<N>.json` generan en la guía el recordatorio «prepara estas
copias» y el aviso «Imprimir para esta sesión». La plantilla de la skill aún no los incluye: al regenerar una
guía que los use, hay que volver a añadir `impRow`, `impTable` y las dos líneas que los pintan.

## Copia de Moodle de cada SdA (`scripts/sda-mbz.py`)

`python scripts/sda-mbz.py <carpeta>/sda<N>.json <carpeta>/moodle.html sda<N>-moodle.mbz [--tema T]` genera, sin necesidad
de un Moodle, una copia de curso (formato Moodle 4.1, se restaura en 4.1 o posterior) con **una sección propia de la SdA**:
se llama como la SdA (`meta.titulo`, p. ej. «SdA 2: Código en Acción…»), lleva el bloque `moodle.html` como descripción
de la sección y dentro todas las Tareas de la SdA: ocultas, sin fechas, con su descripción, la escala «Apto / No apto» o
la rúbrica 1-3-5-7-10. No lleva foro de avisos, usuarios ni grupos. Se restaura con «Fusionar la copia de seguridad con
este curso» y sin sobrescribir la configuración del curso. La copia no se sube a `content/` (ver abajo dónde se descarga).

Moodle coloca la sección por su número, que por defecto es el de la SdA (tema N). Si ese tema no existe, se crea (y los
que falten antes, vacíos); si existe vacío, toma el nombre y el bloque; si ya tiene nombre o descripción, los conserva y
solo añade las Tareas. Para usar otro tema (el siguiente libre del curso, por ejemplo) se genera con `--tema T` o se
pone `"tema": T` en el bloque `moodle` de `sda<N>.json`.

La descripción de cada Tarea lleva al final (antes de «Cómo se entrega», si lo tiene) los **documentos** que usa: las
plantillas de `anexos.plantillas` con `enlace` cuya `entrega` nombra la Tarea («las Tareas 2.4, 2.5 y 2.8») o que la
Tarea cita por su código («plantilla A4»). Los Google Docs se enlazan con «Ver» (`/preview`) y «Copiar a mi Drive»
(`/copy`), solo «Ver» si la Tarea se entrega en papel; un PDF de Drive, con `/view`.

**Las copias las genera GitHub** (`.github/workflows/copias-moodle.yml`, con `scripts/sda-mbz-todas.py`): en cada PR
que toca una SdA se adjuntan las de esas SdA y se enlazan en un comentario; al fusionar en `main` se regeneran todas en
la publicación **«Copias de Moodle»** (`releases/tag/copias-moodle`), sustituyendo las anteriores. No se guardan en el
repositorio ni se editan a mano.

## Comprobar antes de abrir una PR

```bash
node scripts/build-site.mjs --out=/tmp/_site --base-url=https://florindotic.es/ --strict   # enlaces rotos
node scripts/revisar-pr.mjs --base=origin/main                                            # estructura de las SdA
```

En cada PR, la Action publica un comentario con las páginas cambiadas (con su dirección) y la revisión de
las SdA, y la marca en rojo si falta algo. Solo se despliega desde `main`.

## Qué se publica

Solo `index.html`, `bienvenida.html`, `menu.json`, `css/`, `js/`, `assets/` y `content/`. `prompts/` y
`scripts/` no se publican; `private_content/` está en `.gitignore` (material privado solo en local).

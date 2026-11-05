#!/usr/bin/env python3
"""Sube las copias de Moodle a una carpeta de Google Drive, a través de scripts/copias-drive.gs (lo usa la Action).

Uso:
  python scripts/subir-copias-drive.py <carpeta con los .mbz> <huellas.json>

La URL y la clave se leen de COPIAS_DRIVE_URL y COPIAS_DRIVE_CLAVE. Si faltan, avisa y termina sin error: la subida a
Drive es opcional y las copias ya están en la publicación de GitHub.

Solo sube las copias cuya huella (ver --huellas en sda-mbz-todas.py) no coincide con la de Drive, y al final envía a
la papelera las de SdA que ya no existen.
"""
import base64, json, os, sys, time, urllib.error, urllib.request

REINTENTOS = 3


def llamar(url, datos):
    cuerpo = json.dumps(datos).encode('utf-8')
    for intento in range(1, REINTENTOS + 1):
        try:
            # Apps Script responde con una redirección: urllib la sigue con un GET, como hace falta.
            peticion = urllib.request.Request(url, data=cuerpo, headers={'Content-Type': 'text/plain;charset=utf-8'})
            with urllib.request.urlopen(peticion, timeout=120) as r:
                respuesta = json.loads(r.read().decode('utf-8'))
        except (urllib.error.URLError, TimeoutError, ValueError) as e:
            if intento == REINTENTOS:
                # Sin el detalle de la petición: contiene la clave.
                raise RuntimeError(f'sin respuesta válida del servidor ({type(e).__name__})') from None
            time.sleep(5 * intento)
            continue
        if not respuesta.get('ok'):
            raise RuntimeError(f'el servidor lo ha rechazado: {respuesta.get("error")}')
        return respuesta
    raise AssertionError('inalcanzable')


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    carpeta, ruta_huellas = sys.argv[1:]
    url, clave = os.environ.get('COPIAS_DRIVE_URL'), os.environ.get('COPIAS_DRIVE_CLAVE')
    if not url or not clave:
        print('::notice::Subida a Drive sin configurar (faltan los secretos COPIAS_DRIVE_URL y COPIAS_DRIVE_CLAVE). '
              'Las copias están en la publicación de GitHub.')
        return 0

    with open(ruta_huellas, encoding='utf-8') as f:
        huellas = json.load(f)
    if not huellas:
        print('::error::No hay copias que subir: no se toca la carpeta de Drive.')
        return 1

    try:
        en_drive = llamar(url, {'accion': 'lista', 'clave': clave})['archivos']
    except RuntimeError as e:
        print(f'::error::No se puede acceder a la carpeta de Drive: {e}')
        return 1

    subidas, errores = 0, 0
    for nombre, huella in sorted(huellas.items()):
        if en_drive.get(nombre) == huella:
            continue
        try:
            with open(os.path.join(carpeta, nombre), 'rb') as f:
                contenido = base64.b64encode(f.read()).decode('ascii')
            llamar(url, {'accion': 'subir', 'clave': clave, 'nombre': nombre, 'huella': huella, 'contenido': contenido})
            subidas += 1
            print('Subida:', nombre)
        except (RuntimeError, OSError) as e:
            errores += 1
            print(f'::error::{nombre}: {e}')

    quitadas = []
    if not errores:
        try:
            quitadas = llamar(url, {'accion': 'limpiar', 'clave': clave, 'nombres': sorted(huellas)})['quitados']
        except RuntimeError as e:
            errores += 1
            print(f'::error::No se han podido retirar las copias antiguas: {e}')

    resumen = f'Drive: {subidas} subidas, {len(huellas) - subidas - errores} sin cambios, {len(quitadas)} a la papelera, {errores} con error'
    print(resumen)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(f'\n{resumen}\n')
    return 1 if errores else 0


if __name__ == '__main__':
    sys.exit(main())

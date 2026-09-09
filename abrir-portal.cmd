@echo off
setlocal
cd /d "%~dp0"

echo Regenerando el menu...
node scripts\build-menu.mjs
if errorlevel 1 (
  echo.
  echo No se pudo regenerar el menu.
  pause
  exit /b 1
)

echo Iniciando el portal local en http://localhost:8000 ...
start "Portal local" py -m http.server 8000
start "" http://localhost:8000

echo.
echo El portal esta abierto en el navegador.
echo Para detener el servidor, cierra la ventana "Portal local".
endlocal

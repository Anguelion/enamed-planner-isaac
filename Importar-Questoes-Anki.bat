@echo off
setlocal
if "%~1"=="" (
  echo Arraste um arquivo .apkg para cima deste atalho.
  echo.
  pause
  exit /b 1
)
set "IMPORT_ERROR=0"
for %%F in (%*) do (
  echo Importando: %%~nxF
  python "%~dp0scripts\import-anki-apkg.py" "%%~fF"
  if errorlevel 1 set "IMPORT_ERROR=1"
)
if "%IMPORT_ERROR%"=="1" (
  echo.
  echo Uma das importacoes encontrou um erro. Os arquivos originais nao foram alterados.
) else (
  echo.
  echo Importacao concluida. Abra novamente o planner para ver as questoes.
)
echo.
pause

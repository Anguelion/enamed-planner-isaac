@echo off
setlocal
if "%~1"=="" (
  echo Arraste um arquivo .apkg para cima deste atalho.
  echo.
  pause
  exit /b 1
)
python "%~dp0scripts\import-anki-apkg.py" "%~1"
if errorlevel 1 (
  echo.
  echo A importacao encontrou um erro. O arquivo original nao foi alterado.
) else (
  echo.
  echo Importacao concluida. Abra novamente o planner para ver as questoes.
)
echo.
pause

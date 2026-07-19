@echo off
chcp 65001 >nul
title SoqueroMed - servidor local (Radiografia)

REM Usa a propria pasta do .bat como raiz (evita problemas com acentos no caminho)
cd /d "%~dp0"

echo ============================================================
echo   SoqueroMed - servidor local
echo   Pasta: %cd%
echo   URL:   http://localhost:8794/index.html#/radiografia
echo ------------------------------------------------------------
echo   Deixe esta janela ABERTA enquanto usa o planner.
echo   Para encerrar o servidor: feche esta janela.
echo ============================================================
echo.

REM Abre o navegador na aba Radiografia (apos 2s, ja com o servidor no ar)
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8794/index.html#/radiografia"

REM Sobe o servidor estatico nesta pasta (mantem a janela viva)
py -3 -m http.server 8794

REM Se o Python nao estiver disponivel, avisa e nao fecha a janela
if errorlevel 1 (
  echo.
  echo [ERRO] Nao consegui iniciar o servidor com "py -3".
  echo Verifique se o Python esta instalado.
  pause
)

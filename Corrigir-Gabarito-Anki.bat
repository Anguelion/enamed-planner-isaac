@echo off
setlocal
pythonw "%~dp0scripts\corrigir-gabarito-anki.py"
if errorlevel 1 python "%~dp0scripts\corrigir-gabarito-anki.py"

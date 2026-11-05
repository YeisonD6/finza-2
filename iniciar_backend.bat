@echo off
title Finza Backend (Puerto 8000)
cd /d "%~dp0backend"
echo ========================================================
echo Iniciando Servidor Finza Backend en http://0.0.0.0:8000
echo NO CIERRES ESTA VENTANA mientras uses la app movil.
echo ========================================================
echo.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause

@echo off
cd /d "%~dp0"
echo Ash and Aether / Reconciled Living World Lab
start "" http://localhost:8000/
py -m http.server 8000
pause

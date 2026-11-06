@echo off
cd /d "%~dp0"
echo Starting A^&A Acoustic World v2 on http://localhost:8765/playable.html
start "A^&A Local Server" cmd /k "py -3 -m http.server 8765"
timeout /t 2 /nobreak >nul
start "" http://localhost:8765/playable.html

@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PHP=php
if exist "C:\xampp\php\php.exe" set PHP=C:\xampp\php\php.exe

echo  Iniciando a API (porta 8000) e o tempo real (porta 8080)...
echo  Para parar, feche as duas janelas que vao abrir.

start "GastroTech - API" "%PHP%" artisan serve --port=8000
start "GastroTech - Tempo real" "%PHP%" artisan reverb:start --port=8080

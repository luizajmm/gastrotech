@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PHP=php
if exist "C:\xampp\php\php.exe" set PHP=C:\xampp\php\php.exe

echo  API rodando em http://127.0.0.1:8000 (feche esta janela para parar)
"%PHP%" artisan serve --port=8000

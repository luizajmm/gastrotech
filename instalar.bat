@echo off
chcp 65001 >nul
title GastroTech - Instalacao
cd /d "%~dp0"

rem Usa o PHP do XAMPP se existir; senao, o PHP do PATH.
set PHP=php
if exist "C:\xampp\php\php.exe" set PHP=C:\xampp\php\php.exe

echo.
echo  ==== GastroTech: instalacao da API ====
echo  Antes de continuar: MySQL ligado no XAMPP e banco "gastrotech" criado no phpMyAdmin.
echo.
pause

call composer install || goto erro
if not exist .env copy .env.example .env
"%PHP%" artisan key:generate || goto erro
"%PHP%" artisan migrate:fresh --seed --force || goto erro

echo.
echo  Pronto! Agora rode o arquivo iniciar.bat
pause
exit /b 0

:erro
echo.
echo  Algo deu errado. Veja a mensagem acima e a secao "Problemas comuns" do README.
pause
exit /b 1

@echo off
title Atelier Cils Paris - Serveur

echo ================================
echo   ATELIER CILS PARIS
echo   Demarrage du site...
echo ================================
echo.

cd /d "%~dp0"

echo [1/2] Demarrage du serveur Next.js sur le port 3000...
start "Site Next.js" cmd /k "npm run start"

echo [2/2] En attente du demarrage (5 secondes)...
timeout /t 5 /nobreak >nul

echo.
echo ================================
echo   Serveur demarre !
echo   Acces local : http://localhost:3000
echo ================================
echo.
echo Laisse cette fenetre ouverte tant que le site doit etre accessible.
pause

@echo off
title Atelier Cils Paris - Deploiement
cd /d "C:\Users\2596535\Desktop\Siteweb\Siteweb"

echo [1/4] Arret du site...
pm2 stop atelier-cils-site

echo [2/4] Build de production...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo ERREUR: Build echoue. Redemarrage de l'ancienne version...
  pm2 start atelier-cils-site
  pause
  exit /b 1
)

echo [3/4] Copie des fichiers statiques...
xcopy /E /I /Y public .next\standalone\public >nul
xcopy /E /I /Y .next\static .next\standalone\.next\static >nul

echo [4/4] Redemarrage du site...
pm2 start atelier-cils-site
pm2 save

echo.
echo Deploiement termine avec succes !
pm2 status
pause

@echo off
title Atelier Cils Paris - Demarrage
cd /d "C:\Users\2596535\Desktop\Siteweb\Siteweb"

echo Demarrage des services Atelier Cils Paris...

:: Attendre que le réseau soit prêt
timeout /t 5 /nobreak >nul

:: Démarrer PM2 avec tous les services
pm2 start ecosystem.config.js

echo Services demarres. Ferme cette fenetre.
timeout /t 3 /nobreak >nul

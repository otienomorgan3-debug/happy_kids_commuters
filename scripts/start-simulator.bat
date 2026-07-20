@echo off
echo ========================================
echo   HKCS Bus Movement Simulator
echo ========================================
echo.
echo Make sure the backend is running first!
echo.
cd /d "%~dp0..\backend"
node bus-simulator.js
pause
@echo off
REM Atalho para enviar Flow ERP para o GitHub
REM Chama o script PowerShell principal

echo.
echo ========================================
echo   ENVIAR FLOW ERP PARA O GITHUB
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0enviar-para-github.ps1"

pause

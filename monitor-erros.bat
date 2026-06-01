@echo off
:: 🔍 Flow ERP - Monitor de Erros (Clique Duplo)
powershell.exe -ExecutionPolicy Bypass -File "%~dp0monitor-erros.ps1" -Continuous

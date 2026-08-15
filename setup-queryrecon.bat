@echo off
setlocal
title QueryRecon one-click setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-queryrecon.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Read the error above, then run this file again.
  pause
)

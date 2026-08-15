@echo off
setlocal
title Repair QueryRecon Hermes Workspace
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\repair-hermes-workspace.ps1"
if errorlevel 1 pause

@echo off
setlocal
title QueryRecon Hermes CLI
node "%~dp0cli\queryrecon-cli.mjs" %*
if errorlevel 1 pause

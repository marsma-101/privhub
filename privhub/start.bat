@echo off
title PrivHub Launcher (dev 3180 / prod 3181)
REM ============================================================
REM   PrivHub launcher (pure Cordis mode)
REM   Base: @deepseek-ai/cordis (npm dependency, ~12MB)
REM   Usage: start.bat            -> dev 3180
REM          start.bat 3181       -> prod 3181
REM ============================================================
cd /d "%~dp0"

REM ---- env (do not remove: data paths are anchored here) ----
set "PRIVHUB_ROOT=%~dp0"
set "PRIVHUB_PORT=3180"
if not "%1"=="" set "PRIVHUB_PORT=%1"

echo ============================================
echo   PrivHub starting [port %PRIVHUB_PORT%]
echo   Local:    http://127.0.0.1:%PRIVHUB_PORT%
echo   LAN:      http://^<this-host-IP^>:%PRIVHUB_PORT%
echo ============================================

node --import tsx/esm src/main.ts --port %PRIVHUB_PORT%

echo.
echo Service stopped, exit code %errorlevel%
pause

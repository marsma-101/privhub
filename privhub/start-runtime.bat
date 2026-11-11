@echo off
REM ============================================================
REM  PrivHub blue-green runtime launcher (stable layer)
REM
REM  Foreground launcher for runtime/control.mjs:
REM    - nginx public entry (default 3181)
REM    - two slots on 127.0.0.1:3301/3302
REM    - zero-downtime switch / rollback / update support
REM
REM  ASCII-only by design: cmd.exe mis-decodes UTF-8 .bat text.
REM  First run:  scripts\fetch-nginx.ps1  +  node scripts\build-release.mjs
REM ============================================================
title PrivHub Runtime (blue-green)
cd /d "%~dp0"

if not exist "runtime\control.mjs" (
  echo [runtime] runtime\control.mjs not found.
  pause
  exit /b 1
)

REM Standalone bundles ship their own Node in runtime\node\node.exe.
REM Child processes (slots + updater) inherit process.execPath, so they use it too.
set "NODE=node"
if exist "runtime\node\node.exe" set "NODE=runtime\node\node.exe"
"%NODE%" --version >nul 2>&1
if errorlevel 1 (
  echo [runtime] Node.js not found.
  echo [runtime] install Node.js 20+ and put it on PATH, or ship runtime\node\node.exe
  pause
  exit /b 1
)

if not exist "runtime\nginx\nginx.exe" (
  echo [runtime] nginx is not installed yet.
  echo [runtime] run: powershell -ExecutionPolicy Bypass -File scripts\fetch-nginx.ps1
  pause
  exit /b 1
)

echo ============================================
echo   PrivHub runtime starting
echo   Public entry: http://^<this-host-IP^>:3181
echo   Slots:        127.0.0.1:3301 / 3302
echo   Status:       "%NODE%" runtime\control.mjs status
echo ============================================

"%NODE%" runtime\control.mjs serve

echo.
echo Runtime stopped, exit code %errorlevel%
pause

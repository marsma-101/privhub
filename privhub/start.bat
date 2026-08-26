@echo off
chcp 65001 >nul
title 私域枢纽 PrivHub - 后端服务

REM ============================================================
REM  私域枢纽（PrivHub）启动脚本
REM  双击本文件即可启动后端服务，启动后浏览器访问：
REM    本机:    http://127.0.0.1:3181
REM    局域网:  http://<本机IP>:3181
REM  生产端口：3181
REM ============================================================

REM 进入脚本所在目录（保证相对路径正确）
cd /d "%~dp0"

REM 设置环境变量
set DSH_HOME=%~dp0home
set PRIVHUB_FRONTEND_DIR=%~dp0privhub-app\frontend

echo.
echo ============================================
echo   私域枢纽 PrivHub 正在启动...
echo   端口: 3181
echo   本机访问: http://127.0.0.1:3181
echo ============================================
echo.

REM 启动（优先用 pnpm，回退到 npx）
where pnpm >nul 2>nul
if %errorlevel%==0 (
  pnpm dsh --profile privhub --port 3181 --host 0.0.0.0
) else (
  echo [警告] 未检测到 pnpm，尝试 npx ...
  npx @deepseek-ai/dsh --profile privhub --port 3181 --host 0.0.0.0
)

echo.
echo 服务已停止。
pause

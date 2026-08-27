@echo off
title 私域枢纽 PrivHub - 后端服务

REM ============================================================
REM  私域枢纽（PrivHub）启动脚本
REM  双击本文件即可启动后端服务，启动后浏览器访问：
REM    本机:    http://127.0.0.1:3180
REM    局域网:  http://<本机IP>:3180
REM  本目录是开发环境：端口固定 3180（生产 3181 见 privhub-work/）
REM ============================================================

REM 进入脚本所在目录（保证相对路径正确）
cd /d "%~dp0"

REM 设置环境变量（指向项目根下的 home 与前端）
REM PRIVHUB_ROOT 锚定项目根：账号/会话/文件存储不再跟随进程 cwd，
REM 因此即使本脚本在 engine/ 内启动，也不会把数据写进引擎目录。
set "PRIVHUB_ROOT=%~dp0"
set DSH_HOME=%~dp0home
set PRIVHUB_FRONTEND_DIR=%~dp0privhub-app\frontend

echo.
echo ============================================
echo   私域枢纽 PrivHub 正在启动...
echo   端口: 3180
echo   本机访问: http://127.0.0.1:3180
echo ============================================
echo.

REM 进入引擎目录（DSH CLI 在 engine/ 下），在其内启动
cd /d "%~dp0engine"

REM 启动（优先用 pnpm，回退到 npx）
where pnpm >nul 2>nul
if %errorlevel%==0 (
  pnpm dsh --profile privhub --port 3180 --host 0.0.0.0
) else (
  echo [警告] 未检测到 pnpm，尝试 npx ...
  npx @deepseek-ai/dsh --profile privhub --port 3180 --host 0.0.0.0
)

echo.
echo 服务已停止。
pause

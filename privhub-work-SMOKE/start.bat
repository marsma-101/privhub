@echo off
chcp 65001 >nul
title 私域枢纽 PrivHub - 启动器 (端口 3181)

REM 进入脚本所在目录（保证相对路径正确）
cd /d "%~dp0"

REM 选择 node：优先使用自带运行时，否则用系统 PATH 中的 node
set "NODE_BIN="
if exist "%~dp0node-runtime\node.exe" (
  set "NODE_BIN=%~dp0node-runtime\node.exe"
) else (
  set "NODE_BIN=node"
)

REM 环境变量：告诉底座去哪找 profile 与前端静态目录
set "DSH_HOME=%~dp0home"
set "PRIVHUB_FRONTEND_DIR=%~dp0privhub-app\frontend"
set "PRIVHUB_PORT=3181"

echo ============================================
echo   私域枢纽 PrivHub 启动中
echo   端口: %PRIVHUB_PORT%
echo   本机访问:   http://127.0.0.1:%PRIVHUB_PORT%
echo   局域网访问: http://^<本机IP^>:%PRIVHUB_PORT%
echo ============================================

REM 首次运行：若依赖未安装则自动安装（宿主机需联网）
if not exist "%~dp0node_modules\@deepseek-ai\dsh" (
  echo [信息] 未检测到依赖，正在安装（需要网络，使用 npm）...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络 / npm 源后重试。
    echo         若 @deepseek-ai/dsh* 底座包不在公共源，请配置内部源或本地包。
    pause
    exit /b 1
  )
)

REM 定位 dsh 入口：发布态为 lib/bin.js，源码态为 src/bin.ts（两者皆可被 tsx 加载）
set "DSH_BIN="
if exist "%~dp0node_modules\@deepseek-ai\dsh\lib\bin.js" (
  set "DSH_BIN=%~dp0node_modules\@deepseek-ai\dsh\lib\bin.js"
) else if exist "%~dp0node_modules\@deepseek-ai\dsh\src\bin.ts" (
  set "DSH_BIN=%~dp0node_modules\@deepseek-ai\dsh\src\bin.ts"
) else (
  echo [错误] 未找到 @deepseek-ai/dsh 入口，请先运行依赖安装。
  pause
  exit /b 1
)

REM 启动服务：tsx 负责加载 TypeScript 插件(privhub-server)
"%NODE_BIN%" --import tsx/esm "%DSH_BIN%" --profile privhub --port %PRIVHUB_PORT% --host 0.0.0.0

echo.
echo 服务已停止（退出码 %errorlevel%）。
pause

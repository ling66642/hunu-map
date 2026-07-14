@echo off
setlocal
chcp 65001 >nul

rem 始终从此 BAT 所在的项目目录运行
cd /d "%~dp0"

set "HOST=127.0.0.1"
set "PORT=5173"
set "PAGE=http://%HOST%:%PORT%/map.html"
set "LOG_FILE=.vite.log"

where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 npm，请先安装 Node.js。
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [提示] 正在安装项目依赖，请稍候……
    call npm install
    if errorlevel 1 (
        echo [错误] 项目依赖安装失败。
        pause
        exit /b 1
    )
)

rem 如果 5173 尚未监听，则在后台启动 Vite 开发服务器
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [提示] 正在启动校园地图服务……
    start "湖南师大校园地图服务" /min cmd /c "npx vite --host %HOST% --port %PORT% --strictPort ^> .vite.log 2^>^&1"
)

rem 最多等待 20 秒，确认页面可以访问
set /a WAIT_COUNT=0
:WAIT_FOR_SERVER
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%PAGE%' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto OPEN_PAGE

set /a WAIT_COUNT+=1
if %WAIT_COUNT% geq 20 goto START_FAILED
timeout /t 1 /nobreak >nul
goto WAIT_FOR_SERVER

:OPEN_PAGE
start "" "%PAGE%"
exit /b 0

:START_FAILED
echo [错误] 服务启动失败或等待超时。
echo 请查看日志：%LOG_FILE%
pause
exit /b 1

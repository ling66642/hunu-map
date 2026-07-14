@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ==========================================
echo           hunu-map 项目一键启动工具
echo ==========================================
echo.
echo 正在新窗口中启动 Vite 开发服务器...
start "Vite Dev Server" cmd /c "npm run dev"

echo 正在等待服务器初始化 (3秒)...
timeout /t 3 /nobreak > nul

echo.
echo 正在默认浏览器中打开项目网页...
start http://localhost:5173/map.html

echo.
echo 启动完成！本窗口将在 2 秒后自动关闭。
timeout /t 2 /nobreak > nul
exit

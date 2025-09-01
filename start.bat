@echo off
REM 激活 Conda 环境
call conda activate env3.10

REM 启动 Python HTTP 服务器，并在后台打开浏览器
start python -m http.server 8000

REM 等待 1 秒让服务器启动
timeout /t 1 /nobreak >nul

REM 打开默认浏览器访问 index.html
start http://localhost:8000/index.html

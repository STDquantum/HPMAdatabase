@echo off
cd /d "%~dp0"
call conda activate env3.10
if errorlevel 1 (
	echo Failed to activate Conda environment env3.10.
	pause
	exit /b 1
)
python -m http.server 410

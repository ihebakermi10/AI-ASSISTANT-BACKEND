@echo off
REM Start ngrok tunnel using environment variables
REM Reads NGROK_DOMAIN from .env file

echo Loading environment variables...
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#" ^| findstr /v "^$"') do (
    if "%%a"=="NGROK_DOMAIN" set NGROK_DOMAIN=%%b
    if "%%a"=="PORT" set PORT=%%b
)

if "%NGROK_DOMAIN%"=="" (
    echo ERROR: NGROK_DOMAIN not set in .env file
    echo Please add: NGROK_DOMAIN=your-domain.ngrok-free.dev
    pause
    exit /b 1
)

if "%PORT%"=="" set PORT=3000

echo.
echo Starting ngrok tunnel...
echo Domain: %NGROK_DOMAIN%
echo Local port: %PORT%
echo.

ngrok http 127.0.0.1:%PORT% --domain=%NGROK_DOMAIN%

@echo off
REM Full deployment script with environment variable support

echo ========================================
echo AI Assistant Backend - ngrok Deployment
echo ========================================
echo.

REM Load environment variables
echo Loading environment from .env...
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#" ^| findstr /v "^$"') do (
    if "%%a"=="NGROK_DOMAIN" set NGROK_DOMAIN=%%b
    if "%%a"=="PORT" set PORT=%%b
)

if "%NGROK_DOMAIN%"=="" (
    echo ERROR: NGROK_DOMAIN not configured in .env
    echo Please add: NGROK_DOMAIN=your-domain.ngrok-free.dev
    pause
    exit /b 1
)

if "%PORT%"=="" set PORT=3000

REM Check Docker containers
echo Checking Docker containers...
docker ps | findstr "ai-assistant-mongo" >nul
if %errorlevel% neq 0 (
    echo WARNING: MongoDB container not running
    echo Starting Docker containers...
    cd docker
    docker-compose up -d
    cd ..
    timeout /t 3 >nul
)

docker ps | findstr "ai-assistant-valkey" >nul
if %errorlevel% neq 0 (
    echo WARNING: Valkey container not running
    echo Starting Docker containers...
    cd docker
    docker-compose up -d
    cd ..
    timeout /t 3 >nul
)

echo Containers are running!
echo.

echo Starting backend server on port %PORT%...
start "AI Backend" cmd /k "npm run dev"

echo Waiting for backend to initialize...
timeout /t 5 >nul

echo.
echo Starting ngrok tunnel...
echo Domain: %NGROK_DOMAIN%
echo.
start "ngrok" cmd /k "ngrok http 127.0.0.1:%PORT% --domain=%NGROK_DOMAIN%"

timeout /t 2 >nul

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo Local URL:  http://localhost:%PORT%
echo Public URL: https://%NGROK_DOMAIN%
echo ngrok Dashboard: http://localhost:4040
echo.
echo Press any key to open ngrok dashboard...
pause >nul
start http://localhost:4040

exit /b 0

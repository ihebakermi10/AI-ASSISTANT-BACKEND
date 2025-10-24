@echo off
REM Quick restart script for staging deployment

echo ========================================
echo Restarting AI Assistant (Staging)
echo ========================================
echo.

echo Stopping containers...
docker-compose -f docker-compose.staging.yml down

echo.
echo Starting containers with updated code...
docker-compose -f docker-compose.staging.yml up -d --build

echo.
echo Waiting for services to be ready...
timeout /t 10 >nul

echo.
echo ========================================
echo Deployment restarted!
echo ========================================
echo.
echo Public URL: https://liana-uncompromising-sueann.ngrok-free.dev
echo Swagger Docs: https://liana-uncompromising-sueann.ngrok-free.dev/docs
echo.
echo Testing health endpoint...
curl https://liana-uncompromising-sueann.ngrok-free.dev/health

echo.
echo.
echo Make sure ngrok is running!
echo If not, run: scripts\deployment\ngrok-start.bat
echo.
pause

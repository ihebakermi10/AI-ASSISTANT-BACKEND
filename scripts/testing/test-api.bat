
@echo off
REM API Testing Script for AI Assistant Backend
REM Tests both local and ngrok endpoints

setlocal EnableDelayedExpansion

REM Load environment
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#" ^| findstr /v "^$"') do (
    if "%%a"=="NGROK_DOMAIN" set NGROK_DOMAIN=%%b
)

set BASE_URL=%1
if "%BASE_URL%"=="" set BASE_URL=http://localhost:3000

set NGROK_URL=https://%NGROK_DOMAIN%

echo =========================================
echo API Testing Script
echo =========================================
echo.
echo Testing URL: %BASE_URL%
echo.

REM Test 1: Health Check
echo Test 1: Health Check
echo ---------------------
curl -s "%BASE_URL%/health"
echo.
echo.

REM Test 2: Root Endpoint
echo Test 2: Root Endpoint
echo ---------------------
curl -s "%BASE_URL%/"
echo.
echo.

REM Test 3: Validation - Missing Query
echo Test 3: Validation - Missing Query
echo -----------------------------------
curl -s -X POST "%BASE_URL%/ask" -H "Content-Type: application/json" -d "{}"
echo.
echo.

REM Test 4: Simple Query
echo Test 4: Simple Query
echo --------------------
curl -s -X POST "%BASE_URL%/ask" -H "Content-Type: application/json" -d "{\"query\": \"Hello\"}"
echo.
echo.

REM Test 5: RAG Query
echo Test 5: RAG Query (Policy Question)
echo ------------------------------------
curl -s -X POST "%BASE_URL%/ask" -H "Content-Type: application/json" -d "{\"query\": \"What is the refund policy?\"}"
echo.
echo.

REM Test 6: Database Query
echo Test 6: Database Query (Orders)
echo --------------------------------
curl -s -X POST "%BASE_URL%/ask" -H "Content-Type: application/json" -d "{\"query\": \"Show me all orders\"}"
echo.
echo.

echo =========================================
echo Testing Complete
echo =========================================
echo.

if "%BASE_URL%"=="http://localhost:3000" (
    if not "%NGROK_DOMAIN%"=="" (
        echo To test via ngrok, run:
        echo scripts\testing\test-api.bat %NGROK_URL%
    )
)

pause

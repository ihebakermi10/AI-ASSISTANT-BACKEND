#!/bin/bash

# Full deployment script with environment variable support

echo "========================================"
echo "AI Assistant Backend - ngrok Deployment"
echo "========================================"
echo ""

# Load environment variables
echo "Loading environment from .env..."
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
    echo "ERROR: .env file not found"
    exit 1
fi

if [ -z "$NGROK_DOMAIN" ]; then
    echo "ERROR: NGROK_DOMAIN not configured in .env"
    echo "Please add: NGROK_DOMAIN=your-domain.ngrok-free.dev"
    exit 1
fi

PORT=${PORT:-3000}

# Check Docker containers
echo "Checking Docker containers..."
if ! docker ps | grep -q "ai-assistant-mongo"; then
    echo "WARNING: MongoDB container not running"
    echo "Starting Docker containers..."
    cd docker && docker-compose up -d && cd ..
    sleep 3
fi

if ! docker ps | grep -q "ai-assistant-valkey"; then
    echo "WARNING: Valkey container not running"
    echo "Starting Docker containers..."
    cd docker && docker-compose up -d && cd ..
    sleep 3
fi

echo "Containers are running!"
echo ""

echo "Starting backend server on port $PORT..."
npm run dev &
BACKEND_PID=$!

echo "Waiting for backend to initialize..."
sleep 5

echo ""
echo "Starting ngrok tunnel..."
echo "Domain: $NGROK_DOMAIN"
echo ""
ngrok http $PORT --domain=$NGROK_DOMAIN &
NGROK_PID=$!

sleep 2

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo "Local URL:  http://localhost:$PORT"
echo "Public URL: https://$NGROK_DOMAIN"
echo "ngrok Dashboard: http://localhost:4040"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "ngrok PID: $NGROK_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID $NGROK_PID 2>/dev/null
    echo "Services stopped"
    exit 0
}

trap cleanup INT TERM

# Keep script running
wait

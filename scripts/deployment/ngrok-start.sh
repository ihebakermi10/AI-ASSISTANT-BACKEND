#!/bin/bash

# Start ngrok tunnel using environment variables
# Reads NGROK_DOMAIN from .env file

echo "Loading environment variables from .env..."

# Source .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
    echo "ERROR: .env file not found"
    exit 1
fi

if [ -z "$NGROK_DOMAIN" ]; then
    echo "ERROR: NGROK_DOMAIN not set in .env file"
    echo "Please add: NGROK_DOMAIN=your-domain.ngrok-free.dev"
    exit 1
fi

PORT=${PORT:-3000}

echo ""
echo "Starting ngrok tunnel..."
echo "Domain: $NGROK_DOMAIN"
echo "Local port: $PORT"
echo ""

ngrok http $PORT --domain=$NGROK_DOMAIN

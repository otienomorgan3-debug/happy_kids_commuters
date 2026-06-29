#!/bin/bash
# Ngrok setup script for HKCS backend
# This exposes your local backend (port 5000) to the internet

echo "=========================================="
echo "HKCS Ngrok Setup"
echo "=========================================="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ Ngrok is not installed"
    echo ""
    echo "Install ngrok:"
    echo "1. Download from: https://ngrok.com/download"
    echo "2. Or use chocolatey: choco install ngrok"
    echo "3. Or use npm: npm install -g ngrok"
    echo ""
    echo "After installation, run: ngrok config add-authtoken YOUR_TOKEN"
    exit 1
fi

echo "✅ Ngrok is installed"
echo ""

# Check if backend is running
if ! curl -s http://localhost:5000 > /dev/null; then
    echo "⚠️  Backend doesn't seem to be running on port 5000"
    echo "   Start it first with: cd backend && npm start"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Starting ngrok tunnel on port 5000..."
echo ""
echo "=========================================="
echo "IMPORTANT:"
echo "=========================================="
echo "1. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)"
echo "2. Update your .env file with:"
echo "   MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/payments/mpesa/callback"
echo "3. Update any other webhook URLs in your configuration"
echo ""
echo "Press Ctrl+C to stop ngrok"
echo "=========================================="
echo ""

ngrok http 5000
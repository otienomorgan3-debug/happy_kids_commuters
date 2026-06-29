# Ngrok Setup Guide for HKCS

Ngrok exposes your local backend to the internet, allowing external services (like M-Pesa) to send callbacks to your local development environment.

## Prerequisites

1. **Backend running locally** on port 5000
2. **Ngrok account** (free tier works): https://ngrok.com/
3. **Ngrok installed** on your machine

## Installation

### Windows
```powershell
# Using Chocolatey
choco install ngrok

# Or using npm
npm install -g ngrok

# Or download from https://ngrok.com/download
```

### Mac/Linux
```bash
# Using Homebrew (Mac)
brew install ngrok

# Or using npm
npm install -g ngrok

# Or download from https://ngrok.com/download
```

## Setup Steps

### 1. Authenticate Ngrok
```bash
# Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### 2. Start Your Backend
```bash
cd backend
npm start
```

### 3. Start Ngrok
```bash
# Option A: Use the helper script
# Windows:
scripts\start-ngrok.bat

# Mac/Linux:
bash scripts/start-ngrok.sh

# Option B: Direct command
ngrok http 5000
```

### 4. Copy Your Ngrok URL
When ngrok starts, you'll see output like:
```
Session Status    online
Forwarding        https://abc123.ngrok.io -> http://localhost:5000
```

Copy the **HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### 5. Update Your .env File
```env
# Replace with your actual ngrok URL
MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/payments/mpesa/callback
```

### 6. Update M-Pesa Daraja Portal
1. Go to https://developer.safaricom.co.ke/
2. Navigate to your app settings
3. Update the callback URL to match your ngrok URL
4. Save changes

## Usage

### Starting Everything
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start ngrok
ngrok http 5000

# Terminal 3: Start frontend (if needed)
cd admin-dashboard
npm run dev
```

### Stopping Ngrok
Press `Ctrl+C` in the ngrok terminal

## Important Notes

### Free Tier Limitations
- URL changes every time you restart ngrok
- 4 hours per session limit
- Rate limits apply

### For Production
- Use a paid ngrok plan for reserved domains
- Or deploy to a cloud service (AWS, Heroku, Railway, etc.)
- Use environment variables for callback URLs

### Security
- Never commit ngrok URLs or authtokens to git
- Use `.env` files (already in `.gitignore`)
- Ngrok provides HTTPS by default

## Troubleshooting

### "Ngrok not found"
- Install ngrok using one of the methods above
- Restart your terminal

### "Backend not responding"
- Ensure backend is running on port 5000
- Check `backend/.env` has correct DB credentials
- Try `curl http://localhost:5000` to verify

### "M-Pesa callbacks not working"
- Verify callback URL in Daraja portal matches ngrok URL
- Check ngrok web interface at http://127.0.0.1:4040
- Ensure backend is running and accessible
- Check backend logs for incoming requests

### "Connection refused"
- Make sure backend is running before starting ngrok
- Check firewall settings
- Verify port 5000 is not blocked

## Ngrok Web Interface
View incoming requests at: http://127.0.0.1:4040

This shows:
- All HTTP requests to your ngrok URL
- Request/response headers
- Request body
- Useful for debugging M-Pesa callbacks

## Alternative: LocalTunnel
If ngrok doesn't work, try LocalTunnel:
```bash
npm install -g localtunnel
lt --port 5000
```

## Quick Reference

| Task | Command |
|------|---------|
| Start backend | `cd backend && npm start` |
| Start ngrok | `ngrok http 5000` |
| View requests | http://127.0.0.1:4040 |
| Stop ngrok | `Ctrl+C` |
| Update authtoken | `ngrok config add-authtoken TOKEN` |
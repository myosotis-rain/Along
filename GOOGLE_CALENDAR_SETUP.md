# Google Calendar Integration Setup

## Quick Setup (5 minutes)

### 1. Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing one
3. Enable **Google Calendar API**: APIs & Services → Library → Search "Google Calendar API" → Enable

### 2. OAuth Setup
1. **Consent Screen**: APIs & Services → OAuth consent screen
   - User type: "External"
   - App name: "Along Web"
   - User support email: your email
   - Add scopes: `calendar.events` and `calendar.readonly`
   - Add test users: your email

2. **Create Credentials**: APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client IDs
   - Application type: "Web application"
   - Name: "Along Web Client"
   - Authorized redirect URIs: `http://localhost:3000/api/gcal/callback`
   - **Save the Client ID and Client Secret**

### 3. Update Environment Variables

Your Client ID is already set. Just add the **Client Secret**:

```bash
# In .env.local - update this line with your actual secret:
GOOGLE_CLIENT_SECRET=GOCSPX-your_actual_client_secret_here
```

### 4. Get Your Client Secret
1. In Google Cloud Console → APIs & Services → Credentials
2. Click the pencil icon next to your OAuth client
3. Copy the **Client secret** (starts with `GOCSPX-`)
4. Paste it in `.env.local`
5. Restart server: `npm run dev`

### 5. Test
1. Go to `/schedule`
2. Click "Connect Google Calendar"
3. Complete OAuth flow
4. Create events in WeekGrid - they sync to Google Calendar!

## Current Status
- ✅ Client ID configured: `220621958889-cm2v4kob0h26qa0vdtno2ki6a6r03d4t.apps.googleusercontent.com`
- ❌ Client Secret needed: Update `GOOGLE_CLIENT_SECRET` in `.env.local`
- ✅ All API routes implemented and ready

## Security
- Tokens encrypted before storage
- Minimal scopes requested
- User can disconnect anytime
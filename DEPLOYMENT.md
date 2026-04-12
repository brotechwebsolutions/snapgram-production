# 🚀 Deployment Guide — SnapGram

## Architecture
```
Vercel (Frontend)  →  Render (Backend)  →  MongoDB Atlas
     React/Vite         Spring Boot         Database
```

---

## Step 1: MongoDB Atlas (Free Tier)

1. Sign up at https://cloud.mongodb.com
2. Create cluster → **M0 Free Tier** → AWS us-east-1
3. Database Access → Add user → `snapgram_user` → Auto-generate password → **save it**
4. Network Access → Add IP → `0.0.0.0/0` (allow all — you can restrict later)
5. Clusters → Connect → Drivers → Copy connection string
   ```
   mongodb+srv://snapgram_user:PASSWORD@cluster0.xxxxx.mongodb.net/snapgram
   ```

---

## Step 2: Cloudinary (Free Tier)

1. Sign up at https://cloudinary.com
2. Dashboard → copy: Cloud name, API Key, API Secret

---

## Step 3: Gmail App Password

See `SETUP_GMAIL.md` for detailed instructions.

---

## Step 4: Deploy Backend to Render

1. Push your code to GitHub (include `render.yaml` at repo root)
2. Go to https://dashboard.render.com → **New → Web Service**
3. Connect your GitHub repository
4. Render detects `render.yaml` automatically. Configure:
   - **Name:** `snapgram-backend`
   - **Region:** Oregon (or closest to your users)
   - **Branch:** `main`
5. Set Environment Variables (Render Dashboard → Environment):
   ```
   MONGODB_URI        = mongodb+srv://...
   JWT_SECRET         = (run: openssl rand -base64 48)
   GMAIL_USERNAME     = your@gmail.com
   GMAIL_APP_PASSWORD = your-app-password
   CLOUDINARY_CLOUD_NAME = your-cloud
   CLOUDINARY_API_KEY    = your-key
   CLOUDINARY_API_SECRET = your-secret
   FRONTEND_URL       = https://your-app.vercel.app   ← set after Vercel deploy
   ```
6. Click **Deploy** → wait ~5 minutes for first build
7. Check: `https://your-app.onrender.com/actuator/health` → should return `{"status":"UP"}`

**⚠️ Free tier note:** Service sleeps after 15 minutes of inactivity.
First request takes ~30 seconds to wake up. Upgrade to Starter ($7/mo) to prevent this.

---

## Step 5: Deploy Frontend to Vercel

1. Push frontend code to GitHub
2. Go to https://vercel.com → **New Project** → Import your repo
3. Set **Root Directory** to `frontend`
4. Framework: **Vite** (auto-detected)
5. Add Environment Variables:
   ```
   VITE_API_BASE_URL = https://snapgram-backend.onrender.com
   VITE_WS_URL       = https://snapgram-backend.onrender.com/ws
   ```
6. Click **Deploy** → Get your URL: `https://snapgram-xyz.vercel.app`
7. **Go back to Render** → Update `FRONTEND_URL` = `https://snapgram-xyz.vercel.app`
8. Redeploy Render service

---

## Step 6: Verify End-to-End

1. Open your Vercel URL
2. Click **Sign up** → enter details
3. Check email for **6-digit OTP** (check spam!)
4. Enter OTP → account activated
5. Log in → you should see the feed

---

## CORS Troubleshooting

If you get CORS errors:
1. Confirm `FRONTEND_URL` in Render matches **exactly** your Vercel URL
2. No trailing slash: ✅ `https://app.vercel.app` ❌ `https://app.vercel.app/`
3. Check backend logs in Render Dashboard → Logs tab

## WebSocket Troubleshooting

WebSocket over HTTPS requires `wss://` internally but SockJS handles this.
If WS doesn't connect:
1. Verify `VITE_WS_URL` uses `https://` (not `wss://`) — SockJS converts it
2. Check browser console for STOMP errors
3. Render free tier may drop WS connections — upgrade to Starter plan

---

## Production Checklist

- [ ] MongoDB Atlas IP whitelist (restrict to Render IPs for production)
- [ ] Strong JWT secret (min 48 chars from `openssl rand -base64 48`)
- [ ] Gmail App Password (not regular password)
- [ ] `FRONTEND_URL` set to exact Vercel URL in Render
- [ ] `VITE_API_BASE_URL` set to exact Render URL in Vercel
- [ ] Health check passes: `/actuator/health` returns `UP`
- [ ] Test full signup → OTP → login flow after deploy

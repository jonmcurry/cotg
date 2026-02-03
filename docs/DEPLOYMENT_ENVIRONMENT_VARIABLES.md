# Deployment Environment Variables Guide

This guide provides detailed instructions for configuring environment variables for deploying the Century of the Game application.

## Architecture Overview

- **Frontend**: Vercel (Static hosting for Vite/React app)
- **Backend**: Render (Node.js/Express API server)
- **Database**: Supabase (PostgreSQL database)

---

## Backend Environment Variables (Render)

### Required Variables

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `NODE_ENV` | Environment mode | `production` | Set manually |
| `PORT` | Server port | `3001` | Set manually |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) | `eyJhbGc...` | Supabase Dashboard → Settings → API → service_role key |
| `CORS_ORIGIN` | Allowed frontend origin | `https://your-app.vercel.app` | Vercel deployment URL (update after deploying frontend) |

### Setting Variables in Render

1. Go to your Render dashboard
2. Select your web service
3. Navigate to "Environment" tab
4. Add each variable using the "Add Environment Variable" button
5. Click "Save Changes"

**IMPORTANT**: After deploying the frontend to Vercel, you MUST update the `CORS_ORIGIN` variable with your actual Vercel URL.

### Example Backend .env File (Local Development)

```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
CORS_ORIGIN=http://localhost:5173
```

---

## Frontend Environment Variables (Vercel)

### Required Variables

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `VITE_API_URL` | Backend API base URL | `https://your-api.onrender.com` | Render deployment URL (update after deploying backend) |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon/public key |

### Setting Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add each variable:
   - **Key**: Variable name (e.g., `VITE_API_URL`)
   - **Value**: Variable value
   - **Environment**: Select "Production", "Preview", and "Development"
4. Click "Save"

**IMPORTANT**: After deploying the backend to Render, you MUST update the `VITE_API_URL` variable with your actual Render URL.

### Example Frontend .env File (Local Development)

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Deployment Order and Configuration

### Step 1: Deploy Backend to Render First

1. Deploy backend to Render using `render.yaml`
2. Note the Render URL (e.g., `https://cotg-api.onrender.com`)
3. Add all backend environment variables to Render dashboard
4. For now, set `CORS_ORIGIN=*` temporarily (we'll update this in Step 3)

### Step 2: Deploy Frontend to Vercel

1. Deploy frontend to Vercel
2. Add all frontend environment variables to Vercel dashboard
3. Set `VITE_API_URL` to the Render URL from Step 1
4. Note the Vercel URL (e.g., `https://century-of-the-game.vercel.app`)

### Step 3: Update CORS Configuration

1. Go back to Render dashboard
2. Update the `CORS_ORIGIN` environment variable
3. Set it to the Vercel URL from Step 2
4. Save changes (Render will redeploy automatically)

---

## Security Best Practices

### Backend (Render)
- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` (has full database access)
- ✅ Never expose service role key to frontend
- ✅ Set `CORS_ORIGIN` to specific domain (not wildcard `*`)
- ✅ Environment variables are encrypted at rest on Render

### Frontend (Vercel)
- ✅ Use `VITE_SUPABASE_ANON_KEY` (has Row Level Security restrictions)
- ⚠️ All `VITE_*` variables are bundled into client-side code (publicly visible)
- ✅ Never put service role keys in frontend environment variables
- ✅ All database mutations go through backend API (not direct Supabase calls)

---

## Troubleshooting

### CORS Errors

**Symptom**: Browser console shows "CORS policy" errors

**Solution**:
1. Verify `CORS_ORIGIN` in Render matches your Vercel URL exactly (including https://)
2. No trailing slash in URLs
3. Redeploy backend after changing CORS_ORIGIN

### 503 Service Unavailable

**Symptom**: Backend health check fails

**Solution**:
1. Check Render logs for errors
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
3. Test Supabase connection from Render dashboard

### Frontend Can't Connect to Backend

**Symptom**: API calls fail with network errors

**Solution**:
1. Verify `VITE_API_URL` in Vercel matches your Render URL exactly
2. Check that backend is running (visit `https://your-api.onrender.com/api/health`)
3. Redeploy frontend after changing `VITE_API_URL`

### Environment Variables Not Updating

**Symptom**: Changes to environment variables don't take effect

**Solution**:
- **Render**: Changing environment variables triggers automatic redeploy
- **Vercel**: Changing environment variables requires manual redeployment (go to Deployments → Redeploy)

---

## Quick Reference

### Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Click "Settings" (gear icon)
4. Click "API" in left sidebar
5. Copy:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Backend Health Check

After deploying backend, verify it's running:

```bash
curl https://your-api.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T...",
  "database": "connected"
}
```

### Test CORS Configuration

From browser console on your Vercel site:

```javascript
fetch('https://your-api.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If CORS is configured correctly, you should see the health check response.

---

## Environment Variable Checklist

### Before Deploying

- [ ] Copy `.env.example` to `.env` in both root and backend directories
- [ ] Fill in all values in both `.env` files for local development
- [ ] Test locally: backend on :3001, frontend on :5173
- [ ] Verify health check works: `curl http://localhost:3001/api/health`

### During Deployment

- [ ] Deploy backend to Render with all environment variables
- [ ] Test backend health check with Render URL
- [ ] Deploy frontend to Vercel with all environment variables
- [ ] Update `CORS_ORIGIN` in Render with Vercel URL
- [ ] Test full flow end-to-end

### After Deployment

- [ ] Verify no CORS errors in browser console
- [ ] Test league creation
- [ ] Test draft session creation
- [ ] Test CPU draft picks
- [ ] Monitor Render logs for any errors

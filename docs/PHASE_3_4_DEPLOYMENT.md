# Phase 3-4 Deployment Plan

## Overview
Complete the environment configuration and deployment of the COTG application to production infrastructure (Vercel + Render + Supabase).

## Status
- Phase 1: Backend API Setup - ✅ COMPLETE (Feature Slices 1-6)
- Phase 2: Frontend Refactor - ✅ COMPLETE (Feature Slices 1-6)
- Phase 3: Environment Configuration - 🔄 IN PROGRESS
- Phase 4: Deployment - ⏳ PENDING

---

## Phase 3: Environment Configuration

### 3.1 Backend Environment Variables
- [ ] Verify `backend/.env.example` exists with all required variables
- [ ] Document environment variables needed for Render deployment
- [ ] Ensure sensitive keys are in .gitignore

### 3.2 Create render.yaml
- [ ] Create `render.yaml` in project root for Infrastructure as Code
- [ ] Configure web service settings (name, environment, build/start commands)
- [ ] Configure environment variable references

### 3.3 Frontend Environment Variables
- [ ] Document Vercel environment variables needed
- [ ] Ensure VITE_API_URL points to Render backend
- [ ] Verify Supabase client keys are properly configured

### 3.4 Vercel Configuration
- [ ] Verify `vercel.json` exists and routes SPA correctly
- [ ] Ensure build settings are correct for Vite

---

## Phase 4: Deployment

### 4.1 Backend Deployment to Render
- [ ] Push all backend code to GitHub
- [ ] Create Render Web Service via dashboard or render.yaml
- [ ] Connect GitHub repository to Render
- [ ] Configure environment variables in Render dashboard
- [ ] Trigger initial deployment
- [ ] Verify backend health endpoint responds

### 4.2 Frontend Deployment to Vercel
- [ ] Create Vercel project
- [ ] Connect GitHub repository to Vercel
- [ ] Set framework preset to Vite
- [ ] Configure VITE_API_URL with Render backend URL
- [ ] Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- [ ] Trigger initial deployment
- [ ] Verify frontend loads correctly

### 4.3 Cross-Origin Configuration
- [ ] Update CORS_ORIGIN in Render with production Vercel URL
- [ ] Test API calls from Vercel frontend to Render backend
- [ ] Verify no CORS errors in browser console

### 4.4 End-to-End Testing
- [ ] Test league creation
- [ ] Test draft session creation
- [ ] Test player pool loading
- [ ] Test making picks (human and CPU)
- [ ] Test auto-lineup generation
- [ ] Test schedule generation
- [ ] Test clubhouse roster display
- [ ] Verify all API endpoints work in production

### 4.5 Monitoring and Health Checks
- [ ] Verify Render service is running and healthy
- [ ] Check Render logs for any errors
- [ ] Monitor Vercel deployment logs
- [ ] Check Supabase connection from backend

---

## Environment Variables Reference

### Backend (Render)
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (from Supabase dashboard)
CORS_ORIGIN=https://your-app.vercel.app (update after Vercel deployment)
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-api.onrender.com (from Render deployment)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (from Supabase dashboard)
```

---

## Rollback Plan
1. If deployment fails, frontend can temporarily use direct Supabase calls
2. Feature flag: Set VITE_USE_BACKEND=false to bypass backend
3. Backend can be redeployed independently without affecting frontend

---

## Success Criteria
- ✅ Backend deployed to Render and responding to health checks
- ✅ Frontend deployed to Vercel and loading correctly
- ✅ All API endpoints accessible from frontend
- ✅ No CORS errors
- ✅ League creation/management works
- ✅ Draft flow works (creation, picking, CPU picks)
- ✅ Auto-lineup generation works
- ✅ Schedule generation works
- ✅ Clubhouse displays drafted players correctly

---

## Next Steps After Deployment
1. Monitor for errors in production
2. Update DNS if custom domain needed
3. Set up error tracking (Sentry, LogRocket, etc.)
4. Configure CI/CD for automatic deployments
5. Phase 5: Cleanup (remove unused files, update docs)

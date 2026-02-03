# Migration Plan: Vercel + Render + Supabase Architecture

## Overview

Refactor the COTG application from a client-side-only architecture to a proper 3-tier architecture:
- **Vercel**: Static frontend hosting (React/Vite)
- **Render**: Backend API server (Node.js/Express)
- **Supabase**: Database (already in use)

## Current Architecture Analysis

### Files Making Direct Supabase Calls (4 files)
1. `src/stores/draftStore.ts` - Draft sessions, picks, teams, depth charts, schedules
2. `src/stores/leagueStore.ts` - Leagues CRUD
3. `src/components/draft/DraftBoard.tsx` - Player pool queries
4. `src/components/clubhouse/Clubhouse.tsx` - Drafted player data queries

### Heavy Computation (Move to Backend)
1. `src/utils/cpuDraftLogic.ts` (~380 lines) - CPU draft AI decision making
2. `src/utils/autoLineup.ts` (~200 lines) - Optimal lineup generation
3. `src/utils/scheduleGenerator.ts` (~200 lines) - 162-game schedule generation

### State Management
- Zustand stores with `persist` middleware (localStorage)
- Client-side state will remain for UI responsiveness
- Backend becomes source of truth for all data

---

## Phase 1: Backend API Setup (Render)

### Checklist

- [x] **1.1** Create new `backend/` directory in project root
- [x] **1.2** Initialize Node.js project with TypeScript
  ```bash
  cd backend && npm init -y
  npm install express cors dotenv @supabase/supabase-js
  npm install -D typescript @types/express @types/node @types/cors ts-node nodemon
  ```
- [x] **1.3** Create `backend/tsconfig.json` with strict settings
- [x] **1.4** Create `backend/src/index.ts` - Express server entry point
- [x] **1.5** Create `backend/src/lib/supabase.ts` - Server-side Supabase client (uses SERVICE_ROLE_KEY)
- [x] **1.6** Set up CORS to allow Vercel frontend domain

### API Endpoints to Create

#### Leagues API (`backend/src/routes/leagues.ts`)
- [x] `GET /api/leagues` - List all leagues
- [x] `POST /api/leagues` - Create league
- [x] `PUT /api/leagues/:id` - Update league
- [x] `DELETE /api/leagues/:id` - Delete league

#### Draft Sessions API (`backend/src/routes/draft.ts`)
- [ ] `GET /api/draft/sessions` - List draft sessions
- [ ] `POST /api/draft/sessions` - Create draft session
- [ ] `GET /api/draft/sessions/:id` - Get session with teams/picks
- [ ] `PUT /api/draft/sessions/:id` - Update session (pause, complete, etc.)
- [ ] `DELETE /api/draft/sessions/:id` - Delete session

#### Draft Picks API (`backend/src/routes/picks.ts`)
- [ ] `POST /api/draft/sessions/:id/picks` - Make a pick (human or CPU)
- [ ] `GET /api/draft/sessions/:id/picks` - Get all picks for session

#### Teams API (`backend/src/routes/teams.ts`)
- [ ] `PUT /api/draft/teams/:id/depth-chart` - Update team depth chart
- [ ] `GET /api/draft/teams/:id/roster` - Get team roster with player data

#### Players API (`backend/src/routes/players.ts`)
- [ ] `GET /api/players/pool` - Get available player pool (with filters)
- [ ] `GET /api/players/:id` - Get single player season data
- [ ] `POST /api/players/batch` - Get multiple players by IDs (for Clubhouse)

#### CPU Draft API (`backend/src/routes/cpu.ts`)
- [ ] `POST /api/draft/sessions/:id/cpu-pick` - Calculate and execute CPU pick
  - Moves `cpuDraftLogic.ts` to backend
  - Returns the selected player and pick result

#### Auto-Lineup API (`backend/src/routes/lineup.ts`)
- [ ] `POST /api/teams/:id/auto-lineup` - Generate optimal depth chart
  - Moves `autoLineup.ts` to backend
  - Returns generated `TeamDepthChart`

#### Schedule API (`backend/src/routes/schedule.ts`)
- [ ] `POST /api/draft/sessions/:id/schedule` - Generate season schedule
  - Moves `scheduleGenerator.ts` to backend
  - Returns generated schedule

---

## Phase 2: Frontend Refactor (Vercel)

### Checklist

- [x] **2.1** Create `src/lib/api.ts` - Centralized API client
  ```typescript
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }
  // ... apiPut, apiDelete
  ```

- [ ] **2.2** Update `src/stores/draftStore.ts`
  - Replace all `supabase.from()` calls with `apiGet/apiPost/apiPut`
  - Keep Zustand state for UI responsiveness
  - Sync state from API responses

- [x] **2.3** Update `src/stores/leagueStore.ts`
  - Replace Supabase calls with API calls

- [ ] **2.4** Update `src/components/draft/DraftBoard.tsx`
  - Replace player pool query with `GET /api/players/pool`
  - Replace CPU pick logic with `POST /api/draft/sessions/:id/cpu-pick`
  - Remove local `cpuDraftLogic` import

- [ ] **2.5** Update `src/components/clubhouse/Clubhouse.tsx`
  - Replace player batch query with `POST /api/players/batch`
  - Replace auto-lineup generation with `POST /api/teams/:id/auto-lineup`

- [ ] **2.6** Add `VITE_API_URL` to environment variables
- [ ] **2.7** Update `vite.config.ts` for production builds

---

## Phase 3: Environment Configuration

### Backend Environment Variables (`backend/.env`)
```env
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side key (not anon)
CORS_ORIGIN=https://your-app.vercel.app
NODE_ENV=production
```

### Frontend Environment Variables (Vercel Dashboard)
```env
VITE_API_URL=https://your-api.onrender.com
VITE_SUPABASE_URL=https://xxx.supabase.co      # Keep for real-time subscriptions if needed
VITE_SUPABASE_ANON_KEY=eyJ...                  # Keep for real-time only
```

### Render Configuration
- [ ] **3.1** Create `render.yaml` for Infrastructure as Code
  ```yaml
  services:
    - type: web
      name: cotg-api
      env: node
      buildCommand: cd backend && npm install && npm run build
      startCommand: cd backend && npm start
      envVars:
        - key: NODE_ENV
          value: production
        - key: SUPABASE_URL
          sync: false
        - key: SUPABASE_SERVICE_ROLE_KEY
          sync: false
        - key: CORS_ORIGIN
          sync: false
  ```

### Vercel Configuration
- [ ] **3.2** Ensure `vercel.json` routes SPA correctly
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

---

## Phase 4: Deployment

### Checklist

- [ ] **4.1** Push backend code to GitHub
- [ ] **4.2** Create Render Web Service
  - Connect GitHub repo
  - Set root directory to `backend`
  - Add environment variables
  - Deploy

- [ ] **4.3** Create Vercel Project
  - Connect GitHub repo
  - Set framework preset to Vite
  - Add `VITE_API_URL` pointing to Render URL
  - Deploy

- [ ] **4.4** Update CORS_ORIGIN on Render with Vercel URL
- [ ] **4.5** Test end-to-end flow

---

## Phase 5: Cleanup

- [ ] **5.1** Remove direct Supabase imports from frontend (except real-time if needed)
- [ ] **5.2** Remove `SUPABASE_SERVICE_ROLE_KEY` from any frontend config
- [ ] **5.3** Update `CLAUDE.md` with new architecture documentation
- [ ] **5.4** Update `README.md` with deployment instructions
- [ ] **5.5** Remove unused utility files from frontend that moved to backend

---

## File Structure After Migration

```
cotg/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express entry
│   │   ├── lib/
│   │   │   └── supabase.ts       # Server Supabase client
│   │   ├── routes/
│   │   │   ├── leagues.ts
│   │   │   ├── draft.ts
│   │   │   ├── picks.ts
│   │   │   ├── teams.ts
│   │   │   ├── players.ts
│   │   │   ├── cpu.ts
│   │   │   ├── lineup.ts
│   │   │   └── schedule.ts
│   │   └── utils/
│   │       ├── cpuDraftLogic.ts  # Moved from frontend
│   │       ├── autoLineup.ts     # Moved from frontend
│   │       └── scheduleGenerator.ts # Moved from frontend
│   ├── package.json
│   └── tsconfig.json
├── src/                          # Frontend (unchanged structure)
│   ├── lib/
│   │   ├── api.ts               # NEW: API client
│   │   └── supabaseClient.ts    # Keep for real-time only
│   ├── stores/
│   │   ├── draftStore.ts        # Refactored to use API
│   │   └── leagueStore.ts       # Refactored to use API
│   └── ...
├── render.yaml
├── vercel.json
└── ...
```

---

## Benefits of This Architecture

1. **Security**: Service role key never exposed to client
2. **Performance**: Heavy computation (CPU draft, lineup gen, schedule) runs on server
3. **Scalability**: Can add caching, rate limiting, auth middleware on backend
4. **Cost**: Both Vercel and Render have generous free tiers
5. **Maintainability**: Clear separation of concerns

---

## Estimated Effort

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Backend API Setup | Medium |
| 2 | Frontend Refactor | Medium |
| 3 | Environment Config | Low |
| 4 | Deployment | Low |
| 5 | Cleanup | Low |

---

## Rollback Plan

If issues arise:
1. Frontend can be quickly reverted to direct Supabase calls
2. Keep `src/lib/supabaseClient.ts` intact during migration
3. Use feature flags (`VITE_USE_BACKEND=true`) during transition

---

## Next Steps

1. Start with Phase 1.1-1.6 (basic backend setup)
2. Implement one API route (e.g., leagues) as proof of concept
3. Test locally with both frontend and backend running
4. Proceed with remaining phases

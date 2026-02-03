# Century of the Game

A web-based baseball fantasy draft and simulation system that combines the strategic depth of APBA Baseball with advanced Bill James statistics.

## Project Status

**Current Status**: Production-ready, deployed on Vercel + Render + Supabase

**Completed Features:**
- ✅ Complete 3-tier architecture (Frontend, Backend API, Database)
- ✅ Historical player database (1901-2024) with APBA ratings
- ✅ League creation and management
- ✅ Draft system with snake draft algorithm
- ✅ CPU AI for automated draft picks
- ✅ Team management with depth charts
- ✅ Auto-lineup generation (platoon optimization)
- ✅ 162-game schedule generation
- ✅ Clubhouse roster management

**In Progress:**
- ⏳ Game simulation engine (APBA-style dice mechanics)
- ⏳ Bill James advanced analytics integration

## Tech Stack

### Frontend (Vercel)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Century of the Game color palette
- **State Management**: Zustand with persist middleware
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **Virtualization**: React Window (for large player lists)

### Backend (Render)
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript
- **API**: RESTful endpoints for all data operations
- **Computation**: Server-side CPU draft AI, lineup generation, schedule generation

### Database (Supabase)
- **Database**: PostgreSQL
- **Features**: Row Level Security, real-time subscriptions
- **Data**: 124 years of historical player data (1901-2024)

## Color Palette

- **Charcoal**: `#2C2C2C` - Primary background and text
- **Burgundy**: `#8B2635` - Accent color, vintage feel
- **Gold**: `#D4AF37` - Highlights, important elements
- **Cream**: `#F5F3E8` - Backgrounds, softer tones

## Typography

- **Display**: Playfair Display (headers, titles)
- **Serif**: Crimson Text (body, descriptions)
- **Sans**: Source Sans 3 (UI elements, data)

## Getting Started

### Prerequisites

- Node.js 18+ (with npm)
- Supabase account (for database)

### Local Development Setup

#### 1. Clone and Install

```bash
git clone https://github.com/jonmcurry/cotg.git
cd cotg
npm install
cd backend && npm install && cd ..
```

#### 2. Configure Environment Variables

**Frontend** (root `.env`):
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
# Edit backend/.env with your Supabase service role key
PORT=3001
NODE_ENV=development
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGIN=http://localhost:5173
cd ..
```

#### 3. Start Both Servers

**Terminal 1** (Backend API):
```bash
cd backend
npm run dev
# Backend runs on http://localhost:3001
```

**Terminal 2** (Frontend):
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Backend:**
- `cd backend && npm run dev` - Start backend with auto-reload (port 3001)
- `cd backend && npm run build` - Compile TypeScript
- `cd backend && npm start` - Start production server

### Deployment

See [docs/DEPLOYMENT_ENVIRONMENT_VARIABLES.md](docs/DEPLOYMENT_ENVIRONMENT_VARIABLES.md) for complete deployment instructions to Vercel + Render + Supabase.

**Quick Summary:**
1. Deploy backend to [Render](https://render.com) using `render.yaml`
2. Deploy frontend to [Vercel](https://vercel.com) (auto-detected Vite project)
3. Configure environment variables in both platforms
4. Update CORS settings to allow production domains

## Project Structure

```
cotg/
├── backend/                   # Backend API (deployed to Render)
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── lib/
│   │   │   └── supabase.ts   # Server-side Supabase client
│   │   └── routes/           # API endpoints
│   │       ├── leagues.ts    # League CRUD operations
│   │       ├── draft.ts      # Draft session management
│   │       ├── picks.ts      # Draft pick operations
│   │       ├── players.ts    # Player data queries
│   │       ├── cpu.ts        # CPU draft AI logic
│   │       ├── lineup.ts     # Auto-lineup generation
│   │       └── schedule.ts   # Schedule generation
│   ├── package.json
│   └── tsconfig.json
├── src/                       # Frontend (deployed to Vercel)
│   ├── components/           # React components
│   │   ├── draft/            # Draft board, team cards
│   │   ├── clubhouse/        # Roster management
│   │   ├── league/           # League setup
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts            # API client for backend
│   │   └── supabaseClient.ts # Client-side Supabase (real-time only)
│   ├── stores/               # Zustand state management
│   │   ├── draftStore.ts     # Draft state
│   │   └── leagueStore.ts    # League state
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   ├── App.tsx
│   └── main.tsx
├── docs/                      # Documentation
│   ├── DEPLOYMENT_ENVIRONMENT_VARIABLES.md
│   ├── MIGRATION_VERCEL_RENDER_SUPABASE.md
│   ├── PHASE_3_4_DEPLOYMENT.md
│   └── ...
├── render.yaml                # Render deployment config
├── vercel.json                # Vercel deployment config
├── CHANGELOG.md               # Detailed project history
└── package.json               # Frontend dependencies
```

## Features

### League Management
- Create custom leagues with configurable settings
- Draft configuration (roster size, positions, draft order)
- Multiple leagues supported

### Draft System
- Snake draft algorithm with automatic pick order generation
- Real-time draft board with player pool filtering
- CPU AI opponents with intelligent pick selection
  - Position scarcity evaluation
  - Platoon balance optimization
  - Bill James-inspired statistical scoring
- Duplicate player detection with auto-retry

### Team Management
- Team rosters with position-specific slots
- Depth chart configuration (vs RHP/LHP lineups)
- Auto-lineup generation
  - Platoon-optimized batting orders
  - Defensive position assignment
  - Starting rotation and bullpen configuration
- Clubhouse view with full roster display

### Schedule Generation
- 162-game season schedules
- Balanced team matchups
- Series grouping (2-4 game series)
- All-Star break insertion
- Random off days for realism

### Player Database
- 124 years of player data (1901-2024)
- APBA ratings and statistical profiles
- Advanced filtering and search
- Efficient batch loading with pagination

### Coming Soon
- APBA-style game simulation engine
- Play-by-play game interface
- Season standings and statistics
- Bill James advanced analytics dashboard

## Data Sources

1. **Lahman Baseball Database** (1871-2025)
   - Primary source for player statistics
   - Located in `data_files/lahman_1871-2025_csv/`

2. **APBA Baseball v3 for Windows**
   - Game mechanics and player card structure
   - 1,836 players parsed from 1921, 1943, 1971 seasons

3. **Bill James Baseball Encyclopedia**
   - Advanced statistical formulas
   - 12 formulas documented and implemented

## Documentation

See the [docs/](docs/) directory for detailed documentation:

**Deployment & Architecture:**
- [DEPLOYMENT_ENVIRONMENT_VARIABLES.md](docs/DEPLOYMENT_ENVIRONMENT_VARIABLES.md) - Complete deployment guide
- [MIGRATION_VERCEL_RENDER_SUPABASE.md](docs/MIGRATION_VERCEL_RENDER_SUPABASE.md) - Architecture migration plan
- [PHASE_3_4_DEPLOYMENT.md](docs/PHASE_3_4_DEPLOYMENT.md) - Phase 3-4 deployment checklist

**Game Design:**
- [APBA_REVERSE_ENGINEERING.md](docs/APBA_REVERSE_ENGINEERING.md) - APBA game mechanics
- [BILL_JAMES_FEATURES.md](docs/BILL_JAMES_FEATURES.md) - Advanced statistics
- [BILL_JAMES_FORMULAS.md](docs/BILL_JAMES_FORMULAS.md) - Formula implementations

**Project History:**
- [CHANGELOG.md](CHANGELOG.md) - Detailed development history with all feature releases

## License

Private project - Not for commercial use

## Acknowledgments

- **APBA Game Company** - Original game mechanics inspiration
- **Bill James** - Advanced baseball statistics and formulas
- **Sean Lahman** - Comprehensive baseball statistics database

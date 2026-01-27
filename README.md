# Century of the Game

A web-based baseball fantasy draft and simulation system that combines the strategic depth of APBA Baseball with advanced Bill James statistics.

## Project Status

**Phase 1: Foundation & Data Pipeline** (Week 1-4)
- ✅ Phase 1.1: APBA Reverse Engineering (1,836 players parsed, game mechanics documented)
- ✅ Phase 1.2: Bill James Analysis (12 formulas documented, implementation strategy defined)
- ✅ Phase 1.3: React + TypeScript Setup (Development environment ready)
- ⏳ Phase 1.4: Supabase Database Schema (Next)
- ⏳ Phase 1.5: Lahman Import Pipeline
- ⏳ Phase 1.6: APBA Card Generation

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Century of the Game color palette
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **Virtualization**: React Window

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

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Supabase URL and anon key.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run import:lahman` - Import Lahman database to Supabase (Phase 1.5)

## Project Structure

```
century-of-the-game/
├── data_files/              # Source data files
│   ├── apba_parsed/         # Parsed APBA player data (JSON)
│   └── lahman_1871-2025_csv/ # Lahman Baseball Database
├── docs/                    # Documentation
│   ├── APBA_REVERSE_ENGINEERING.md
│   ├── BILL_JAMES_FEATURES.md
│   ├── BILL_JAMES_FORMULAS.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── PHASE_1_CHECKLIST.md
├── scripts/                 # Data processing scripts
│   ├── parse_apba_binary.py
│   ├── parse_apba_outcomes.py
│   └── analyze_bill_james.py
├── src/
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Libraries (Supabase client, etc.)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions (Bill James formulas, etc.)
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles with Tailwind
├── CHANGELOG.md             # Project changelog
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js

```

## Features

### Current (Phase 1.3)
- React + TypeScript development environment
- Tailwind CSS with Century of the Game branding
- Bill James formula utilities (Runs Created, ISO, SecA, etc.)
- TypeScript types for database schema

### Upcoming (Phase 1.4-1.6)
- Supabase database with full schema
- Lahman database import (1901-2025)
- APBA card generation for all players

### Future Phases
- **Phase 2**: Draft system with TRD algorithm
- **Phase 3**: APBA-style game simulation engine
- **Phase 4**: Bill James advanced features (player comparisons, career trajectories)
- **Phase 5**: Polish and production deployment

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
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Overall project plan
- [PHASE_1_CHECKLIST.md](docs/PHASE_1_CHECKLIST.md) - Phase 1 task tracking
- [APBA_REVERSE_ENGINEERING.md](docs/APBA_REVERSE_ENGINEERING.md) - APBA format documentation
- [BILL_JAMES_FEATURES.md](docs/BILL_JAMES_FEATURES.md) - Bill James analysis
- [BILL_JAMES_FORMULAS.md](docs/BILL_JAMES_FORMULAS.md) - Formula implementation guide

## License

Private project - Not for commercial use

## Acknowledgments

- **APBA Game Company** - Original game mechanics inspiration
- **Bill James** - Advanced baseball statistics and formulas
- **Sean Lahman** - Comprehensive baseball statistics database

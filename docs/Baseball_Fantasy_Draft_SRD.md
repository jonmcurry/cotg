# Software Requirements Document (SRD)
# Baseball Fantasy Draft Application

**Version:** 1.0  
**Date:** January 22, 2026  
**Author:** Senior Software Engineer  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Data Architecture](#6-data-architecture)
7. [User Interface Requirements](#7-user-interface-requirements)
8. [Technical Specifications](#8-technical-specifications)
9. [API & Data Source Strategy](#9-api--data-source-strategy)
10. [Database Recommendation](#10-database-recommendation)
11. [Deployment Strategy](#11-deployment-strategy)
12. [Risk Assessment](#12-risk-assessment)
13. [Future Considerations](#13-future-considerations)

---

## 1. Executive Summary

This document defines the requirements for a web-based Baseball Fantasy Draft Application that enables users to conduct snake drafts using historical MLB player data spanning 1901-2025. The application supports configurable team counts, mixed human/CPU-controlled teams, intelligent auto-drafting, and comprehensive roster management.

### Key Features
- Historical player database (1901-2025) with season-specific statistics
- Configurable snake draft system with human and CPU-controlled teams
- Intelligent CPU draft logic based on positional needs and WAR
- Real-time draft board with player filtering and sorting
- Session persistence with save/resume functionality
- Automatic data refresh capability for new seasons

---

## 2. Project Overview

### 2.1 Purpose
Create an engaging fantasy baseball draft experience using historical MLB data, allowing users to build dream teams from over 124 years of baseball history.

### 2.1.1 Data Source
Use the Lahman Baseball Database file for complete players from 1901-2025 and their stats
https://sabr.app.box.com/s/y1prhc795jk8zvmelfd3jq7tl389y6cd

### 2.1.2 Reverse Engineer APBA/Bill James files
C:\dosgames\shared

### 2.1.3 Database/Web
I'm using Supabase: URL: https://vbxpxgrqiixrvvmhkhrx.supabase.co
service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieHB4Z3JxaWl4cnZ2bWhraHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjIxNSwiZXhwIjoyMDg1MDkyMjE1fQ.JuAFNfhB5E0eiB6-tjnoBACUxr8UAqPZ6FbqrfQ562g

### 2.2 Scope

**In Scope:**
- Player data extraction and storage from Baseball-Reference.com
- Draft configuration and management
- Snake draft execution with mixed human/CPU teams
- Roster management with position assignments
- Draft state persistence
- Player filtering, sorting, and search
- Data refresh mechanism for new seasons
- User authentication/accounts
- Multi-device synchronization
- League management beyond single draft sessions
- Post-draft team management/trading
- Historical draft result archives

### 2.3 Definitions

| Term | Definition |
|------|------------|
| Snake Draft | Draft order reverses each round (1-10 in R1, 10-1 in R2, etc.) |
| WAR | Wins Above Replacement - comprehensive player value metric |
| bWAR | Baseball-Reference's WAR calculation |
| CPU Team | Computer-controlled team that auto-drafts |
| Position Eligibility | Positions a player qualifies for based on games played |

---

## 3. Functional Requirements

### 3.1 Draft Configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DC-001 | System shall allow configuration of 2-30 teams | Must Have |
| FR-DC-002 | System shall allow naming of each team | Must Have |
| FR-DC-003 | System shall allow designation of each team as human or CPU controlled | Must Have |
| FR-DC-004 | System shall generate randomized draft order | Must Have |
| FR-DC-005 | System shall display draft order before draft begins | Must Have |
| FR-DC-006 | System shall allow re-randomization of draft order | Should Have |
| FR-DC-007 | System shall allow manual draft order adjustment | Could Have |

### 3.2 Player Pool Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PP-001 | System shall contain player data from 1901-2025 | Must Have |
| FR-PP-002 | System shall allow selection of specific season(s) to draft from | Must Have |
| FR-PP-003 | System shall display player with their selected season's statistics | Must Have |
| FR-PP-004 | System shall show all eligible positions for each player | Must Have |
| FR-PP-005 | System shall remove drafted players from available pool | Must Have |
| FR-PP-006 | System shall support filtering by: All Players, Position, Available Only | Must Have |
| FR-PP-007 | System shall support sorting by: Name, Position, WAR, Team, Year | Must Have |
| FR-PP-008 | System shall provide search functionality by player name | Should Have |
| FR-PP-009 | System shall display player stats: AVG, HR, RBI, SB (hitters) / W, ERA, K, SV (pitchers) | Must Have |

### 3.3 Draft Execution

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DE-001 | System shall execute snake draft format | Must Have |
| FR-DE-002 | Draft shall continue until all teams have 21 players | Must Have |
| FR-DE-003 | System shall clearly indicate current picking team | Must Have |
| FR-DE-004 | System shall indicate if current pick is human or CPU | Must Have |
| FR-DE-005 | Human teams shall select players via click/tap interface | Must Have |
| FR-DE-006 | CPU teams shall auto-draft based on intelligent logic | Must Have |
| FR-DE-007 | System shall display current round number | Must Have |
| FR-DE-008 | System shall display pick number within round | Must Have |
| FR-DE-009 | System shall display overall pick number | Must Have |
| FR-DE-010 | System shall allow pausing/resuming draft | Should Have |

### 3.4 CPU Draft Logic

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CPU-001 | CPU shall prioritize unfilled required roster positions | Must Have |
| FR-CPU-002 | CPU shall consider WAR when selecting between eligible players | Must Have |
| FR-CPU-003 | CPU shall not overdraft positions beyond roster limits | Must Have |
| FR-CPU-004 | CPU shall balance best-player-available with positional need | Must Have |
| FR-CPU-005 | CPU draft logic shall include slight randomization to prevent predictability | Should Have |

**CPU Draft Algorithm (Pseudocode):**
```
1. Identify unfilled required positions
2. If required positions exist:
   a. Weight positions by scarcity (C, SS weighted higher)
   b. Find top 3-5 players at needed positions by WAR
   c. Apply randomization factor (±10% WAR weight)
   d. Select highest weighted player
3. If all required positions filled:
   a. Select best available player by WAR for bench
4. Assign player to roster, mark as drafted
```

### 3.5 Roster Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RM-001 | Each team roster shall contain exactly 21 players | Must Have |
| FR-RM-002 | System shall enforce roster composition requirements | Must Have |
| FR-RM-003 | System shall allow position assignment at draft time | Must Have |
| FR-RM-004 | System shall display position counts per team | Must Have |
| FR-RM-005 | System shall display roster slots remaining | Must Have |
| FR-RM-006 | System shall validate position eligibility on assignment | Must Have |

**Required Roster Composition:**

| Position | Count | Requirement |
|----------|-------|-------------|
| Catcher (C) | 1 | Required |
| First Base (1B) | 1 | Required |
| Second Base (2B) | 1 | Required |
| Shortstop (SS) | 1 | Required |
| Third Base (3B) | 1 | Required |
| Outfield (OF) | 3 | Required (LF/CF/RF eligible) |
| Starting Pitcher (SP) | 4 | Required |
| Relief Pitcher (RP) | 3 | Required |
| Closer (CL) | 1 | Required (RP-eligible) |
| Designated Hitter (DH) | 1 | Any position eligible |
| Bench (BN) | 4 | Any position eligible |
| **Total** | **21** | |

### 3.6 Draft Results & Display

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DR-001 | System shall maintain complete draft history | Must Have |
| FR-DR-002 | Each pick shall record: Player, Team, Round, Pick#, Year | Must Have |
| FR-DR-003 | System shall display draft board showing all picks | Must Have |
| FR-DR-004 | System shall display each team's current roster | Must Have |
| FR-DR-005 | System shall export draft results (CSV/JSON) | Should Have |

### 3.7 Session Persistence

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SP-001 | System shall save draft state automatically | Must Have |
| FR-SP-002 | System shall allow manual save of draft state | Must Have |
| FR-SP-003 | System shall allow loading saved draft state | Must Have |
| FR-SP-004 | Saved state shall include: configuration, picks, rosters | Must Have |
| FR-SP-005 | System shall use browser local storage for persistence | Must Have |
| FR-SP-006 | System shall allow export/import of save files | Should Have |

### 3.8 Data Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DM-001 | System shall support data refresh for new seasons | Must Have |
| FR-DM-002 | Data refresh shall not corrupt existing saved drafts | Must Have |
| FR-DM-003 | System shall display data last-updated timestamp | Should Have |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P-001 | Initial page load time | < 3 seconds |
| NFR-P-002 | Player list rendering (10,000+ players) | < 1 second |
| NFR-P-003 | Draft pick processing | < 500ms |
| NFR-P-004 | Filter/sort operations | < 200ms |
| NFR-P-005 | CPU auto-pick calculation | < 1 second |

### 4.2 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S-001 | Support player database | 20,000+ players |
| NFR-S-002 | Support concurrent drafts | N/A (client-side) |
| NFR-S-003 | Support teams per draft | 2-30 teams |

### 4.3 Compatibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-C-001 | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-C-002 | Device support | Desktop, Tablet, Mobile (responsive) |
| NFR-C-003 | Minimum screen width | 320px |

### 4.4 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R-001 | Auto-save frequency | Every pick + every 30 seconds |
| NFR-R-002 | Data integrity on browser crash | Recoverable to last auto-save |

### 4.5 Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-U-001 | Time to configure draft | < 2 minutes |
| NFR-U-002 | Learning curve | Usable without documentation |

---

## 5. System Architecture

### 5.1 Architecture Decision: Client-Heavy with Static Data

**Recommendation: Static JSON + Client-Side Application**

Given the requirements (no authentication, free tier only, session-based persistence), a database-free architecture is **feasible and recommended**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Draft Logic │  │ State Manager│          │
│  │  Components  │  │    Engine    │  │   (Redux)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                   ┌────────▼────────┐                          │
│                   │  Local Storage  │                          │
│                   │  (Draft Saves)  │                          │
│                   └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS (Static Files)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STATIC FILE HOST                            │
│              (Vercel / Netlify / GitHub Pages)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────────────────┐        │
│  │   index.html │  │  /data/                          │        │
│  │   bundle.js  │  │    players_1901-1950.json        │        │
│  │   styles.css │  │    players_1951-1980.json        │        │
│  └──────────────┘  │    players_1981-2000.json        │        │
│                    │    players_2001-2025.json        │        │
│                    │    positions.json                │        │
│                    │    metadata.json                 │        │
│                    └──────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Architecture Rationale

| Factor | Database Approach | Static JSON Approach | Winner |
|--------|-------------------|---------------------|--------|
| Cost | Free tier limits (500MB-1GB) | Completely free | Static |
| Complexity | Server + DB setup | Single deployment | Static |
| Performance | Network latency per query | Cached locally | Static |
| Offline capability | None | Full (after initial load) | Static |
| Data updates | Easy (DB update) | Redeploy JSON files | Database |
| Concurrent users | Supported | N/A (client-side) | N/A |

**Verdict:** Static JSON is optimal for this use case.

### 5.3 Component Architecture

```
src/
├── components/
│   ├── DraftConfig/
│   │   ├── TeamSetup.tsx
│   │   ├── SeasonSelector.tsx
│   │   └── DraftOrderDisplay.tsx
│   ├── DraftBoard/
│   │   ├── DraftBoard.tsx
│   │   ├── CurrentPick.tsx
│   │   ├── PickHistory.tsx
│   │   └── DraftControls.tsx
│   ├── PlayerPool/
│   │   ├── PlayerList.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── FilterBar.tsx
│   │   └── SortControls.tsx
│   ├── Roster/
│   │   ├── RosterView.tsx
│   │   ├── PositionSlot.tsx
│   │   └── RosterSummary.tsx
│   └── common/
│       ├── Modal.tsx
│       ├── Button.tsx
│       └── Loading.tsx
├── hooks/
│   ├── useDraft.ts
│   ├── usePlayerPool.ts
│   ├── useCPUDraft.ts
│   └── useLocalStorage.ts
├── store/
│   ├── draftSlice.ts
│   ├── playerSlice.ts
│   └── configSlice.ts
├── services/
│   ├── playerDataService.ts
│   ├── draftService.ts
│   └── storageService.ts
├── utils/
│   ├── draftLogic.ts
│   ├── cpuDraftAI.ts
│   └── rosterValidation.ts
└── types/
    ├── Player.ts
    ├── Draft.ts
    └── Roster.ts
```

---

## 6. Data Architecture

### 6.1 Player Data Model

Follow the APBA/BJEBEW reversed engineered files.

### 6.3 Data File Structure

```
/data/
├── metadata.json                # Last updated, version, stats
├── players/
│   ├── hitters_1901-1925.json   # ~5,000 player-seasons
│   ├── hitters_1926-1950.json   # ~6,000 player-seasons
│   ├── hitters_1951-1975.json   # ~8,000 player-seasons
│   ├── hitters_1976-2000.json   # ~12,000 player-seasons
│   ├── hitters_2001-2025.json   # ~15,000 player-seasons
│   ├── pitchers_1901-1925.json  # ~3,000 player-seasons
│   ├── pitchers_1926-1950.json  # ~4,000 player-seasons
│   ├── pitchers_1951-1975.json  # ~5,000 player-seasons
│   ├── pitchers_1976-2000.json  # ~8,000 player-seasons
│   └── pitchers_2001-2025.json  # ~10,000 player-seasons
└── indexes/
    ├── by_position.json         # Position -> player ID mapping
    ├── by_year.json             # Year -> player ID mapping
    └── by_war.json              # Sorted WAR rankings
```

**Estimated Data Size:**
- Total player-seasons: ~75,000
- Average record size: ~500 bytes
- Total uncompressed: ~37.5 MB
- Gzipped: ~5-7 MB
- Per-chunk (lazy loaded): ~0.5-1.5 MB

### 6.4 Data Loading Strategy

```typescript
// Lazy loading based on selected seasons
async function loadPlayerData(seasons: number[]): Promise<Player[]> {
  const chunks = getRequiredChunks(seasons);
  const players: Player[] = [];
  
  for (const chunk of chunks) {
    const cached = await caches.match(`/data/players/${chunk}.json`);
    if (cached) {
      players.push(...await cached.json());
    } else {
      const response = await fetch(`/data/players/${chunk}.json`);
      // Cache for future use
      const cache = await caches.open('player-data-v1');
      cache.put(`/data/players/${chunk}.json`, response.clone());
      players.push(...await response.json());
    }
  }
  
  // Filter to selected seasons only
  return players.filter(p => seasons.includes(p.year));
}
```

---

## 7. User Interface Requirements

### 7.1 Screen Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Home     │────▶│   Config    │────▶│    Draft    │────▶│   Results   │
│   Screen    │     │   Screen    │     │   Screen    │     │   Screen    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐            │
       └───────────▶│    Load     │────────────┘
                    │    Draft    │
                    └─────────────┘
```

### 7.2 Draft Configuration Screen

```
┌────────────────────────────────────────────────────────────────────┐
│  ⚾ BASEBALL FANTASY DRAFT                           [Load Draft]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  DRAFT SETTINGS                                                    │
│  ─────────────────────────────────────────────────────────────    │
│                                                                    │
│  Number of Teams: [▼ 8  ]                                         │
│                                                                    │
│  Season Selection:                                                 │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │ ○ All Years (1901-2025)                                  │     │
│  │ ○ Era: [▼ Modern (2000-2025) ]                          │     │
│  │ ● Specific Years: [2020] [2021] [2022] [+ Add Year]     │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  TEAM SETUP                                                        │
│  ─────────────────────────────────────────────────────────────    │
│  ┌─────┬────────────────────┬─────────────┬─────────────────┐     │
│  │  #  │  Team Name         │  Control    │  Draft Position │     │
│  ├─────┼────────────────────┼─────────────┼─────────────────┤     │
│  │  1  │ [Team Alpha      ] │ [▼ Human  ] │       3         │     │
│  │  2  │ [Team Beta       ] │ [▼ CPU    ] │       7         │     │
│  │  3  │ [Team Gamma      ] │ [▼ Human  ] │       1         │     │
│  │ ... │                    │             │                 │     │
│  └─────┴────────────────────┴─────────────┴─────────────────┘     │
│                                                                    │
│  [🎲 Randomize Draft Order]                                       │
│                                                                    │
│                              [Start Draft ▶]                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 7.3 Main Draft Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ⚾ DRAFT IN PROGRESS          Round 5 of 21  │  Pick 38 of 168  │  [Pause]   │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─ CURRENT PICK ──────────────────────────────────────────────────────────┐  │
│  │  🎯 Team Alpha (Human) is on the clock                                  │  │
│  │  Next: Team Beta (CPU) → Team Gamma (Human)                             │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌─ AVAILABLE PLAYERS ──────────────────┐  ┌─ TEAM ROSTER ─────────────────┐  │
│  │                                       │  │ Team Alpha (8/21)            │  │
│  │ Filter: [All ▼] [Position ▼] [Year▼] │  │ ────────────────────────────  │  │
│  │ Sort:   [WAR ▼]   Search: [______]   │  │ C:  Mike Piazza (1997) ✓     │  │
│  │ ─────────────────────────────────────│  │ 1B: [Empty]                  │  │
│  │ ┌───┬────────────────┬────┬────┬───┐ │  │ 2B: [Empty]                  │  │
│  │ │Pos│ Player         │Year│WAR │ + │ │  │ SS: Derek Jeter (1999) ✓    │  │
│  │ ├───┼────────────────┼────┼────┼───┤ │  │ 3B: [Empty]                  │  │
│  │ │1B │ Lou Gehrig     │1927│11.8│[+]│ │  │ OF: Ken Griffey Jr (1997) ✓ │  │
│  │ │CF │ Willie Mays    │1965│10.7│[+]│ │  │ OF: [Empty]                  │  │
│  │ │SS │ Honus Wagner   │1908│10.4│[+]│ │  │ OF: [Empty]                  │  │
│  │ │RF │ Babe Ruth      │1923│10.1│[+]│ │  │ SP: Sandy Koufax (1965) ✓   │  │
│  │ │3B │ Mike Schmidt   │1974│ 9.8│[+]│ │  │ SP: [Empty]                  │  │
│  │ │SP │ Walter Johnson │1913│ 9.7│[+]│ │  │ SP: [Empty]                  │  │
│  │ │C  │ Johnny Bench   │1972│ 9.5│[+]│ │  │ SP: [Empty]                  │  │
│  │ │...│ ...            │... │... │...│ │  │ RP: [Empty]                  │  │
│  │ └───┴────────────────┴────┴────┴───┘ │  │ RP: [Empty]                  │  │
│  │                                       │  │ RP: [Empty]                  │  │
│  │ Showing 1-20 of 847  [<] [1] [2] [>] │  │ CL: Mariano Rivera (1996) ✓ │  │
│  └───────────────────────────────────────┘  │ DH: [Empty]                  │  │
│                                             │ BN: Ted Williams (1941) ✓   │  │
│  ┌─ RECENT PICKS ─────────────────────────┐ │ BN: [Empty]                  │  │
│  │ 37. Team Delta: Pedro Martinez (2000)  │ │ BN: [Empty]                  │  │
│  │ 36. Team Gamma: Barry Bonds (2001)     │ │ BN: [Empty]                  │  │
│  │ 35. Team Beta: Hank Aaron (1971)       │ │ ────────────────────────────  │  │
│  │ 34. Team Alpha: Mariano Rivera (1996)  │ │ Positions: C:1 IF:1 OF:1     │  │
│  │ [View Full Draft Board]                │ │            SP:1 RP:0 CL:1    │  │
│  └─────────────────────────────────────────┘ └──────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Position Assignment Modal

```
┌─────────────────────────────────────────────────────────┐
│  ASSIGN POSITION                               [X]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  You selected: Ken Griffey Jr. (1997)                  │
│  Eligible Positions: CF, LF, RF                        │
│  WAR: 9.4 | AVG: .304 | HR: 56 | RBI: 147             │
│                                                         │
│  Assign to:                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ OF Slot 1 (Empty)                             │   │
│  │ ○ OF Slot 2 (Empty)                             │   │
│  │ ○ OF Slot 3 (Empty)                             │   │
│  │ ○ DH (Empty)                                    │   │
│  │ ○ Bench 1 (Empty)                               │   │
│  │ ○ Bench 2 (Empty)                               │   │
│  │ ○ Bench 3 (Empty)                               │   │
│  │ ○ Bench 4 (Empty)                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│               [Cancel]        [Confirm Draft]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.5 Mobile Responsive Considerations

- Collapsible panels for roster/player list
- Bottom sheet for position assignment
- Swipe gestures for navigation between views
- Touch-friendly draft buttons (minimum 44px tap targets)
- Horizontal scroll for player stats table

---

## 8. Technical Specifications

### 8.1 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Framework | React 18+ | Component-based, large ecosystem |
| Language | TypeScript | Type safety, better DX |
| State Management | Redux Toolkit | Complex state, time-travel debugging |
| Styling | Tailwind CSS | Rapid development, responsive |
| Build Tool | Vite | Fast builds, modern tooling |
| Testing | Vitest + React Testing Library | Fast, React-optimized |
| Hosting | Vercel / Netlify | Free tier, CDN, easy deploy |

### 8.2 Browser Storage

```typescript
// Storage keys
const STORAGE_KEYS = {
  DRAFT_STATE: 'bbdraft_current_state',
  SAVED_DRAFTS: 'bbdraft_saved_drafts',
  PLAYER_CACHE: 'bbdraft_player_cache',
  PREFERENCES: 'bbdraft_preferences'
};

// Storage limits (approximate)
// LocalStorage: 5-10 MB
// IndexedDB: 50+ MB (for player data cache)
```

### 8.3 Performance Optimizations

1. **Virtual Scrolling** - React-window for 10,000+ player list
2. **Memoization** - useMemo/useCallback for expensive filters
3. **Web Workers** - CPU draft calculations off main thread
4. **Service Worker** - Cache player data files
5. **Code Splitting** - Lazy load draft board components
6. **Compression** - Gzip all JSON data files

### 8.4 Data Extraction Approach

**Option A: Pre-scraped Static Data (Recommended)**

Build a one-time data extraction script that:
1. Scrapes Baseball-Reference.com programmatically (respecting robots.txt)
2. Extracts all player seasons 1901-2025
3. Normalizes data into JSON format
4. Runs annually to add new season data

```python
# Example extraction script structure
# scripts/extract_player_data.py

import requests
from bs4 import BeautifulSoup
import json
import time

def extract_season(year: int) -> list:
    """Extract all players for a given season."""
    # Respect rate limits (2-3 second delays)
    # Parse batting and pitching tables
    # Return normalized player objects
    pass

def main():
    all_players = []
    for year in range(1901, 2026):
        players = extract_season(year)
        all_players.extend(players)
        time.sleep(3)  # Be respectful
    
    # Split into chunks and save
    save_chunked_data(all_players)
```

**Option B: API Integration (If Available)**

If Baseball-Reference offers an API (or use alternative like Stathead/FanGraphs API), integrate directly. Check terms of service.

---

## 9. API & Data Source Strategy

### 9.1 Baseball-Reference.com Considerations

**Challenges:**
- No public API available
- robots.txt restricts automated access
- Terms of service prohibit scraping for commercial use

**Recommendations:**
1. **Primary**: Use a pre-existing open dataset (Lahman Database, retrosheet.org)
2. **Alternative**: Stathead subscription API (if budget allows)
3. **Last Resort**: Manual data compilation from public sources

### 9.2 Recommended Data Sources

| Source | Coverage | Format | Cost | License |
|--------|----------|--------|------|---------|
| Lahman Database | 1871-2023 | CSV/SQL | Free | CC BY-SA 3.0 |
| Retrosheet | 1871-present | Various | Free | Free for non-commercial |
| Chadwick Bureau | 1871-present | CSV | Free | Open Data Commons |
| Stathead API | 1901-present | JSON | $8/mo | Commercial |

**Recommendation:** Use **Lahman Database** as primary source:
- Comprehensive historical data
- Includes WAR calculations
- Well-structured relational format
- Active community maintenance
- Free and legally clear

### 9.3 Data Refresh Process

```bash
# Annual update script
#!/bin/bash

# 1. Download latest Lahman database
wget https://github.com/chadwickbureau/baseballdatabank/archive/master.zip

# 2. Run transformation script
python scripts/transform_lahman_to_json.py

# 3. Validate data integrity
python scripts/validate_data.py

# 4. Deploy updated data files
vercel deploy --prod
```

---

## 10. Database Recommendation

### 10.1 Final Verdict: No Database Required

For this application, a **database is NOT required** and would add unnecessary complexity.

**Justification:**

| Requirement | Database Solution | Static JSON Solution |
|-------------|-------------------|---------------------|
| Player data storage | ✓ Query on demand | ✓ Load and cache client-side |
| Draft state persistence | ✓ Server-side storage | ✓ LocalStorage + file export |
| Multi-user support | ✓ Required | ✗ Not needed |
| Data updates | ✓ Easy updates | ✓ Redeploy (annual) |
| Cost | Free tier limits | Completely free |
| Offline support | ✗ Requires connection | ✓ Full offline after load |
| Complexity | Higher | Lower |

### 10.2 If Database Becomes Necessary

If requirements change (e.g., multiplayer, persistent leaderboards), consider:

| Service | Free Tier | Best For |
|---------|-----------|----------|
| Supabase | 500MB, 50K rows | PostgreSQL, real-time |
| PlanetScale | 5GB, 1B reads | MySQL, branching |
| MongoDB Atlas | 512MB | Document store, flexible schema |
| Firebase | 1GB, 50K reads/day | Real-time sync, NoSQL |

---

## 11. Deployment Strategy

### 11.1 Hosting Recommendation: Vercel

**Free Tier Includes:**
- Unlimited static deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Global CDN
- Preview deployments

### 11.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install & Build
        run: |
          npm ci
          npm run build
          npm run test
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

### 11.3 Environment Structure

```
Environments:
├── Development (localhost:5173)
├── Preview (*.vercel.app)
└── Production (yourdomain.com)
```

---

## 12. Risk Assessment

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large data file slow to load | Medium | High | Chunk data, lazy load, service worker caching |
| Browser storage limits | Low | Medium | Use IndexedDB for large datasets |
| Data source unavailable | Low | Critical | Use multiple source options, maintain local copy |
| LocalStorage corruption | Low | High | Auto-backup, export/import functionality |

### 12.2 Data Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Incomplete historical data | Medium | Medium | Use multiple data sources, document gaps |
| Incorrect WAR calculations | Low | Low | Use authoritative source (Lahman), validate |
| Position eligibility disputes | Medium | Low | Document eligibility rules, allow customization |

---

## 13. Future Considerations

### 13.1 Potential Enhancements

1. **Multiplayer Support** - Real-time drafts with WebSockets
2. **Draft Modes** - Auction draft, keeper leagues
3. **Analytics Dashboard** - Team strength comparisons, draft grades
4. **Historical Comparisons** - Compare drafted teams to real championship teams
5. **Mobile Apps** - Native iOS/Android applications
6. **League Management** - Multi-draft seasons, standings

### 13.2 Technical Debt Considerations

- Plan for React 19 migration
- Consider SWR/React Query for data fetching
- Evaluate Zustand as lighter Redux alternative
- Progressive Web App (PWA) capabilities

---

## Appendix A: Roster Position Eligibility Rules

| Roster Slot | Eligible Positions |
|-------------|-------------------|
| C | C only |
| 1B | 1B only |
| 2B | 2B only |
| SS | SS only |
| 3B | 3B only |
| OF (x3) | LF, CF, RF, OF |
| SP (x4) | SP only (GS > 50% of G) |
| RP (x3) | RP only (GS < 50% of G) |
| CL | RP with 10+ saves |
| DH | Any position |
| BN (x4) | Any position |

## Appendix B: CPU Draft Logic Weights

```typescript
const CPU_DRAFT_WEIGHTS = {
  // Position scarcity multipliers
  positionScarcity: {
    C: 1.3,    // Catchers are scarce
    SS: 1.2,   // Premium position
    '2B': 1.1,
    '3B': 1.1,
    '1B': 1.0,
    OF: 1.0,
    SP: 1.15,  // Aces valuable
    RP: 0.9,
    CL: 1.25   // Elite closers rare
  },
  
  // Need multiplier (increases as roster fills)
  needMultiplier: {
    0: 2.0,    // Desperately need
    1: 1.5,    // Still need
    2: 1.0,    // Comfortable
    3: 0.5     // Well stocked
  },
  
  // Randomization range (±%)
  randomFactor: 0.10
};
```

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| bWAR | Baseball-Reference Wins Above Replacement |
| DH | Designated Hitter |
| ERA | Earned Run Average |
| OPS | On-base Plus Slugging |
| WHIP | Walks + Hits per Inning Pitched |
| Snake Draft | Draft order reverses each round |

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | Senior Software Engineer | Initial draft |

---

*End of Document*

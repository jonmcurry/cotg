# Clubhouse Redesign Plan

## Problem
Current design has cumbersome vertical sidebar for team selection. Roster data needs more screen real estate.

## Solution
Replace sidebar with premium "Team Selector Modal" - click team name to open modal.

## Visual Aesthetic
- Theme: Vintage Baseball / Premium Official Document
- Background: Off-white/Cream paper texture (#f4f1ea)
- Accents: Deep Burgundy (#800020) and Gold (#bfa15f)
- Typography: Serif for headers, sans-serif for stats
- Shadows: Soft, diffuse "card on desk" feel

## Implementation Checklist

### Phase 1: Create Team Selector Modal Component
- [x] Create TeamSelectorModal.tsx component
- [x] Grid layout (4 columns) for team buttons
- [x] Dark overlay background when open
- [x] Burgundy hover state
- [x] Close on team select or backdrop click

### Phase 2: Update Clubhouse Layout
- [x] Remove sidebar completely
- [x] Make main content area full width (centered, 90% max)
- [x] Add "OFFICIAL ROSTER" header with team name dropdown
- [x] Team name + chevron-down triggers modal
- [x] Keep existing tabs (Full Roster, Lineups, Rotation)

### Phase 3: Style Updates
- [x] Paper card styling for main content
- [x] Update header to match spec
- [x] Add subtle shadow for "card on desk" feel
- [x] Serif fonts for headers, names

## Layout Structure

```
+--------------------------------------------------+
| THE CLUBHOUSE | Season Prep | [StatMaster Btn]   |  <- Dark header
+--------------------------------------------------+
|                                                   |
|  +---------------------------------------------+  |
|  |            OFFICIAL ROSTER                  |  |  <- White paper card
|  |        [Providence Wildcats v]              |  |  <- Click for modal
|  |  +---------------------------------------+  |  |
|  |  | Full Roster | Lineups | Rotation      |  |  |  <- Tabs
|  |  +---------------------------------------+  |  |
|  |                                           |  |  |
|  |  INFIELD                                  |  |  |
|  |  C: Fisk, Carlton (BOS '72)        .293   |  |  |
|  |  1B: Howard, Ryan (PHI '06)        .313   |  |  |
|  |  ...                                      |  |  |
|  +---------------------------------------------+  |
|                                                   |
+--------------------------------------------------+

MODAL (when team name clicked):
+--------------------------------------------------+
| (darkened backdrop)                               |
|                                                   |
|     +------------------------------------+        |
|     |        SELECT TEAM                 |        |
|     +------------------------------------+        |
|     | Team 1     | Team 2    | Team 3    |        |
|     | Team 4     | Team 5    | Team 6    |        |
|     | ...        | ...       | ...       |        |
|     +------------------------------------+        |
+--------------------------------------------------+
```

## Test Cases
1. Modal opens when team name clicked
2. Modal closes when team selected
3. Modal closes when backdrop clicked
4. Selected team updates correctly
5. Full width layout renders properly
6. All tabs still function correctly

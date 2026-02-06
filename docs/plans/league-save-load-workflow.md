# League Save/Load Workflow Fix Plan

## Problem
When a user creates a league and starts drafting, there's no easy way to:
1. Continue a draft after page refresh
2. Understand the save/load workflow
3. Resume from where they left off

## Current Architecture Analysis

### What's Already Working
1. **League persistence**: Leagues ARE saved to database via `POST /api/leagues`
2. **Draft session persistence**: Sessions ARE saved to database via `POST /api/draft/sessions`
3. **League-draft link**: `linkDraftSession()` links draft to league in database
4. **LocalStorage**: Both stores use Zustand `persist` middleware
   - `league-storage` persists `currentLeague`
   - `draft-session-storage` persists `session`

### The Gap
When user refreshes:
1. Home screen doesn't show "Continue Draft" option
2. User must go to "Load League" -> select league -> wait for session load
3. App.tsx shows alert: "Draft session not found in local storage" in some cases
4. `loadSession()` exists but isn't called automatically when loading a league

## Solution

### Phase 1: Add "Continue Draft/Season" Button on Home Screen
When `session` exists in localStorage with status `in_progress`, `completed`, or `clubhouse`:
- Show prominent "Continue" button on home screen
- Route directly to appropriate screen based on session status

### Phase 2: Auto-Load Session When Loading League
In `handleSelectLeague()`:
- When `league.draftSessionId` exists but `session` doesn't match
- Call `loadSession(league.draftSessionId)` before routing
- Remove the TODO comment and alert

## Implementation Checklist

### Phase 1: Continue Button
- [x] Read session from localStorage in App.tsx
- [x] Show "Continue Draft" button if session exists and is in_progress
- [x] Show "Continue to Clubhouse" if session is completed/clubhouse
- [x] Wire up button to navigate to correct screen

### Phase 2: Auto-Load Session
- [x] Modify handleSelectLeague to await loadSession when needed
- [x] Remove alert and TODO comment
- [x] Test: Create league -> Start draft -> Refresh -> Load League -> Verify session loads

## Test Cases
1. Create league -> Start draft -> Refresh -> Should see "Continue Draft" button
2. Create league -> Complete draft -> Refresh -> Should see "Continue to Clubhouse" button
3. Create league -> Start draft -> Refresh -> Load League -> Should auto-load session
4. New user (no localStorage) -> Should see normal home screen

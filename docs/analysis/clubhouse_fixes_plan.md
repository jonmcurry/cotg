# Clubhouse Code Review Fixes - Implementation Plan

**Date:** 2026-02-02

## Fixes

- [ ] 1. **Fix `generateSeasonSchedule` fire-and-forget** (Critical)
  - Refactor store's `generateSeasonSchedule` to `async`, return `Promise`
  - Update store type signature: `generateSeasonSchedule: (gamesPerTeam?: number) => Promise<void>`
  - Clubhouse: `await` the call, catch errors, use `finally` for state reset
  - Remove `setTimeout` hack

- [ ] 2. **Remove external URL dependency** (Critical)
  - Replace `transparenttextures.com` URL in `LineupEditor.tsx:166` with inline SVG data URI or remove

- [ ] 3. **Add lineup/rotation validation before season start** (Moderate)
  - Add validation function in `Clubhouse.tsx`
  - Gate "Enter StatMaster" button on all teams having valid lineups
  - Show missing items to user

- [ ] 4. **Fix `loadedRef` stale data** (Moderate)
  - Replace `loadedRef` with a cache key based on actual season IDs
  - Re-fetch when roster composition changes

- [ ] 5. **Extract shared player transformation utility** (Moderate)
  - Create `src/utils/transformPlayerData.ts`
  - Replace duplicate transforms in DraftBoard.tsx and Clubhouse.tsx
  - Ensure both include `bats` field (DraftBoard is currently missing it)

- [ ] 6. **Cap setup men list** (Low)
  - Add max 4 setup men limit in RotationEditor

- [ ] 7. **Remove `getSlotDisplay` wrapper** (Minor)
  - Inline `players.find()` in LineupEditor

- [ ] 8. **Add defensive `rotation?.length` check** (Minor)
  - Use optional chaining in RotationEditor initialization guard

- [ ] 9. Update changelog (Rule 10)
- [ ] 10. Verify build
- [ ] 11. Commit (Rule 9)

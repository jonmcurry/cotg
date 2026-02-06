# CPU Batch Size Fix Plan

## Problem
With all-CPU drafts (32 teams, no humans), the batch endpoint tries to make ALL 672 picks (32 x 21 rounds) in one request, causing timeout.

## Evidence from Logs
- Backend: "Updated cache after pick 1", "pick 2"... (making picks)
- Frontend: "No picks yet" (never receives response)
- Batch endpoint runs in while loop until human turn or completion
- With all CPU teams, loop never exits (no human turn)

## Root Cause
`/cpu-picks-batch` endpoint has no batch size limit:
```typescript
while (continueLoop) {
  // Make pick
  // Only exits when:
  // 1. Human turn (never with all CPU)
  // 2. Draft complete (672 picks later!)
  // 3. Error
}
```

## Solution
Add MAX_BATCH_SIZE constant to limit picks per request:
```typescript
const MAX_BATCH_SIZE = 50  // Return after 50 picks to update UI

while (continueLoop && picks.length < MAX_BATCH_SIZE) {
  // Make pick
}
```

This allows:
- UI to update progressively (shows picks as they're made)
- Multiple batch calls for full draft
- Better timeout resistance

## Implementation
1. Add MAX_BATCH_SIZE constant
2. Add check in while loop condition
3. Log when batch limit reached
4. Frontend will re-trigger useEffect for next batch

## Test Cases
1. All CPU draft (32 teams) - should complete in multiple batches
2. Mixed draft - should work same as before
3. Each batch returns within timeout

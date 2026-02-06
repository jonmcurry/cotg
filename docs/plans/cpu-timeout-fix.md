# CPU Batch Timeout Fix Plan

## Issue
CPU batch picks timing out after 55 seconds, only completing ~17 picks

## Root Cause Analysis
From Render logs:
- `[Cache] Loaded 76560 players in 21028ms` - 21 seconds just to load players!
- Each pick takes 2-4 seconds
- 55 second timeout = 21s (load) + 34s = only ~10-17 picks before timeout

The player cache loading is happening INSIDE the batch request, consuming most of the timeout budget.

## Solution
Pre-warm the player cache BEFORE calling the batch endpoint:
1. When draft starts (status -> 'in_progress'), call a warmup endpoint
2. Frontend waits for warmup to complete
3. Then call batch picks - cache is already warm, only picks need to happen
4. 55 seconds is now available for ~20-27 picks per batch

## Implementation Steps
- [x] Analyze timeout issue
- [x] Add /api/draft/sessions/:id/warmup endpoint to pre-warm cache
- [x] Frontend calls warmup before batch picks
- [x] Fix progress bar to show "Connecting to database..." instead of "0 of 1"
- [x] Update changelog and commit

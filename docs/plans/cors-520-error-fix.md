# CORS/520 Error Fix Plan

## Issue
- Starting a draft causes "CORS policy" error
- HTTP 520 status (Cloudflare/Render "Unknown Error")
- Console shows: "No 'Access-Control-Allow-Origin' header is present"

## Root Cause Analysis
The CORS error is a **symptom**, not the actual problem:

1. **Backend timeout**: When loading 60,000+ players from Neon DB, the query can take
   longer than Render's default 30-second timeout (especially on Neon cold starts)
2. **Render 520 error**: When request times out, Render returns HTTP 520 directly from
   its proxy layer, bypassing Express entirely
3. **Missing CORS headers**: Since Express never handles the response, CORS middleware
   doesn't run, causing browser to report CORS error

## Why It Happens
- Neon serverless has cold starts (5-15 seconds)
- Loading 60,000+ player rows takes additional time
- Total time can exceed 30 seconds on first request
- Render's proxy times out and returns 520 without CORS headers

## Solution

### Phase 1: Add Request Timeout Middleware
Add timeout middleware that returns a proper error response BEFORE Render's timeout:
- Set 25-second timeout (buffer before Render's 30s)
- Return proper JSON error with CORS headers
- Log timeout for debugging

### Phase 2: Add Database Connection Warming
- Warm up DB connection on server start
- Add /api/warmup endpoint for pre-flight warming
- Consider warming cache on session creation

### Phase 3: Improve Error Logging
- Add detailed timing logs for player pool loading
- Track which phase is slow (connection, query, transfer)

## Implementation Steps
- [ ] Add request timeout middleware to backend
- [ ] Add /api/warmup endpoint
- [ ] Add timing logs to player pool loading
- [ ] Test with Neon cold start scenario
- [ ] Update changelog and commit

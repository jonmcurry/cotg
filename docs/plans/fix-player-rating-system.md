# Fix Player Rating System

## Problem
Player ratings are inaccurate - Gary Sanchez rated higher than Babe Ruth. This suggests fundamental issues with the rating calculation algorithm.

## User Requirements
- Position should NOT dictate player rating
- This is strictly an offensive rating system
- Need to reverse engineer from original APBA Baseball for Windows v3.0

## Investigation Plan

### Step 1: Examine Current Implementation ⏳
- Read `src/utils/apbaRating.ts` to understand current formula
- Identify flaws in position scarcity multipliers
- Check if defensive ratings are incorrectly factoring in

### Step 2: Analyze Actual Data ⏳
- Query database for Gary Sanchez ratings
- Query database for Babe Ruth ratings
- Compare their stats to understand why Gary > Babe
- Identify which formula components are wrong

### Step 3: Reverse Engineer APBA BBW Data ⏳
- Examine `C:\dosgames\shared\BBW` directory structure
- Find APBA player rating data files
- Extract actual APBA ratings for known players
- Reverse engineer the formula from real data

### Step 4: Cross-Reference Bill James Data ⏳
- Check `C:\dosgames\shared\BJEBEW` for rating methodology
- Look for offensive rating formulas
- Verify if APBA uses Bill James formulas

### Step 5: Design Correct Formula ⏳
- Pure offensive rating (no position multipliers)
- Based on actual APBA methodology
- Validate against known legendary players

### Step 6: Implement Fix ⏳
- Update `src/utils/apbaRating.ts`
- Recalculate all ratings via script
- Verify Babe Ruth > Gary Sanchez

### Step 7: Document & Commit ⏳
- Update CHANGELOG.md
- Commit changes per CLAUDE.md Rule 9

## Technical Constraints
- Do not use position multipliers for offensive ratings
- Must be purely stats-based
- Should reflect actual APBA methodology
- Validate against multiple eras (dead-ball, live-ball, modern)

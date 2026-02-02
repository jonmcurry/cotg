# Draft AI Logic Review

## Executive Summary

The current Draft AI logic (`src/utils/cpuDraftLogic.ts`) successfully selects players and fills rosters, satisfying the basic requirement of fielding a legal team. However, a review of the code reveals a significant deviation from the stated "Best Player Available" (BPA) philosophy, specifically in how it prioritizes position selection over player quality.

## Findings

### 1. Structural Bias Against "Best Player Available" (BPA)
The existing algorithm forces a **Strict Position Targeting** flow:
1.  Identify needed positions.
2.  Rank positions by "Scarcity Weight".
3.  Select the **single highest-ranked position**.
4.  Draft the best player **at that specific position**.

**Impact**: The AI never compares players across positions.
*   *Example*: If "Catcher" is the most scarce need, the AI will draft the best available Catcher, even if that Catcher is a 50-rated player and there is a 99-rated Shortstop available.
*   *Conclusion*: This invalidates the claim that the AI takes the "Best Player Available" in early rounds. It actually takes the "Best Player at the Most Scarce Position".

### 2. Early Round Logic Contradiction
The code attempts to adjust behavior by round:
```typescript
// Early rounds (1-5): Emphasize scarcity more
if (currentRound <= 5) {
  const adjusted = baseWeight * 1.2
  return adjusted
}
```
**Impact**: By *increasing* the scarcity weight in early rounds, the AI becomes **more rigid**, not less. It reinforces the behavior of locking into specific positions (like Catcher or Shortstop) regardless of the actual talent pool available. A true BPA approach would *decrease* or ignore position scarcity in early rounds to allow acquiring elite talent anywhere.

### 3. Documentation vs. Implementation Discrepancy
*   **Documentation (`docs/trd-ai-draft-algorithm.md`)**: Describes a system based on **WAR** (Wins Above Replacement) and distinct logic for "Best Player Available" in rounds 1-5. It also mentions penalties for filled positions rather than strict filtering.
*   **Implementation (`src/utils/cpuDraftLogic.ts`)**: Uses **APBA Rating**, ignores WAR for drafting, and uses a strict filtering mechanism where it identifies unfilled positions first.

### 4. Team Balance & Platoon Logic
*   **Strengths**: The logic correctly identifies roster requirements (`ROSTER_REQUIREMENTS`) and ensures teams fill all slots. It includes a "Platoon Bonus" to value players with complementary batting handedness.
*   **Weaknesses**: The "Strict Position Targeting" prevents the AI from opportunistically fixing balance issues. For example, if it decides it needs a starting pitcher, it won't pivot to a bench bat even if the hitting talent is significantly higher.

## Recommendations

To achieve true "Best Player Available" behavior and better team balance:

1.  **Refactor Selection Flow**:
    *   Instead of picking a *Target Position* first, score the top X players from *all* unfilled positions simultaneously.
    *   Apply the "Scarcity Weight" as a multiplier to the player's score, rather than a filter for the candidate pool.
    *   *New Flow*: `Candidates (All Needs) -> Score = (Rating * Scarcity) -> Pick Top Score`.
    
2.  **Invert Early Round Scarcity**:
    *   In rounds 1-5, *reduce* the impact of scarcity weights to allow raw Rating to dominate (True BPA).
    *   Currently, the code increases scarcity impact, heavily biasing the draft.

3.  **Update Documentation**:
    *   Align the technical documentation with the actual APBA Rating-based implementation.

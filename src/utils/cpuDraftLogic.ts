/**
 * CPU Draft AI Logic
 * Implements intelligent auto-drafting based on SRD requirements (FR-CPU-001 to FR-CPU-005)
 *
 * Algorithm:
 * 1. Identify unfilled required positions
 * 2. Weight positions by scarcity (C, SS weighted higher)
 * 3. Find top 3-5 players at needed positions by APBA Rating
 * 4. Apply randomization factor (±10% rating weight)
 * 5. Select highest weighted player
 */

import type { DraftTeam, PositionCode } from '../types/draft.types'
import { ROSTER_REQUIREMENTS, POSITION_ELIGIBILITY } from '../types/draft.types'

export interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string

  // Stats
  apba_rating: number | null  // APBA-style rating (0-100 scale) - primary metric for drafting
  war: number | null  // Keep for reference, but use apba_rating for drafting
  at_bats: number | null  // Used to determine if player qualifies as position player (>= 200, filters out NL pitchers pre-DH)
  batting_avg: number | null
  hits: number | null
  home_runs: number | null
  rbi: number | null
  stolen_bases: number | null
  on_base_pct: number | null
  slugging_pct: number | null

  // Pitching
  innings_pitched_outs: number | null  // Used to determine if player qualifies as pitcher (>= 30)
  wins: number | null
  losses: number | null
  era: number | null
  strikeouts_pitched: number | null
  saves: number | null
  shutouts: number | null
  whip: number | null

  // Player info (from join)
  display_name?: string
  first_name?: string
  last_name?: string
  bats?: 'L' | 'R' | 'B' | null  // Batting handedness: L=Left, R=Right, B=Both/Switch
}

// Position scarcity weights (higher = more scarce = draft earlier)
const POSITION_SCARCITY: Record<PositionCode, number> = {
  'C': 1.5,   // Catchers are scarce
  'SS': 1.4,  // Premium shortstops are scarce
  '1B': 1.0,
  '2B': 1.1,
  '3B': 1.1,
  'OF': 0.9,  // Lots of outfielders
  'SP': 1.2,  // Starting pitchers are important
  'RP': 0.8,
  'CL': 1.3,  // Elite closers are scarce
  'DH': 0.7,  // Can be any position
  'BN': 0.5,  // Bench - least priority
}

/**
 * Adjust position scarcity weight based on draft round
 * Early rounds: Emphasize scarcity (+20%)
 * Mid rounds: Use base weights
 * Late rounds: De-emphasize scarcity (-20%), focus on BPA
 */
function adjustScarcityByRound(
  baseWeight: number,
  currentRound: number
): number {
  // Early rounds (1-5): Emphasize scarcity more
  if (currentRound <= 5) {
    const adjusted = baseWeight * 1.2
    console.log(`[CPU Draft] Round ${currentRound} (early): Scarcity ${baseWeight} → ${adjusted.toFixed(2)} (+20%)`)
    return adjusted
  }

  // Mid rounds (6-15): Use base weights
  if (currentRound <= 15) {
    console.log(`[CPU Draft] Round ${currentRound} (mid): Scarcity ${baseWeight} (base)`)
    return baseWeight
  }

  // Late rounds (16+): Reduce scarcity emphasis, focus on BPA
  const adjusted = baseWeight * 0.8
  console.log(`[CPU Draft] Round ${currentRound} (late): Scarcity ${baseWeight} → ${adjusted.toFixed(2)} (-20%)`)
  return adjusted
}

/**
 * Get unfilled positions for a team
 */
export function getUnfilledPositions(team: DraftTeam): PositionCode[] {
  const unfilled: PositionCode[] = []

  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, required]) => {
    const posCode = position as PositionCode
    const filled = team.roster.filter(
      slot => slot.position === posCode && slot.isFilled
    ).length

    if (filled < required) {
      // Add position once for each unfilled slot
      for (let i = 0; i < required - filled; i++) {
        unfilled.push(posCode)
      }
    }
  })

  return unfilled
}

/**
 * Check if player qualifies for a position
 */
export function playerQualifiesForPosition(
  playerPosition: string,
  rosterPosition: PositionCode
): boolean {
  const eligiblePositions = POSITION_ELIGIBILITY[rosterPosition] || []
  return eligiblePositions.includes(playerPosition)
}

/**
 * Calculate weighted score for a player
 * Combines APBA Rating, position scarcity, platoon balance, and randomization
 * @param scarcityWeight - Optional pre-calculated scarcity weight (e.g., round-adjusted). If not provided, uses base weight.
 */
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,
  randomizationFactor: number = 0.1,
  scarcityWeight?: number
): number {
  const rating = player.apba_rating || 0  // Use APBA rating instead of WAR
  const effectiveScarcityWeight = scarcityWeight ?? (POSITION_SCARCITY[position] || 1.0)

  // Platoon bonus: reward balanced lineup
  let platoonBonus = 1.0

  // Only apply to position players (not SP, RP, CL)
  if (position !== 'SP' && position !== 'RP' && position !== 'CL') {
    const filledRoster = team.roster.filter(s => s.isFilled)

    const existingLefties = filledRoster.filter(s => s.playerBats === 'L').length
    const existingRighties = filledRoster.filter(s => s.playerBats === 'R').length
    const existingSwitchHitters = filledRoster.filter(s => s.playerBats === 'B').length

    console.log(`[CPU Draft] Platoon check - Team has L:${existingLefties} R:${existingRighties} B:${existingSwitchHitters}`)

    // Prefer minority handedness for balance
    if (player.bats === 'L' && existingLefties < existingRighties) {
      platoonBonus = 1.05  // 5% bonus
      console.log(`[CPU Draft] Platoon bonus: +5% for lefty (minority)`)
    } else if (player.bats === 'R' && existingRighties < existingLefties) {
      platoonBonus = 1.05  // 5% bonus
      console.log(`[CPU Draft] Platoon bonus: +5% for righty (minority)`)
    } else if (player.bats === 'B') {
      platoonBonus = 1.10  // 10% bonus (switch hitters valuable)
      console.log(`[CPU Draft] Platoon bonus: +10% for switch hitter`)
    }
  }

  // Apply randomization (±10% by default)
  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  const finalScore = rating * effectiveScarcityWeight * platoonBonus * randomness

  console.log(`[CPU Draft] Score calculation: rating=${rating} × scarcity=${effectiveScarcityWeight.toFixed(2)} × platoon=${platoonBonus} × random=${randomness.toFixed(3)} = ${finalScore.toFixed(2)}`)

  return finalScore
}

/**
 * Select best available player for CPU team
 * Follows SRD algorithm (FR-CPU-001 to FR-CPU-005)
 * @param draftedPlayerIds - Set of player_id values (not playerSeasonId) to exclude ALL seasons of drafted players
 */
export function selectBestPlayer(
  availablePlayers: PlayerSeason[],
  team: DraftTeam,
  draftedPlayerIds: Set<string>,
  currentRound: number = 1
): {
  player: PlayerSeason
  position: PositionCode
  slotNumber: number
} | null {
  // Filter out already drafted players (by player_id, not playerSeasonId)
  // This prevents the same player from being drafted multiple times for different seasons
  const undraftedPlayers = availablePlayers.filter(
    p => !draftedPlayerIds.has(p.player_id)
  )

  if (undraftedPlayers.length === 0) {
    return null
  }

  // Step 1: Identify unfilled required positions
  const unfilledPositions = getUnfilledPositions(team)

  let targetPosition: PositionCode = 'BN'
  let targetScarcityWeight: number | undefined = undefined
  let candidates: PlayerSeason[] = []

  if (unfilledPositions.length > 0) {
    // Step 2: Weight positions by scarcity with round adjustment
    const positionWeights = unfilledPositions.map(pos => {
      const baseWeight = POSITION_SCARCITY[pos] || 1.0
      const adjustedWeight = adjustScarcityByRound(baseWeight, currentRound)

      return {
        position: pos,
        weight: adjustedWeight,
      }
    })

    // Sort by weight descending and pick the most scarce unfilled position
    positionWeights.sort((a, b) => b.weight - a.weight)
    targetPosition = positionWeights[0].position
    targetScarcityWeight = positionWeights[0].weight

    console.log(`[CPU Draft] Target position: ${targetPosition} (scarcity weight: ${targetScarcityWeight.toFixed(2)})`)

    // Step 3: Find players who qualify for this position
    candidates = undraftedPlayers.filter(player =>
      playerQualifiesForPosition(player.primary_position, targetPosition)
    )

    // If no candidates for preferred position, try next position
    for (let i = 1; i < positionWeights.length && candidates.length === 0; i++) {
      targetPosition = positionWeights[i].position
      targetScarcityWeight = positionWeights[i].weight
      console.log(`[CPU Draft] No candidates for previous position, trying ${targetPosition} (scarcity weight: ${targetScarcityWeight.toFixed(2)})`)
      candidates = undraftedPlayers.filter(player =>
        playerQualifiesForPosition(player.primary_position, targetPosition)
      )
    }
  }

  // Step 4: If all required positions filled, draft best available for bench
  if (candidates.length === 0) {
    targetPosition = 'BN'
    targetScarcityWeight = undefined  // Use base weight for bench
    console.log(`[CPU Draft] All positions filled, drafting for bench (BN)`)
    candidates = undraftedPlayers
  }

  console.log(`[CPU Draft] Found ${candidates.length} candidates for ${targetPosition}`)

  // Step 5: Calculate weighted scores and select top player
  const scoredCandidates = candidates.map(player => ({
    player,
    score: calculateWeightedScore(player, targetPosition, team, 0.1, targetScarcityWeight),
  }))

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score)

  // Take top 3-5 candidates and randomly pick one (adds unpredictability)
  const topCount = Math.min(5, scoredCandidates.length)
  const topCandidates = scoredCandidates.slice(0, topCount)
  const selectedIndex = Math.floor(Math.random() * topCandidates.length)
  const selected = topCandidates[selectedIndex]

  if (!selected) {
    return null
  }

  // Find the first available slot for this position
  const availableSlot = team.roster.find(
    slot => slot.position === targetPosition && !slot.isFilled
  )

  if (!availableSlot) {
    console.error('No available slot found for position:', targetPosition)
    return null
  }

  return {
    player: selected.player,
    position: targetPosition,
    slotNumber: availableSlot.slotNumber,
  }
}

/**
 * Get CPU draft recommendation with explanation
 * @param draftedPlayerIds - Set of player_id values (not playerSeasonId) to exclude ALL seasons of drafted players
 */
export function getCPUDraftRecommendation(
  availablePlayers: PlayerSeason[],
  team: DraftTeam,
  draftedPlayerIds: Set<string>
): {
  player: PlayerSeason
  position: PositionCode
  slotNumber: number
  reasoning: string
} | null {
  const selection = selectBestPlayer(availablePlayers, team, draftedPlayerIds)

  if (!selection) {
    return null
  }

  const unfilledPositions = getUnfilledPositions(team)
  const rating = selection.player.apba_rating?.toFixed(1) || 'N/A'

  let reasoning = ''
  if (unfilledPositions.length > 0) {
    reasoning = `Filling ${selection.position} (Rating: ${rating}) - needed position`
  } else {
    reasoning = `Best available player (Rating: ${rating}) for bench`
  }

  return {
    ...selection,
    reasoning,
  }
}

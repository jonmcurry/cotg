/**
 * CPU Draft AI Logic
 * Implements intelligent auto-drafting based on SRD requirements (FR-CPU-001 to FR-CPU-005)
 *
 * Algorithm (True Best Player Available):
 * 1. Identify ALL unfilled required positions
 * 2. Find eligible candidates for EVERY unfilled position
 * 3. Score ALL candidates: Rating x Scarcity x Volume x Platoon x Randomness
 *    - Early rounds (1-5): Scarcity reduced (-20%) so raw talent dominates
 *    - Mid rounds (6-15): Base scarcity weights
 *    - Late rounds (16+): Scarcity increased (+20%) to fill roster gaps
 * 4. Select from top 5 scored candidates (adds unpredictability)
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
// Hitters weighted above pitchers; premium defensive positions prioritized
// Aces rise via volume multiplier, not scarcity alone
const POSITION_SCARCITY: Record<PositionCode, number> = {
  'C': 1.6,    // Premium defense - scarce quality catchers
  'SS': 1.5,   // Premium defense - scarce quality shortstops
  'OF': 1.3,   // High demand (3 slots), CF premium
  '2B': 1.2,   // Middle infield premium
  '3B': 1.2,   // Corner infield premium
  '1B': 1.1,   // Solid but replaceable
  'SP': 1.15,  // Aces rise via volume bonus; average SPs wait
  'CL': 0.8,   // Devalued - low innings, late-round targets
  'DH': 0.7,   // Can be any position
  'RP': 0.6,   // Devalued - low innings, deep pool
  'BN': 0.5,   // Bench - least priority
}

/**
 * Adjust position scarcity weight based on draft round
 * Early rounds: REDUCE scarcity so raw talent (Rating) dominates (True BPA)
 * Mid rounds: Use base weights (balanced)
 * Late rounds: INCREASE scarcity to fill remaining roster gaps
 */
function adjustScarcityByRound(
  baseWeight: number,
  currentRound: number
): number {
  // Early rounds (1-5): Reduce scarcity impact - let raw Rating dominate (True BPA)
  if (currentRound <= 5) {
    return baseWeight * 0.8
  }

  // Mid rounds (6-15): Use base weights (balanced approach)
  if (currentRound <= 15) {
    return baseWeight
  }

  // Late rounds (16+): Increase scarcity emphasis to fill roster gaps
  return baseWeight * 1.2
}

/**
 * Round-based position type preference
 * Enforces the draft strategy: hitters first (rounds 1-5), balanced (6-10), pitching depth (11+)
 */
function getPositionTypeBonus(position: PositionCode, currentRound: number): number {
  const isHitterSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(position)
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(position)

  // Rounds 1-5: Focus on acquiring high-quality hitters
  if (currentRound <= 5) {
    if (isHitterSlot) return 1.25
    if (isPitcherSlot) return 0.75
  }

  // Rounds 6-10: Balanced - start mixing in pitching
  if (currentRound <= 10) {
    return 1.0
  }

  // Rounds 11+: Build pitching depth, fill remaining slots
  if (isPitcherSlot) return 1.15
  if (isHitterSlot) return 0.85

  return 1.0
}

/**
 * Calculate volume multiplier based on playing time
 * Rewards workhorses (high IP / high AB) and penalizes low-volume players (relievers)
 * innings_pitched_outs field stores OUTS, not innings (e.g., 200 IP = 600 outs)
 */
function calculateVolumeMultiplier(
  player: PlayerSeason,
  position: PositionCode
): number {
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(position)

  if (isPitcherSlot) {
    const outs = player.innings_pitched_outs || 0
    if (outs > 600) return 1.15    // >200 IP: Workhorse ace bonus
    if (outs > 450) return 1.1     // >150 IP: Solid starter bonus
    if (outs < 180) return 0.8     // <60 IP: Low volume penalty (relievers, closers)
    return 1.0                      // 60-150 IP: No adjustment
  }

  // Position players: reward everyday players
  const atBats = player.at_bats || 0
  if (atBats > 450) return 1.15
  return 1.0
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
 * Check if player meets minimum playing time requirements for a roster position
 * Position players (C, 1B, 2B, SS, 3B, OF, DH): Must have 200+ at-bats
 * Pitchers (SP, RP, CL): Must have 30+ innings pitched (90+ outs)
 * Bench (BN): Either position player OR pitcher qualifications
 */
export function meetsPlayingTimeRequirements(
  player: PlayerSeason,
  rosterPosition: PositionCode
): boolean {
  const atBats = player.at_bats || 0
  const inningsPitchedOuts = player.innings_pitched_outs || 0

  // Position player slots require 200+ at-bats
  const isPositionPlayerSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(rosterPosition)
  if (isPositionPlayerSlot) {
    return atBats >= 200
  }

  // Pitcher slots require 30+ innings (90+ outs)
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(rosterPosition)
  if (isPitcherSlot) {
    return inningsPitchedOuts >= 90
  }

  // Bench can be either position player OR pitcher
  if (rosterPosition === 'BN') {
    return atBats >= 200 || inningsPitchedOuts >= 90
  }

  // Fallback: allow if either qualification is met
  return atBats >= 200 || inningsPitchedOuts >= 90
}

/**
 * Calculate weighted score for a player
 * Combines APBA Rating, position scarcity, volume, platoon balance, and randomization
 * Formula: Rating x Scarcity x Volume x Platoon x Randomness
 * @param scarcityWeight - Optional pre-calculated scarcity weight (e.g., round-adjusted). If not provided, uses base weight.
 */
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,
  randomizationFactor: number = 0.1,
  scarcityWeight?: number,
  currentRound: number = 1
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
    // Prefer minority handedness for balance
    if (player.bats === 'L' && existingLefties < existingRighties) {
      platoonBonus = 1.05  // 5% bonus for lefty minority
    } else if (player.bats === 'R' && existingRighties < existingLefties) {
      platoonBonus = 1.05  // 5% bonus for righty minority
    } else if (player.bats === 'B') {
      platoonBonus = 1.10  // 10% bonus (switch hitters valuable)
    }
  }

  // Volume multiplier: rewards workhorses, penalizes low-volume players
  const volumeMultiplier = calculateVolumeMultiplier(player, position)

  // Position type bonus: hitters first in early rounds, pitching depth later
  const posTypeBonus = getPositionTypeBonus(position, currentRound)

  // Apply randomization (±10% by default)
  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  return rating * effectiveScarcityWeight * volumeMultiplier * platoonBonus * posTypeBonus * randomness
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

  // Step 1: Identify unfilled required positions (deduplicated for scoring)
  const unfilledPositions = getUnfilledPositions(team)

  // Deduplicate positions (getUnfilledPositions returns one entry per slot, e.g. OF x3)
  const uniqueUnfilledPositions = [...new Set(unfilledPositions)]

  // If no unfilled positions, check bench
  if (uniqueUnfilledPositions.length === 0) {
    const benchSlotsAvailable = team.roster.filter(
      slot => slot.position === 'BN' && !slot.isFilled
    ).length

    if (benchSlotsAvailable > 0) {
      uniqueUnfilledPositions.push('BN')
    } else {
      return null
    }
  }

  // Step 2: Score ALL candidates across ALL unfilled positions simultaneously (True BPA)
  // Instead of picking a target position first, we evaluate every eligible player
  // for every unfilled position and pick the highest overall score.
  interface ScoredCandidate {
    player: PlayerSeason
    position: PositionCode
    score: number
  }

  const allScoredCandidates: ScoredCandidate[] = []

  for (const position of uniqueUnfilledPositions) {
    const baseWeight = POSITION_SCARCITY[position] || 1.0
    const adjustedWeight = adjustScarcityByRound(baseWeight, currentRound)

    // Find players who qualify for this position (eligibility + playing time)
    const eligible = undraftedPlayers.filter(player =>
      playerQualifiesForPosition(player.primary_position, position) &&
      meetsPlayingTimeRequirements(player, position)
    )

    if (eligible.length === 0) {
      continue
    }

    // Score each eligible player for this position
    for (const player of eligible) {
      const score = calculateWeightedScore(player, position, team, 0.1, adjustedWeight, currentRound)
      allScoredCandidates.push({ player, position, score })
    }
  }

  if (allScoredCandidates.length === 0) {
    // Fallback: try bench if we haven't already
    if (!uniqueUnfilledPositions.includes('BN')) {
      const benchSlotsAvailable = team.roster.filter(
        slot => slot.position === 'BN' && !slot.isFilled
      ).length

      if (benchSlotsAvailable > 0) {
        const benchWeight = adjustScarcityByRound(POSITION_SCARCITY['BN'] || 0.5, currentRound)
        const benchCandidates = undraftedPlayers.filter(player =>
          meetsPlayingTimeRequirements(player, 'BN')
        )
        for (const player of benchCandidates) {
          const score = calculateWeightedScore(player, 'BN', team, 0.1, benchWeight, currentRound)
          allScoredCandidates.push({ player, position: 'BN', score })
        }
      }
    }

    if (allScoredCandidates.length === 0) {
      return null
    }
  }

  // Step 3: Sort all candidates by score descending and select
  allScoredCandidates.sort((a, b) => b.score - a.score)

  // Take top 3-5 candidates and randomly pick one (adds unpredictability)
  const topCount = Math.min(5, allScoredCandidates.length)
  const topCandidates = allScoredCandidates.slice(0, topCount)
  const selectedIndex = Math.floor(Math.random() * topCandidates.length)
  const selected = topCandidates[selectedIndex]

  if (!selected) {
    return null
  }

  // Find the first available slot for this position
  const availableSlot = team.roster.find(
    slot => slot.position === selected.position && !slot.isFilled
  )

  if (!availableSlot) {
    console.error(`[CPU Draft] ERROR: No available slot found for position: ${selected.position}`)
    return null
  }

  return {
    player: selected.player,
    position: selected.position,
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
  draftedPlayerIds: Set<string>,
  currentRound: number = 1
): {
  player: PlayerSeason
  position: PositionCode
  slotNumber: number
  reasoning: string
} | null {
  const selection = selectBestPlayer(availablePlayers, team, draftedPlayerIds, currentRound)

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

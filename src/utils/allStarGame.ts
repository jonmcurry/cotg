/**
 * All-Star Game Utility
 * Selects rosters and simulates the mid-season All-Star Game
 *
 * Selection Logic:
 * - Split all teams into two squads (odd/even by draft position)
 * - Select top hitters by OPS, top pitchers by ERA
 * - Simulate using existing game engine with synthetic teams
 */

import type { DraftTeam } from '../types/draft.types'
import type { ScheduledGame, GameResult } from '../types/schedule.types'
import type { PlayerSeason } from './cpuDraftLogic'

export interface AllStarRoster {
  squadName: string
  hitters: PlayerSeason[]
  pitchers: PlayerSeason[]
  teamIds: string[]
}

export interface AllStarGameResult {
  homeSquad: AllStarRoster
  awaySquad: AllStarRoster
  result: GameResult
}

const HITTERS_PER_SQUAD = 9
const PITCHERS_PER_SQUAD = 5

/**
 * Select All-Star rosters from all teams
 * Splits teams into two squads based on draft position (odd vs even)
 * Then picks top performers from each squad
 */
export function selectAllStarRosters(
  teams: DraftTeam[],
  allPlayers: PlayerSeason[]
): { homeSquad: AllStarRoster; awaySquad: AllStarRoster } {
  // Split teams into two groups
  const sortedTeams = [...teams].sort((a, b) => a.draftPosition - b.draftPosition)
  const squadATeams = sortedTeams.filter((_, i) => i % 2 === 0)
  const squadBTeams = sortedTeams.filter((_, i) => i % 2 !== 0)

  const homeSquad = buildSquadRoster('Stars', squadATeams, allPlayers)
  const awaySquad = buildSquadRoster('Legends', squadBTeams, allPlayers)

  return { homeSquad, awaySquad }
}

function buildSquadRoster(
  squadName: string,
  squadTeams: DraftTeam[],
  allPlayers: PlayerSeason[]
): AllStarRoster {
  const teamIds = squadTeams.map(t => t.id)

  // Get all players from these teams
  const playerIds = new Set(
    squadTeams.flatMap(t =>
      t.roster
        .filter(s => s.isFilled && s.playerSeasonId)
        .map(s => s.playerSeasonId!)
    )
  )

  const squadPlayers = allPlayers.filter(p => playerIds.has(p.id))

  // Split into position players and pitchers
  const positionPlayers = squadPlayers.filter(p =>
    !['P', 'SP', 'RP', 'CL'].includes(p.primary_position || '')
  )
  const pitchers = squadPlayers.filter(p =>
    ['P', 'SP', 'RP', 'CL'].includes(p.primary_position || '')
  )

  // Rank hitters by OPS (OBP + SLG), fallback to batting avg
  const rankedHitters = [...positionPlayers].sort((a, b) => {
    const opsA = (a.on_base_pct || 0) + (a.slugging_pct || 0)
    const opsB = (b.on_base_pct || 0) + (b.slugging_pct || 0)
    return opsB - opsA
  })

  // Rank pitchers by ERA (lower is better), filter for those with real innings
  const rankedPitchers = [...pitchers]
    .filter(p => (p.innings_pitched_outs || 0) > 0)
    .sort((a, b) => (a.era || 99) - (b.era || 99))

  return {
    squadName,
    hitters: rankedHitters.slice(0, HITTERS_PER_SQUAD),
    pitchers: rankedPitchers.slice(0, PITCHERS_PER_SQUAD),
    teamIds,
  }
}

/**
 * Simulate the All-Star Game
 * Uses a simplified version: random outcome weighted by squad quality
 */
export function simulateAllStarGame(
  homeSquad: AllStarRoster,
  awaySquad: AllStarRoster
): GameResult {
  // Calculate squad strength from player stats
  const homeOffense = calculateSquadOffense(homeSquad.hitters)
  const awayOffense = calculateSquadOffense(awaySquad.hitters)
  const homePitching = calculateSquadPitching(homeSquad.pitchers)
  const awayPitching = calculateSquadPitching(awaySquad.pitchers)

  // Simulate 9 innings using squad-level probabilities
  let homeScore = 0
  let awayScore = 0

  for (let inning = 1; inning <= 9; inning++) {
    // Away team bats (offense vs home pitching)
    awayScore += simulateAllStarHalfInning(awayOffense, homePitching)
    // Home team bats (offense vs away pitching)
    homeScore += simulateAllStarHalfInning(homeOffense, awayPitching)
  }

  // Ensure no tie - play extra innings
  while (homeScore === awayScore) {
    awayScore += simulateAllStarHalfInning(awayOffense, homePitching)
    homeScore += simulateAllStarHalfInning(homeOffense, awayPitching)
  }

  return {
    homeScore,
    awayScore,
    innings: homeScore === awayScore ? undefined : 9, // Will be > 9 if extras
  }
}

function calculateSquadOffense(hitters: PlayerSeason[]): number {
  if (hitters.length === 0) return 0.300
  const avgOPS = hitters.reduce((sum, p) => {
    return sum + (p.on_base_pct || 0.300) + (p.slugging_pct || 0.400)
  }, 0) / hitters.length
  return avgOPS
}

function calculateSquadPitching(pitchers: PlayerSeason[]): number {
  if (pitchers.length === 0) return 4.00
  const avgERA = pitchers.reduce((sum, p) => sum + (p.era || 4.00), 0) / pitchers.length
  return avgERA
}

/**
 * Simulate one half-inning for the All-Star Game
 * Returns runs scored
 */
function simulateAllStarHalfInning(offenseStrength: number, pitchingERA: number): number {
  // Base run probability per inning: ~0.5 runs average
  // Adjust by offense strength (higher OPS = more runs) and pitching (lower ERA = fewer runs)
  const baseProb = 0.5
  const offenseMultiplier = offenseStrength / 0.750 // Normalize around league-avg OPS
  const pitchingMultiplier = 4.00 / Math.max(pitchingERA, 1.00) // Lower ERA = harder to score

  const adjustedProb = baseProb * offenseMultiplier / pitchingMultiplier

  let runs = 0
  // Simulate scoring opportunities (max 5 per half-inning to keep realistic)
  for (let i = 0; i < 5; i++) {
    if (Math.random() < adjustedProb * 0.2) {
      runs++
    }
  }

  return runs
}

/**
 * Find the All-Star Game in the schedule
 */
export function findAllStarGame(games: ScheduledGame[]): ScheduledGame | null {
  return games.find(g => g.isAllStarGame) || null
}

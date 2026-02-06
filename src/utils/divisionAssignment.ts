/**
 * Division Assignment Utility
 * Auto-assigns teams to leagues and divisions based on draft position
 *
 * Structure:
 * - AL: East, West, North, South
 * - NL: East, West, North, South
 * - 8 divisions total
 */

import type { LeagueType, DivisionType } from '../types/draft.types'

export interface DivisionAssignment {
  league: LeagueType
  division: DivisionType
}

const DIVISIONS: DivisionType[] = ['East', 'West', 'North', 'South']

/**
 * Assigns divisions to teams based on their draft position
 *
 * Algorithm:
 * - First half of teams (by draft position) go to AL
 * - Second half go to NL
 * - Within each league, teams are distributed evenly across 4 divisions
 *
 * @param numTeams Total number of teams
 * @returns Array of division assignments indexed by draft position (0-based)
 */
export function assignDivisions(numTeams: number): DivisionAssignment[] {
  const assignments: DivisionAssignment[] = []

  // Split teams into two leagues
  const teamsPerLeague = Math.ceil(numTeams / 2)
  const teamsPerDivision = Math.ceil(teamsPerLeague / 4)

  for (let i = 0; i < numTeams; i++) {
    // First half = AL, second half = NL
    const league: LeagueType = i < teamsPerLeague ? 'AL' : 'NL'

    // Position within the league (0-based)
    const positionInLeague = i < teamsPerLeague ? i : i - teamsPerLeague

    // Determine division based on position within league
    const divisionIndex = Math.min(
      Math.floor(positionInLeague / teamsPerDivision),
      3 // Cap at index 3 (South)
    )

    const division = DIVISIONS[divisionIndex]

    assignments.push({ league, division })
  }

  return assignments
}

/**
 * Get a formatted division name (e.g., "AL East")
 */
export function formatDivisionName(league: LeagueType, division: DivisionType): string {
  return `${league} ${division}`
}

/**
 * Get all division names in display order
 */
export function getAllDivisions(): { league: LeagueType; division: DivisionType; name: string }[] {
  const result: { league: LeagueType; division: DivisionType; name: string }[] = []

  for (const league of ['AL', 'NL'] as LeagueType[]) {
    for (const division of DIVISIONS) {
      result.push({
        league,
        division,
        name: formatDivisionName(league, division)
      })
    }
  }

  return result
}

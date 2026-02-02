/**
 * League System Type Definitions
 * Defines types for persistent leagues, configuration, and workflow state
 */

export type LeagueStatus = 'draft' | 'in_season' | 'playoffs' | 'completed'
export type PlayoffFormat = 'none' | 'wild_card' | 'division' | 'expanded'

export interface LeagueConfig {
  name: string
  description?: string
  numTeams: number
  gamesPerSeason: number
  playoffFormat: PlayoffFormat
  useDH: boolean
  useApbaRules: boolean
  injuryEnabled: boolean
  weatherEffects: boolean
}

export interface League {
  id: string
  name: string
  description: string | null
  seasonYear: number
  numTeams: number
  gamesPerSeason: number
  playoffFormat: PlayoffFormat
  useDH: boolean
  useApbaRules: boolean
  injuryEnabled: boolean
  weatherEffects: boolean
  status: LeagueStatus
  currentGameDate: string | null
  draftSessionId: string | null
  createdAt: Date
  updatedAt: Date
}

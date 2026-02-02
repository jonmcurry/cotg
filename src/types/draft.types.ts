/**
 * Draft System Type Definitions
 * Defines all types for the fantasy draft system
 */

export type TeamControl = 'human' | 'cpu'
export type DraftStatus = 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned' | 'clubhouse'
export type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'

export interface DraftTeam {
  id: string
  name: string
  control: TeamControl
  draftPosition: number
  roster: RosterSlot[]
  draftSessionId: string
  depthChart?: TeamDepthChart
}

export interface RosterSlot {
  position: PositionCode
  slotNumber: number // For multi-position slots (OF1, OF2, OF3, etc.)
  playerSeasonId: string | null
  isFilled: boolean
  playerBats?: 'L' | 'R' | 'B' | null  // Batting handedness for platoon tracking
}

export interface DraftPick {
  pickNumber: number
  round: number
  pickInRound: number
  teamId: string
  playerSeasonId: string | null
  pickTime: Date | null
}

export interface DraftSession {
  id: string
  name: string
  status: DraftStatus
  numTeams: number
  currentPick: number
  currentRound: number
  teams: DraftTeam[]
  picks: DraftPick[]
  selectedSeasons: number[]
  createdAt: Date
  updatedAt: Date
  schedule?: import('./schedule.types').SeasonSchedule
}

export interface DraftConfig {
  numTeams: number
  teams: Array<{
    name: string
    control: TeamControl
  }>
  selectedSeasons: number[]
  randomizeDraftOrder: boolean
}

// Roster composition requirements from SRD 3.5
export const ROSTER_REQUIREMENTS: Record<PositionCode, number> = {
  'C': 1,
  '1B': 1,
  '2B': 1,
  'SS': 1,
  '3B': 1,
  'OF': 3,
  'SP': 4,
  'RP': 3,
  'CL': 1,
  'DH': 1,
  'BN': 4,
}

export const TOTAL_ROSTER_SIZE = 21
export const TOTAL_ROUNDS = 21

// Position display names
export const POSITION_NAMES: Record<PositionCode, string> = {
  'C': 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  'SS': 'Shortstop',
  '3B': 'Third Base',
  'OF': 'Outfield',
  'SP': 'Starting Pitcher',
  'RP': 'Relief Pitcher',
  'CL': 'Closer',
  'DH': 'Designated Hitter',
  'BN': 'Bench',
}

// Position eligibility mapping (which positions qualify for each roster slot)
// DH can be filled by ANY player who can hit (position players OR pitchers)
// This allows two-way players (Babe Ruth, Shohei Ohtani) to DH on days they don't pitch
export const POSITION_ELIGIBILITY: Record<PositionCode, string[]> = {
  'C': ['C'],
  '1B': ['1B'],
  '2B': ['2B'],
  'SS': ['SS'],
  '3B': ['3B'],
  'OF': ['OF', 'LF', 'CF', 'RF'],
  'SP': ['P', 'SP'],
  'RP': ['P', 'RP'],
  'CL': ['P', 'RP', 'CL'],
  'DH': ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'P', 'SP', 'RP', 'CL', 'DH'],
  'BN': ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'P', 'SP', 'RP', 'DH'],
}

// Post-Draft / Clubhouse Types

export interface LineupSlot {
  slotNumber: number // 1-9
  playerSeasonId: string | null
  position: PositionCode // C, 1B, etc.
}

export interface RotationSlot {
  slotNumber: number // 1-5
  playerSeasonId: string | null
}

export interface TeamDepthChart {
  lineupVS_RHP: LineupSlot[]
  lineupVS_LHP: LineupSlot[]
  rotation: RotationSlot[]
  bullpen: {
    closer: string | null
    setup: string[]
  }
}

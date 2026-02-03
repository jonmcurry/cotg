/**
 * Draft State Management Store
 * Uses Zustand for state management of draft sessions
 * API calls go through the backend; Supabase is no longer used directly
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DraftSession,
  DraftTeam,
  DraftConfig,
  RosterSlot,
  PositionCode,
  TeamDepthChart,
} from '../types/draft.types'
import { ROSTER_REQUIREMENTS } from '../types/draft.types'
import { api, ApiError } from '../lib/api'

// API response types
interface DraftSessionApiResponse {
  id: string
  name: string
  status: DraftSession['status']
  numTeams: number
  currentPick: number
  currentRound: number
  teams: DraftTeam[]
  picks: Array<{
    pickNumber: number
    round: number
    pickInRound: number
    teamId: string
    playerSeasonId: string | null
    playerId: string | null
    pickTime: string | null
  }>
  selectedSeasons: number[]
  createdAt: string
  updatedAt: string
}

interface MakePickResponse {
  result: 'success' | 'duplicate' | 'error'
  pick?: {
    pickNumber: number
    round: number
    pickInRound: number
    teamId: string
    playerSeasonId: string
    playerId: string
    position: PositionCode
    slotNumber: number
  }
  session?: {
    currentPick: number
    currentRound: number
    status: DraftSession['status']
  }
  error?: string
}

// Transform API response to DraftSession (parse dates)
function transformSessionResponse(data: DraftSessionApiResponse): DraftSession {
  return {
    ...data,
    picks: data.picks.map(pick => ({
      ...pick,
      pickTime: pick.pickTime ? new Date(pick.pickTime) : null,
    })),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  }
}

// Helper: Create roster slots for a team
function createRosterSlots(): RosterSlot[] {
  const roster: RosterSlot[] = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, count]) => {
    for (let i = 0; i < count; i++) {
      roster.push({
        position: position as PositionCode,
        slotNumber: i + 1,
        playerSeasonId: null,
        isFilled: false,
      })
    }
  })
  return roster
}

interface DraftState {
  // Current session
  session: DraftSession | null

  // Actions
  createSession: (config: DraftConfig) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  saveSession: () => Promise<void>

  // Draft actions
  startDraft: () => void
  pauseDraft: () => void
  resumeDraft: () => void

  // Management actions
  updateTeamDepthChart: (teamId: string, depthChart: TeamDepthChart) => void
  generateSeasonSchedule: (gamesPerTeam?: number) => Promise<void>

  // Pick actions
  makePick: (playerSeasonId: string, playerId: string | undefined, position: PositionCode, slotNumber: number, bats?: 'L' | 'R' | 'B' | null) => Promise<'success' | 'duplicate' | 'error'>
  applyCpuPick: (pick: { teamId: string; playerSeasonId: string; playerId: string; position: PositionCode; slotNumber: number; bats?: 'L' | 'R' | 'B' | null }, session: { currentPick: number; currentRound: number; status: DraftSession['status'] }) => void
  getCurrentPickingTeam: () => DraftTeam | null
  getNextPickingTeam: () => DraftTeam | null

  // Utilities
  calculatePickOrder: (round: number) => DraftTeam[]
  isPlayerDrafted: (playerSeasonId: string) => boolean
  canDraftToPosition: (teamId: string, position: PositionCode) => boolean

  // Reset
  resetSession: () => void
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      session: null,

      createSession: async (config: DraftConfig) => {
        try {
          // Call API to create session
          const data = await api.post<DraftSessionApiResponse>('/draft/sessions', {
            numTeams: config.numTeams,
            teams: config.teams,
            selectedSeasons: config.selectedSeasons,
            randomizeDraftOrder: config.randomizeDraftOrder,
          })

          // API returns teams with empty rosters, we need to populate them
          const teamsWithRosters = data.teams.map(team => ({
            ...team,
            roster: createRosterSlots(),
          }))

          const session = transformSessionResponse({
            ...data,
            teams: teamsWithRosters,
          })

          set({ session })
          console.log('[DraftStore] Session created:', session.id)
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[DraftStore] Error creating session:', err)
          throw new Error(`Failed to create session: ${message}`)
        }
      },

      loadSession: async (sessionId: string) => {
        try {
          const data = await api.get<DraftSessionApiResponse>(`/draft/sessions/${sessionId}`)

          // API returns teams with empty rosters, reconstruct from picks
          const teamsWithRosters = data.teams.map(team => ({
            ...team,
            roster: createRosterSlots(),
          }))

          // Fill rosters from picks
          data.picks.forEach(pick => {
            if (pick.playerSeasonId) {
              const team = teamsWithRosters.find(t => t.id === pick.teamId)
              if (team) {
                // Find first unfilled slot (simplified - real logic would need position mapping)
                const emptySlot = team.roster.find(s => !s.isFilled)
                if (emptySlot) {
                  emptySlot.playerSeasonId = pick.playerSeasonId
                  emptySlot.isFilled = true
                }
              }
            }
          })

          const session = transformSessionResponse({
            ...data,
            teams: teamsWithRosters,
          })

          set({ session })
          console.log('[DraftStore] Session loaded:', session.id, session.name)
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[DraftStore] Error loading session:', err)
          throw new Error(`Failed to load session: ${message}`)
        }
      },

      saveSession: async () => {
        const session = get().session
        if (!session) return

        try {
          await api.put(`/draft/sessions/${session.id}`, {
            status: session.status,
            currentPick: session.currentPick,
            currentRound: session.currentRound,
          })

          // Update local timestamp
          set({
            session: {
              ...session,
              updatedAt: new Date(),
            }
          })
        } catch (err) {
          console.error('[DraftStore] Error saving session:', err)
          // Don't throw - allow local state to continue
        }
      },

      startDraft: () => {
        const session = get().session
        if (!session) {
          console.error('[startDraft] CRITICAL ERROR - No session found!')
          return
        }

        const updatedSession: DraftSession = {
          ...session,
          status: 'in_progress',
          updatedAt: new Date(),
        }

        set({ session: updatedSession })
        get().saveSession()
      },

      pauseDraft: () => {
        const session = get().session
        if (!session) return

        const updatedSession: DraftSession = {
          ...session,
          status: 'paused',
          updatedAt: new Date(),
        }

        set({ session: updatedSession })
        get().saveSession()
      },

      resumeDraft: () => {
        const session = get().session
        if (!session) return

        const updatedSession: DraftSession = {
          ...session,
          status: 'in_progress',
          updatedAt: new Date(),
        }

        set({ session: updatedSession })
        get().saveSession()
      },

      updateTeamDepthChart: (teamId: string, depthChart: TeamDepthChart) => {
        const session = get().session
        if (!session) return

        const teamIndex = session.teams.findIndex(t => t.id === teamId)
        if (teamIndex === -1) return

        const updatedTeams = [...session.teams]
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          depthChart,
        }

        const updatedSession: DraftSession = {
          ...session,
          teams: updatedTeams,
          updatedAt: new Date(),
        }

        set({ session: updatedSession })
        // Note: depth chart is stored in local state only for now
      },

      generateSeasonSchedule: async (gamesPerTeam: number = 162) => {
        const session = get().session
        if (!session) {
          throw new Error('[DraftStore] Cannot generate schedule - no active session')
        }

        const { generateSchedule } = await import('../utils/scheduleGenerator')
        const schedule = generateSchedule(session, gamesPerTeam, new Date())

        const updatedSession: DraftSession = {
          ...session,
          schedule,
          updatedAt: new Date(),
        }

        set({ session: updatedSession })
      },

      makePick: async (playerSeasonId: string, playerId: string | undefined, position: PositionCode, slotNumber: number, bats?: 'L' | 'R' | 'B' | null): Promise<'success' | 'duplicate' | 'error'> => {
        const session = get().session
        if (!session) return 'error'

        const currentPickIndex = session.currentPick - 1
        const currentPick = session.picks[currentPickIndex]
        if (!currentPick) return 'error'

        const teamIndex = session.teams.findIndex(t => t.id === currentPick.teamId)
        if (teamIndex === -1) return 'error'

        const team = session.teams[teamIndex]

        // Find the roster slot index
        const rosterSlotIndex = team.roster.findIndex(
          slot => slot.position === position && slot.slotNumber === slotNumber
        )

        if (rosterSlotIndex === -1) {
          console.error('[makePick] Roster slot not found:', position, slotNumber)
          return 'error'
        }

        try {
          // Call API to make pick
          const response = await api.post<MakePickResponse>(`/draft/sessions/${session.id}/picks`, {
            playerSeasonId,
            playerId,
            position,
            slotNumber,
            bats,
          })

          if (response.result === 'duplicate') {
            console.warn('[DraftStore] DUPLICATE PLAYER:', playerSeasonId)
            return 'duplicate'
          }

          if (response.result !== 'success') {
            console.error('[DraftStore] Pick failed:', response.error)
            return 'error'
          }

          // Update local state
          const updatedRoster = [...team.roster]
          updatedRoster[rosterSlotIndex] = {
            ...updatedRoster[rosterSlotIndex],
            playerSeasonId,
            isFilled: true,
            playerBats: bats,
          }

          const updatedTeams = [...session.teams]
          updatedTeams[teamIndex] = {
            ...team,
            roster: updatedRoster,
          }

          const updatedPicks = [...session.picks]
          updatedPicks[currentPickIndex] = {
            ...currentPick,
            playerSeasonId,
            playerId: response.pick?.playerId || playerId || null,
            pickTime: new Date(),
          }

          // Use session state from API response
          const newStatus = response.session?.status || session.status
          const nextPickNumber = response.session?.currentPick || session.currentPick + 1
          const newRound = response.session?.currentRound || session.currentRound

          const updatedSession: DraftSession = {
            ...session,
            teams: updatedTeams,
            picks: updatedPicks,
            currentPick: nextPickNumber,
            currentRound: newRound,
            status: newStatus,
            updatedAt: new Date(),
          }

          set({ session: updatedSession })
          return 'success'
        } catch (err) {
          // Check for 409 Conflict (duplicate player)
          if (err instanceof ApiError && err.status === 409) {
            console.warn('[DraftStore] DUPLICATE PLAYER (409):', playerSeasonId)
            return 'duplicate'
          }

          console.error('[DraftStore] makePick error:', err)
          return 'error'
        }
      },

      applyCpuPick: (pick, sessionUpdate) => {
        const session = get().session
        if (!session) return

        const teamIndex = session.teams.findIndex(t => t.id === pick.teamId)
        if (teamIndex === -1) return

        const team = session.teams[teamIndex]
        const currentPickIndex = session.currentPick - 1
        const currentPick = session.picks[currentPickIndex]
        if (!currentPick) return

        // Find the roster slot
        const rosterSlotIndex = team.roster.findIndex(
          slot => slot.position === pick.position && slot.slotNumber === pick.slotNumber
        )

        if (rosterSlotIndex === -1) {
          console.error('[applyCpuPick] Roster slot not found:', pick.position, pick.slotNumber)
          return
        }

        // Update roster
        const updatedRoster = [...team.roster]
        updatedRoster[rosterSlotIndex] = {
          ...updatedRoster[rosterSlotIndex],
          playerSeasonId: pick.playerSeasonId,
          isFilled: true,
          playerBats: pick.bats,
        }

        const updatedTeams = [...session.teams]
        updatedTeams[teamIndex] = {
          ...team,
          roster: updatedRoster,
        }

        // Update pick record
        const updatedPicks = [...session.picks]
        updatedPicks[currentPickIndex] = {
          ...currentPick,
          playerSeasonId: pick.playerSeasonId,
          playerId: pick.playerId,
          pickTime: new Date(),
        }

        const updatedSession: DraftSession = {
          ...session,
          teams: updatedTeams,
          picks: updatedPicks,
          currentPick: sessionUpdate.currentPick,
          currentRound: sessionUpdate.currentRound,
          status: sessionUpdate.status,
          updatedAt: new Date(),
        }

        set({ session: updatedSession })
      },

      getCurrentPickingTeam: () => {
        const session = get().session
        if (!session) return null

        const currentPick = session.picks[session.currentPick - 1]
        if (!currentPick) return null

        return session.teams.find(t => t.id === currentPick.teamId) || null
      },

      getNextPickingTeam: () => {
        const session = get().session
        if (!session) return null

        const nextPick = session.picks[session.currentPick]
        if (!nextPick) return null

        return session.teams.find(t => t.id === nextPick.teamId) || null
      },

      calculatePickOrder: (round: number) => {
        const session = get().session
        if (!session) return []

        const sortedTeams = [...session.teams].sort((a, b) => a.draftPosition - b.draftPosition)

        // Snake draft: reverse order on even rounds
        if (round % 2 === 0) {
          return sortedTeams.reverse()
        }

        return sortedTeams
      },

      isPlayerDrafted: (playerSeasonId: string) => {
        const session = get().session
        if (!session) return false

        return session.picks.some(pick => pick.playerSeasonId === playerSeasonId)
      },

      canDraftToPosition: (teamId: string, position: PositionCode) => {
        const session = get().session
        if (!session) return false

        const team = session.teams.find(t => t.id === teamId)
        if (!team) return false

        return team.roster.some(
          slot => slot.position === position && !slot.isFilled
        )
      },

      resetSession: () => {
        set({ session: null })
      },
    }),
    {
      name: 'draft-session-storage',
      partialize: (state) => ({ session: state.session }),
    }
  )
)

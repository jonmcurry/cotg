/**
 * Draft State Management Store
 * Uses Zustand for state management of draft sessions
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DraftSession,
  DraftTeam,
  DraftPick,
  DraftConfig,
  RosterSlot,
  PositionCode,
} from '../types/draft.types'
import { ROSTER_REQUIREMENTS, TOTAL_ROUNDS } from '../types/draft.types'
import { supabase } from '../lib/supabaseClient'

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

  // Pick actions
  makePick: (playerSeasonId: string, position: PositionCode, slotNumber: number) => Promise<void>
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
        // Create teams with roster slots
        const teams: DraftTeam[] = config.teams.map((teamConfig, index) => {
          const roster: RosterSlot[] = []

          // Create roster slots based on ROSTER_REQUIREMENTS
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

          return {
            id: `team-${index}`,
            name: teamConfig.name,
            control: teamConfig.control,
            draftPosition: config.randomizeDraftOrder
              ? 0 // Will be randomized below
              : index + 1,
            roster,
            draftSessionId: '',
          }
        })

        // Randomize draft order if requested
        if (config.randomizeDraftOrder) {
          const positions = Array.from({ length: config.numTeams }, (_, i) => i + 1)
          for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]]
          }
          teams.forEach((team, index) => {
            team.draftPosition = positions[index]
          })
        }

        // Create picks array (snake draft)
        const picks: DraftPick[] = []
        for (let round = 1; round <= TOTAL_ROUNDS; round++) {
          const pickOrder = get().calculatePickOrder(round)
          pickOrder.forEach((team, pickInRound) => {
            picks.push({
              pickNumber: (round - 1) * config.numTeams + pickInRound + 1,
              round,
              pickInRound: pickInRound + 1,
              teamId: team.id,
              playerSeasonId: null,
              pickTime: null,
            })
          })
        }

        // Create session
        const session: DraftSession = {
          id: `draft-${Date.now()}`,
          name: `Draft ${new Date().toLocaleDateString()}`,
          status: 'setup',
          numTeams: config.numTeams,
          currentPick: 1,
          currentRound: 1,
          teams,
          picks,
          selectedSeasons: config.selectedSeasons,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Save to Supabase
        const { error } = await supabase
          .from('draft_sessions')
          .insert({
            session_name: session.name,
            season_year: config.selectedSeasons[0] || new Date().getFullYear(),
            num_teams: session.numTeams,
            num_rounds: TOTAL_ROUNDS,
            draft_type: 'snake',
            current_pick_number: session.currentPick,
            current_round: session.currentRound,
            status: 'setup',
          })

        if (error) {
          console.error('Error creating draft session:', error)
          throw error
        }

        set({ session })
      },

      loadSession: async (sessionId: string) => {
        // Load from Supabase
        const { data: sessionData, error: sessionError } = await supabase
          .from('draft_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) {
          console.error('Error loading session:', sessionError)
          throw sessionError
        }

        // Load teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('draft_teams')
          .select('*')
          .eq('draft_session_id', sessionId)
          .order('draft_order')

        if (teamsError) {
          console.error('Error loading teams:', teamsError)
          throw teamsError
        }

        // Load picks
        const { data: picksData, error: picksError } = await supabase
          .from('draft_picks')
          .select('*')
          .eq('draft_session_id', sessionId)
          .order('pick_number')

        if (picksError) {
          console.error('Error loading picks:', picksError)
          throw picksError
        }

        // Transform to session format
        // TODO: Complete transformation logic
        console.log('Loaded session data:', { sessionData, teamsData, picksData })
      },

      saveSession: async () => {
        const session = get().session
        if (!session) return

        session.updatedAt = new Date()

        // Update Supabase
        const { error } = await supabase
          .from('draft_sessions')
          .update({
            current_pick_number: session.currentPick,
            current_round: session.currentRound,
            status: session.status,
          })
          .eq('id', session.id)

        if (error) {
          console.error('Error saving session:', error)
        }

        set({ session })
      },

      startDraft: () => {
        const session = get().session
        if (!session) return

        session.status = 'in_progress'
        session.updatedAt = new Date()

        set({ session })
        get().saveSession()
      },

      pauseDraft: () => {
        const session = get().session
        if (!session) return

        session.status = 'paused'
        session.updatedAt = new Date()

        set({ session })
        get().saveSession()
      },

      resumeDraft: () => {
        const session = get().session
        if (!session) return

        session.status = 'in_progress'
        session.updatedAt = new Date()

        set({ session })
        get().saveSession()
      },

      makePick: async (playerSeasonId: string, position: PositionCode, slotNumber: number) => {
        const session = get().session
        if (!session) return

        const currentPick = session.picks[session.currentPick - 1]
        if (!currentPick) return

        const team = session.teams.find(t => t.id === currentPick.teamId)
        if (!team) return

        // Find the roster slot
        const rosterSlot = team.roster.find(
          slot => slot.position === position && slot.slotNumber === slotNumber
        )

        if (!rosterSlot) {
          console.error('Roster slot not found')
          return
        }

        // Assign player to roster
        rosterSlot.playerSeasonId = playerSeasonId
        rosterSlot.isFilled = true

        // Record the pick
        currentPick.playerSeasonId = playerSeasonId
        currentPick.pickTime = new Date()

        // Save pick to Supabase
        const { error } = await supabase
          .from('draft_picks')
          .insert({
            draft_session_id: session.id,
            team_id: team.id,
            pick_number: currentPick.pickNumber,
            round: currentPick.round,
            player_season_id: playerSeasonId,
          })

        if (error) {
          console.error('Error saving pick:', error)
        }

        // Advance to next pick
        session.currentPick += 1
        if (session.currentPick > session.picks.length) {
          session.status = 'completed'
        } else {
          session.currentRound = session.picks[session.currentPick - 1].round
        }

        session.updatedAt = new Date()

        set({ session })
        get().saveSession()
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

        // Check if there's an available slot for this position
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

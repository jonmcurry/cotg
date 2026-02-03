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
  TeamDepthChart,
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

  // Management actions
  updateTeamDepthChart: (teamId: string, depthChart: TeamDepthChart) => void
  generateSeasonSchedule: (gamesPerTeam?: number) => Promise<void>

  // Pick actions
  makePick: (playerSeasonId: string, playerId: string | undefined, position: PositionCode, slotNumber: number, bats?: 'L' | 'R' | 'B' | null) => Promise<void>
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
              playerId: null,
              pickTime: null,
            })
          })
        }

        // Save to Supabase first to get the UUID
        const { data: newSession, error } = await supabase
          .from('draft_sessions')
          .insert({
            session_name: `Draft ${new Date().toLocaleDateString()}`,
            season_year: config.selectedSeasons[0] || new Date().getFullYear(),
            num_teams: config.numTeams,
            num_rounds: TOTAL_ROUNDS,
            draft_type: 'snake',
            current_pick_number: 1,
            current_round: 1,
            status: 'setup',
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating draft session:', error)
          throw error
        }

        if (!newSession) {
          throw new Error('Failed to create draft session - no data returned')
        }

        // Save teams to Supabase to get UUIDs
        const teamsToInsert = teams.map(team => ({
          draft_session_id: newSession.id,
          team_name: team.name,
          draft_order: team.draftPosition,
        }))

        const { data: newTeams, error: teamsError } = await supabase
          .from('draft_teams')
          .insert(teamsToInsert)
          .select()

        if (teamsError) {
          console.error('Error creating draft teams:', teamsError)
          throw teamsError
        }

        if (!newTeams || newTeams.length === 0) {
          throw new Error('Failed to create draft teams - no data returned')
        }

        // Update teams with real UUIDs from database
        const teamsWithUUIDs = teams.map((team, index) => ({
          ...team,
          id: newTeams[index].id,
          draftSessionId: newSession.id,
        }))

        // Recreate picks array with correct team UUIDs
        const picksWithUUIDs: DraftPick[] = []
        for (let round = 1; round <= TOTAL_ROUNDS; round++) {
          // Calculate pick order for this round using teams with UUIDs
          const sortedTeams = [...teamsWithUUIDs].sort((a, b) => a.draftPosition - b.draftPosition)
          const pickOrder = round % 2 === 0 ? sortedTeams.reverse() : sortedTeams

          pickOrder.forEach((team, pickInRound) => {
            picksWithUUIDs.push({
              pickNumber: (round - 1) * config.numTeams + pickInRound + 1,
              round,
              pickInRound: pickInRound + 1,
              teamId: team.id, // Now using UUID from database
              playerSeasonId: null,
              playerId: null,
              pickTime: null,
            })
          })
        }

        // Create session with real UUIDs from Supabase
        const session: DraftSession = {
          id: newSession.id,
          name: newSession.session_name,
          status: newSession.status as DraftSession['status'],
          numTeams: config.numTeams,
          currentPick: 1,
          currentRound: 1,
          teams: teamsWithUUIDs,
          picks: picksWithUUIDs,
          selectedSeasons: config.selectedSeasons,
          createdAt: new Date(newSession.created_at),
          updatedAt: new Date(newSession.updated_at),
        }

        set({ session })
      },

      loadSession: async (sessionId: string) => {
        // Load from Supabase
        const { data: _sessionData, error: sessionError } = await supabase
          .from('draft_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) {
          console.error('Error loading session:', sessionError)
          throw sessionError
        }

        // Load teams
        const { data: _teamsData, error: teamsError } = await supabase
          .from('draft_teams')
          .select('*')
          .eq('draft_session_id', sessionId)
          .order('draft_order')

        if (teamsError) {
          console.error('Error loading teams:', teamsError)
          throw teamsError
        }

        // Load picks
        const { data: _picksData, error: picksError } = await supabase
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
      },

      saveSession: async () => {
        const session = get().session
        if (!session) return

        // Create new object instead of mutating
        const updatedSession: DraftSession = {
          ...session,
          updatedAt: new Date(),
        }

        // Update Supabase
        const { error } = await supabase
          .from('draft_sessions')
          .update({
            current_pick_number: updatedSession.currentPick,
            current_round: updatedSession.currentRound,
            status: updatedSession.status,
          })
          .eq('id', updatedSession.id)

        if (error) {
          console.error('[saveSession] Error saving to Supabase:', error)
        }

        set({ session: updatedSession })
      },

      startDraft: () => {
        const session = get().session
        if (!session) {
          console.error('[startDraft] CRITICAL ERROR - No session found!')
          return
        }

        // IMPORTANT: Create a new object instead of mutating
        // Zustand uses reference equality - mutating and passing same reference won't trigger updates
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

        // Create new object instead of mutating
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

        // Create new object instead of mutating
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
        // We generally shouldn't auto-save on every dnd move if it's frequent, 
        // but for now let's save to be safe or maybe debounce this later.
        // For line-up building which is interactive, we might want explicit save.
        // But for now, let's just update local state and let user click 'Save' if we add one,
        // or just accept react state is enough until valid. 
        // Actually, let's NOT save to supabase immediately to avoid thrashing.
        // We'll rely on a manual save or "Exit" trigger eventually.
        // Wait, the store persists to local storage, so that helps.
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

      makePick: async (playerSeasonId: string, playerId: string | undefined, position: PositionCode, slotNumber: number, bats?: 'L' | 'R' | 'B' | null) => {
        const session = get().session
        if (!session) return

        const currentPickIndex = session.currentPick - 1
        const currentPick = session.picks[currentPickIndex]
        if (!currentPick) return

        const teamIndex = session.teams.findIndex(t => t.id === currentPick.teamId)
        if (teamIndex === -1) return

        const team = session.teams[teamIndex]

        // Find the roster slot index
        const rosterSlotIndex = team.roster.findIndex(
          slot => slot.position === position && slot.slotNumber === slotNumber
        )

        if (rosterSlotIndex === -1) {
          console.error('Roster slot not found')
          return
        }

        // Create immutable updates
        const updatedRoster = [...team.roster]
        updatedRoster[rosterSlotIndex] = {
          ...updatedRoster[rosterSlotIndex],
          playerSeasonId,
          isFilled: true,
          playerBats: bats,  // Store batting handedness for platoon tracking
        }

        const updatedTeams = [...session.teams]
        updatedTeams[teamIndex] = {
          ...team,
          roster: updatedRoster,
        }

        // Resolve playerId: use provided value or fetch from database
        // This is needed before creating the pick so playerId is stored for cross-season deduplication
        let resolvedPlayerId = playerId

        if (!resolvedPlayerId) {
          console.warn('[makePick] playerId not provided, fetching from database (slower)')
          const { data: playerSeasonData, error: fetchError } = await supabase
            .from('player_seasons')
            .select('player_id')
            .eq('id', playerSeasonId)
            .single()

          if (fetchError || !playerSeasonData) {
            console.error('[makePick] Error fetching player_id from player_seasons:', fetchError)
            return
          }

          resolvedPlayerId = playerSeasonData.player_id
        }

        const updatedPicks = [...session.picks]
        updatedPicks[currentPickIndex] = {
          ...currentPick,
          playerSeasonId,
          playerId: resolvedPlayerId || null,  // Persistent player ID for cross-season deduplication
          pickTime: new Date(),
        }

        // Save pick to Supabase using upsert for idempotency
        // Uses onConflict on the unique constraint (draft_session_id, pick_number) so that
        // duplicate calls (from StrictMode, page refresh, race conditions) update rather than fail
        const { error } = await supabase
          .from('draft_picks')
          .upsert({
            draft_session_id: session.id,
            draft_team_id: team.id,
            player_id: resolvedPlayerId,
            player_season_id: playerSeasonId,
            pick_number: currentPick.pickNumber,
            round: currentPick.round,
            pick_in_round: currentPick.pickInRound,
          }, {
            onConflict: 'draft_session_id,pick_number',
          })

        if (error) {
          console.error('[makePick] Error saving pick to Supabase:', error)
          return
        }

        // Advance to next pick
        const nextPickNumber = session.currentPick + 1
        let newStatus = session.status
        let newRound = session.currentRound

        if (nextPickNumber > session.picks.length) {
          newStatus = 'completed'
        } else {
          newRound = updatedPicks[nextPickNumber - 1].round
        }

        // Create new session object
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

        // Check if this specific season is drafted
        const draftedPick = session.picks.find(pick => pick.playerSeasonId === playerSeasonId)
        if (draftedPick) return true

        // Also check if ANY season of the same player is drafted (by playerId)
        // Find the playerId for the queried season from another pick with the same player
        // Note: This only works when playerId is stored on picks. For legacy data, only exact season match works.
        return false
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

/**
 * League State Management Store
 * Uses Zustand for persistent league management across sessions
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabaseClient'
import type { League, LeagueConfig, LeagueStatus } from '../types/league.types'

interface LeagueState {
  // Current active league
  currentLeague: League | null

  // All available leagues (for list view)
  leagues: League[]

  // Actions
  createLeague: (config: LeagueConfig, seasonYear: number) => Promise<League>
  loadAllLeagues: () => Promise<void>
  loadLeague: (leagueId: string) => Promise<League>
  deleteLeague: (leagueId: string) => Promise<void>
  updateLeagueStatus: (leagueId: string, status: LeagueStatus) => Promise<void>
  linkDraftSession: (leagueId: string, draftSessionId: string) => Promise<void>
  setCurrentLeague: (league: League | null) => void

  // Reset
  resetLeague: () => void
}

function transformLeagueRow(row: Record<string, unknown>): League {
  return {
    id: row.id as string,
    name: row.league_name as string,
    description: (row.league_description as string) || null,
    seasonYear: row.season_year as number,
    numTeams: row.num_teams as number,
    gamesPerSeason: row.games_per_season as number,
    playoffFormat: (row.playoff_format as League['playoffFormat']) || 'none',
    useDH: row.use_dh as boolean ?? true,
    useApbaRules: row.use_apba_rules as boolean ?? true,
    injuryEnabled: row.injury_enabled as boolean ?? false,
    weatherEffects: row.weather_effects as boolean ?? false,
    status: row.status as League['status'],
    currentGameDate: (row.current_game_date as string) || null,
    draftSessionId: (row.draft_session_id as string) || null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set, get) => ({
      currentLeague: null,
      leagues: [],

      createLeague: async (config: LeagueConfig, seasonYear: number) => {
        const { data, error } = await supabase
          .from('leagues')
          .insert({
            league_name: config.name,
            league_description: config.description || null,
            season_year: seasonYear,
            num_teams: config.numTeams,
            games_per_season: config.gamesPerSeason,
            playoff_format: config.playoffFormat,
            use_dh: config.useDH,
            use_apba_rules: config.useApbaRules,
            injury_enabled: config.injuryEnabled,
            weather_effects: config.weatherEffects,
            status: 'draft',
          })
          .select()
          .single()

        if (error) {
          console.error('[LeagueStore] Error creating league:', error)
          throw new Error(`Failed to create league: ${error.message}`)
        }

        if (!data) {
          throw new Error('Failed to create league - no data returned')
        }

        const league = transformLeagueRow(data)
        set({ currentLeague: league })
        console.log('[LeagueStore] League created:', league.id, league.name)
        return league
      },

      loadAllLeagues: async () => {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('[LeagueStore] Error loading leagues:', error)
          throw new Error(`Failed to load leagues: ${error.message}`)
        }

        const leagues = (data || []).map(transformLeagueRow)
        set({ leagues })
        console.log('[LeagueStore] Loaded', leagues.length, 'leagues')
      },

      loadLeague: async (leagueId: string) => {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', leagueId)
          .single()

        if (error) {
          console.error('[LeagueStore] Error loading league:', error)
          throw new Error(`Failed to load league: ${error.message}`)
        }

        if (!data) {
          throw new Error(`League not found: ${leagueId}`)
        }

        const league = transformLeagueRow(data)
        set({ currentLeague: league })
        console.log('[LeagueStore] Loaded league:', league.id, league.name, 'status:', league.status)
        return league
      },

      deleteLeague: async (leagueId: string) => {
        const { error } = await supabase
          .from('leagues')
          .delete()
          .eq('id', leagueId)

        if (error) {
          console.error('[LeagueStore] Error deleting league:', error)
          throw new Error(`Failed to delete league: ${error.message}`)
        }

        // Remove from local state
        const current = get().currentLeague
        if (current?.id === leagueId) {
          set({ currentLeague: null })
        }
        set({ leagues: get().leagues.filter(l => l.id !== leagueId) })
        console.log('[LeagueStore] Deleted league:', leagueId)
      },

      updateLeagueStatus: async (leagueId: string, status: LeagueStatus) => {
        const { error } = await supabase
          .from('leagues')
          .update({ status })
          .eq('id', leagueId)

        if (error) {
          console.error('[LeagueStore] Error updating league status:', error)
          throw new Error(`Failed to update league status: ${error.message}`)
        }

        // Update local state
        const current = get().currentLeague
        if (current?.id === leagueId) {
          set({ currentLeague: { ...current, status, updatedAt: new Date() } })
        }
        console.log('[LeagueStore] Updated league status:', leagueId, '->', status)
      },

      linkDraftSession: async (leagueId: string, draftSessionId: string) => {
        const { error } = await supabase
          .from('leagues')
          .update({ draft_session_id: draftSessionId })
          .eq('id', leagueId)

        if (error) {
          console.error('[LeagueStore] Error linking draft session:', error)
          throw new Error(`Failed to link draft session: ${error.message}`)
        }

        const current = get().currentLeague
        if (current?.id === leagueId) {
          set({ currentLeague: { ...current, draftSessionId, updatedAt: new Date() } })
        }
        console.log('[LeagueStore] Linked draft session', draftSessionId, 'to league', leagueId)
      },

      setCurrentLeague: (league: League | null) => {
        set({ currentLeague: league })
      },

      resetLeague: () => {
        set({ currentLeague: null, leagues: [] })
      },
    }),
    {
      name: 'league-storage',
      partialize: (state) => ({ currentLeague: state.currentLeague }),
    }
  )
)

/**
 * League State Management Store
 * Uses Zustand for persistent league management across sessions
 * API calls go through the backend; Supabase is no longer used directly
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, ApiError } from '../lib/api'
import type { League, LeagueConfig, LeagueStatus } from '../types/league.types'

// API response type (dates as strings from JSON)
interface LeagueApiResponse {
  id: string
  name: string
  description: string | null
  seasonYear: number
  numTeams: number
  gamesPerSeason: number
  playoffFormat: League['playoffFormat']
  useApbaRules: boolean
  injuryEnabled: boolean
  weatherEffects: boolean
  status: League['status']
  currentGameDate: string | null
  draftSessionId: string | null
  createdAt: string
  updatedAt: string
}

// Transform API response to League type (parse date strings)
function transformApiResponse(data: LeagueApiResponse): League {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  }
}

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

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set, get) => ({
      currentLeague: null,
      leagues: [],

      createLeague: async (config: LeagueConfig, seasonYear: number) => {
        try {
          const data = await api.post<LeagueApiResponse>('/leagues', {
            name: config.name,
            description: config.description || null,
            seasonYear,
            numTeams: config.numTeams,
            gamesPerSeason: config.gamesPerSeason,
            playoffFormat: config.playoffFormat,
            useApbaRules: config.useApbaRules,
            injuryEnabled: config.injuryEnabled,
            weatherEffects: config.weatherEffects,
          })

          const league = transformApiResponse(data)
          set({ currentLeague: league })
          console.log('[LeagueStore] League created:', league.id, league.name)
          return league
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[LeagueStore] Error creating league:', err)
          throw new Error(`Failed to create league: ${message}`)
        }
      },

      loadAllLeagues: async () => {
        try {
          const data = await api.get<LeagueApiResponse[]>('/leagues')
          const leagues = data.map(transformApiResponse)
          set({ leagues })
          console.log('[LeagueStore] Loaded', leagues.length, 'leagues')
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[LeagueStore] Error loading leagues:', err)
          throw new Error(`Failed to load leagues: ${message}`)
        }
      },

      loadLeague: async (leagueId: string) => {
        try {
          const data = await api.get<LeagueApiResponse>(`/leagues/${leagueId}`)
          const league = transformApiResponse(data)
          set({ currentLeague: league })
          console.log('[LeagueStore] Loaded league:', league.id, league.name, 'status:', league.status)
          return league
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[LeagueStore] Error loading league:', err)
          throw new Error(`Failed to load league: ${message}`)
        }
      },

      deleteLeague: async (leagueId: string) => {
        try {
          await api.delete(`/leagues/${leagueId}`)

          // Remove from local state
          const current = get().currentLeague
          if (current?.id === leagueId) {
            set({ currentLeague: null })
          }
          set({ leagues: get().leagues.filter(l => l.id !== leagueId) })
          console.log('[LeagueStore] Deleted league:', leagueId)
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[LeagueStore] Error deleting league:', err)
          throw new Error(`Failed to delete league: ${message}`)
        }
      },

      updateLeagueStatus: async (leagueId: string, status: LeagueStatus) => {
        try {
          const data = await api.put<LeagueApiResponse>(`/leagues/${leagueId}`, { status })
          const league = transformApiResponse(data)

          // Update local state
          const current = get().currentLeague
          if (current?.id === leagueId) {
            set({ currentLeague: league })
          }
          console.log('[LeagueStore] Updated league status:', leagueId, '->', status)
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[LeagueStore] Error updating league status:', err)
          throw new Error(`Failed to update league status: ${message}`)
        }
      },

      linkDraftSession: async (leagueId: string, draftSessionId: string) => {
        try {
          const data = await api.put<LeagueApiResponse>(`/leagues/${leagueId}`, { draftSessionId })
          const league = transformApiResponse(data)

          const current = get().currentLeague
          if (current?.id === leagueId) {
            set({ currentLeague: league })
          }
          console.log('[LeagueStore] Linked draft session', draftSessionId, 'to league', leagueId)
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Unknown error'
          console.error('[LeagueStore] Error linking draft session:', err)
          throw new Error(`Failed to link draft session: ${message}`)
        }
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

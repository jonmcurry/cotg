/**
 * League List Component
 * Browse, resume, and manage saved leagues
 */

import { useState, useEffect } from 'react'
import { useLeagueStore } from '../../stores/leagueStore'
import type { League } from '../../types/league.types'

interface Props {
  onSelectLeague: (league: League) => void
  onBack: () => void
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'In Draft',
  in_season: 'In Season',
  playoffs: 'Playoffs',
  completed: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-blue-100 text-blue-700',
  in_season: 'bg-green-100 text-green-700',
  playoffs: 'bg-gold/20 text-gold-dark',
  completed: 'bg-charcoal/10 text-charcoal/60',
}

export default function LeagueList({ onSelectLeague, onBack }: Props) {
  const { leagues, loadAllLeagues, deleteLeague } = useLeagueStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeagues() {
      try {
        await loadAllLeagues()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[LeagueList] Error loading leagues:', err)
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchLeagues()
  }, [loadAllLeagues])

  const handleDelete = async (leagueId: string) => {
    try {
      await deleteLeague(leagueId)
      setConfirmDeleteId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[LeagueList] Error deleting league:', err)
      alert(`ERROR: Failed to delete league.\n\n${message}`)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="py-6 border-b border-charcoal/10">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-charcoal text-gold flex items-center justify-center font-display font-bold text-xl rounded-sm">
              CG
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal tracking-tight">
              Century of the Game
            </h1>
          </div>
          <button
            onClick={onBack}
            className="text-sm font-semibold uppercase tracking-widest text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-charcoal mb-2 tracking-tight">
            Your Leagues
          </h2>
          <p className="font-serif italic text-charcoal/60 mb-10">
            Resume a league or start where you left off.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-serif italic text-charcoal/50">Loading leagues...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-sm mb-6">
              <p className="text-red-700 font-serif">{error}</p>
            </div>
          )}

          {!loading && !error && leagues.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-charcoal/15 rounded-sm">
              <p className="font-serif text-charcoal/40 text-lg italic mb-4">
                No leagues found
              </p>
              <p className="font-serif text-charcoal/30 text-sm">
                Create a new league from the home screen to get started.
              </p>
            </div>
          )}

          {!loading && leagues.length > 0 && (
            <div className="space-y-3">
              {leagues.map(league => (
                <div
                  key={league.id}
                  className="bg-white border-2 border-charcoal/10 rounded-sm p-5 flex items-center gap-4 hover:border-charcoal/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-bold text-charcoal text-lg">
                        {league.name}
                      </h3>
                      <span className={`text-xs font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_COLORS[league.status] || ''}`}>
                        {STATUS_LABELS[league.status] || league.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm font-serif text-charcoal/50">
                      <span>{league.numTeams} teams</span>
                      <span>{league.gamesPerSeason} games</span>
                      <span>Season {league.seasonYear}</span>
                      {league.description && (
                        <span className="italic truncate max-w-[200px]">{league.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {confirmDeleteId === league.id ? (
                      <>
                        <span className="text-xs font-sans text-red-600 font-bold mr-2">Delete?</span>
                        <button
                          onClick={() => handleDelete(league.id)}
                          className="px-3 py-2 text-xs font-sans font-bold uppercase tracking-wider text-white bg-red-600 rounded-sm hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 text-xs font-sans font-bold uppercase tracking-wider text-charcoal/50 border border-charcoal/15 rounded-sm hover:border-charcoal/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectLeague(league)}
                          className="px-4 py-2 font-display font-bold uppercase tracking-wider text-sm bg-burgundy text-white border-2 border-burgundy rounded-sm hover:bg-burgundy/90 transition-colors"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(league.id)}
                          className="px-3 py-2 text-xs font-sans font-bold uppercase tracking-wider text-charcoal/40 border border-charcoal/10 rounded-sm hover:border-red-300 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Pick History Component
 * Shows recent draft picks
 */

import { useMemo } from 'react'
import type { DraftSession, DraftTeam } from '../../types/draft.types'
import type { PlayerSeason } from '../../utils/cpuDraftLogic'

interface Props {
  session: DraftSession
  players: PlayerSeason[]
}

export default function PickHistory({ session, players }: Props) {
  // Create lookup maps
  const teamMap = useMemo(() => {
    const map = new Map<string, DraftTeam>()
    session.teams.forEach(t => map.set(t.id, t))
    return map
  }, [session.teams])

  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerSeason>()
    players.forEach(p => map.set(p.id, p))
    return map
  }, [players])

  // Get recent picks (last 10 or current pick - 1, whichever is smaller)
  const recentPicks = useMemo(() => {
    const completedPicks = session.picks
      .filter(p => p.playerSeasonId !== null)
      .slice(-10)
      .reverse()

    return completedPicks.map(pick => ({
      pick,
      team: teamMap.get(pick.teamId),
      player: pick.playerSeasonId ? playerMap.get(pick.playerSeasonId) : null,
    }))
  }, [session.picks, teamMap, playerMap])

  if (recentPicks.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-display text-burgundy mb-4">Recent Picks</h2>
        <div className="text-center py-8 text-charcoal/50 font-serif text-sm">
          No picks yet
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-display text-burgundy mb-4">Recent Picks</h2>

      <div className="space-y-2">
        {recentPicks.map(({ pick, team, player }) => (
          <div
            key={pick.pickNumber}
            className="flex items-center gap-3 p-2 rounded hover:bg-charcoal/5 transition-colors"
          >
            <div className="flex-shrink-0 w-12 text-center">
              <div className="text-xs text-charcoal/60 font-semibold">#{pick.pickNumber}</div>
              <div className="text-xs text-burgundy">R{pick.round}</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-charcoal text-sm truncate">
                {player?.display_name || 'Unknown Player'}
              </div>
              <div className="text-xs text-charcoal/60">
                {team?.name || 'Unknown Team'}
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <div className="text-xs font-semibold text-burgundy">
                {player?.primary_position || '—'}
              </div>
              <div className="text-xs text-charcoal/60">
                {player?.year || '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

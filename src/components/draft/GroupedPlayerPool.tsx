/**
 * Grouped Player Pool - Players grouped by name with expandable seasons
 * Addresses UX issue: Multiple seasons of same player need to be grouped
 */

import { useState, useMemo } from 'react'
import type { PlayerSeason } from '../../utils/cpuDraftLogic'
import { getPitcherGrade } from '../../utils/apbaRating'

interface Props {
  players: PlayerSeason[]
  draftedPlayerIds: Set<string>
  onSelectPlayer: (player: PlayerSeason) => void
  currentTeamControl: 'human' | 'cpu'
}

interface GroupedPlayer {
  displayName: string
  seasons: PlayerSeason[]
  availableSeasons: PlayerSeason[]
  bestRating: number
  bestPosition: string
}

/**
 * Check if a position is a pitcher
 */
const isPitcherPosition = (position: string): boolean => {
  return position === 'P' || position === 'SP' || position === 'RP' || position === 'CL'
}

/**
 * Format rating for display - shows APBA grade for pitchers, numeric rating for batters
 */
const formatRating = (rating: number | null, position: string): string => {
  if (rating === null) return 'Not Rated'
  if (isPitcherPosition(position)) {
    return `Grade ${getPitcherGrade(rating)}`
  }
  return rating.toFixed(1)
}

export default function GroupedPlayerPool({
  players,
  draftedPlayerIds,
  onSelectPlayer,
  currentTeamControl,
}: Props) {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  // Group players by display_name
  const groupedPlayers = useMemo(() => {
    const groups = new Map<string, GroupedPlayer>()

    players.forEach(player => {
      const name = player.display_name || `${player.first_name} ${player.last_name}`

      if (!groups.has(name)) {
        groups.set(name, {
          displayName: name,
          seasons: [],
          availableSeasons: [],
          bestRating: 0,
          bestPosition: player.primary_position,
        })
      }

      const group = groups.get(name)!
      group.seasons.push(player)

      if (!draftedPlayerIds.has(player.id)) {
        group.availableSeasons.push(player)
        if ((player.apba_rating || 0) > group.bestRating) {
          group.bestRating = player.apba_rating || 0
          group.bestPosition = player.primary_position
        }
      }
    })

    // Sort seasons within each group by APBA rating descending
    groups.forEach(group => {
      group.availableSeasons.sort((a, b) => (b.apba_rating || 0) - (a.apba_rating || 0))
    })

    // Convert to array and filter out players with no available seasons
    return Array.from(groups.values())
      .filter(group => group.availableSeasons.length > 0)
      .sort((a, b) => b.bestRating - a.bestRating)
  }, [players, draftedPlayerIds])

  // Filter by search term
  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return groupedPlayers

    const term = searchTerm.toLowerCase()
    return groupedPlayers.filter(group =>
      group.displayName.toLowerCase().includes(term)
    )
  }, [groupedPlayers, searchTerm])

  const toggleExpanded = (playerName: string) => {
    const newExpanded = new Set(expandedPlayers)
    if (newExpanded.has(playerName)) {
      newExpanded.delete(playerName)
    } else {
      newExpanded.add(playerName)
    }
    setExpandedPlayers(newExpanded)
  }

  const handleSeasonClick = (player: PlayerSeason) => {
    if (currentTeamControl === 'human') {
      onSelectPlayer(player)
    }
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-display text-burgundy mb-2">
          Player Pool
        </h2>
        <input
          type="text"
          placeholder="Search player name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-charcoal/20 rounded-md font-serif text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/50"
        />
        <p className="text-xs text-charcoal/60 font-serif mt-1">
          {filteredPlayers.length} players available
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream border-b border-charcoal/20">
            <tr className="text-left">
              <th className="py-2 px-2 font-display text-charcoal/80 w-12">Pos</th>
              <th className="py-2 px-2 font-display text-charcoal/80">Player</th>
              <th className="py-2 px-2 font-display text-charcoal/80 text-right">Year</th>
            </tr>
          </thead>
          <tbody className="font-serif">
            {filteredPlayers.map((group) => {
              const isExpanded = expandedPlayers.has(group.displayName)
              const hasMultipleSeasons = group.availableSeasons.length > 1

              return (
                <tr key={group.displayName}>
                  <td colSpan={3} className="p-0">
                    {/* Player Name Row */}
                    <div
                      onClick={() => hasMultipleSeasons ? toggleExpanded(group.displayName) : handleSeasonClick(group.availableSeasons[0])}
                      className={`
                        flex items-center justify-between px-2 py-2
                        border-b border-charcoal/10
                        ${currentTeamControl === 'human' ? 'hover:bg-gold/10 cursor-pointer' : 'cursor-default'}
                        ${isExpanded ? 'bg-burgundy/5' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {hasMultipleSeasons && (
                          <span className="text-burgundy text-xs">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                        <span className="text-xs text-burgundy font-display w-8">
                          {group.bestPosition}
                        </span>
                        <span className="font-medium text-charcoal">
                          {group.displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-charcoal/60">
                          {hasMultipleSeasons ? (
                            `${group.availableSeasons.length} seasons`
                          ) : (
                            `${group.availableSeasons[0].year} ${group.availableSeasons[0].team_id}`
                          )}
                        </span>
                        <span className="text-sm font-medium text-burgundy">
                          {formatRating(group.bestRating, group.bestPosition)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Seasons */}
                    {isExpanded && hasMultipleSeasons && (
                      <div className="bg-cream/50 border-b border-charcoal/10">
                        {group.availableSeasons.map((season) => (
                          <div
                            key={season.id}
                            onClick={() => handleSeasonClick(season)}
                            className={`
                              flex items-center justify-between px-4 pl-10 py-2
                              border-t border-charcoal/5
                              ${currentTeamControl === 'human' ? 'hover:bg-gold/10 cursor-pointer' : 'cursor-default'}
                            `}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <span className="text-xs text-burgundy font-display w-8">
                                {season.primary_position}
                              </span>
                              <span className="text-sm text-charcoal/80">
                                {season.year} {season.team_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              {/* Rating shown prominently first */}
                              <span className="text-sm font-medium text-burgundy">
                                {formatRating(season.apba_rating, season.primary_position)}
                              </span>
                              {/* Supporting stats */}
                              <span className="text-charcoal/60">
                                {season.batting_avg !== null && (
                                  <span>.{Math.floor(season.batting_avg * 1000)}</span>
                                )}
                                {season.home_runs !== null && (
                                  <span className="ml-2">{season.home_runs} HR</span>
                                )}
                                {season.era !== null && (
                                  <span>{season.era.toFixed(2)} ERA</span>
                                )}
                                {season.wins !== null && isPitcherPosition(season.primary_position) && (
                                  <span className="ml-2">{season.wins}W</span>
                                )}
                                {season.saves !== null && season.saves > 0 && isPitcherPosition(season.primary_position) && (
                                  <span className="ml-1">{season.saves}SV</span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 text-charcoal/40 font-serif">
            No players found matching "{searchTerm}"
          </div>
        )}
      </div>

      {currentTeamControl === 'cpu' && (
        <div className="mt-4 p-3 bg-burgundy/5 rounded-md border border-burgundy/20">
          <p className="text-xs font-serif text-charcoal/70 text-center">
            CPU is drafting... Please wait.
          </p>
        </div>
      )}
    </div>
  )
}

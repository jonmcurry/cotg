/**
 * Player Pool Component
 * Displays available players with filtering, sorting, and search
 * Implements SRD requirements FR-PP-001 to FR-PP-009
 */

import { useState, useMemo } from 'react'
import type { PlayerSeason } from '../../types/player'

interface Props {
  players: PlayerSeason[]
  draftedPlayerIds: Set<string>
  onSelectPlayer: (player: PlayerSeason) => void
  currentTeamControl: 'human' | 'cpu'
}

type SortField = 'name' | 'position' | 'war' | 'team' | 'year'
type FilterPosition = 'all' | 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'P'

export default function PlayerPool({
  players,
  draftedPlayerIds,
  onSelectPlayer,
  currentTeamControl,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('war')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterPosition, setFilterPosition] = useState<FilterPosition>('all')
  const [showAvailableOnly, setShowAvailableOnly] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const PLAYERS_PER_PAGE = 20

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let result = [...players]

    // Filter by availability
    if (showAvailableOnly) {
      result = result.filter(p => !draftedPlayerIds.has(p.player_id))
    }

    // Filter by position
    if (filterPosition !== 'all') {
      result = result.filter(p => {
        if (filterPosition === 'P') {
          return ['P', 'SP', 'RP'].includes(p.primary_position)
        }
        return p.primary_position === filterPosition
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        (p.display_name?.toLowerCase().includes(query) ||
        p.first_name?.toLowerCase().includes(query) ||
        p.last_name?.toLowerCase().includes(query))
      )
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = (a.display_name || '').localeCompare(b.display_name || '')
          break
        case 'position':
          comparison = (a.primary_position || '').localeCompare(b.primary_position || '')
          break
        case 'war':
          comparison = (a.war || 0) - (b.war || 0)
          break
        case 'team':
          comparison = (a.team_id || '').localeCompare(b.team_id || '')
          break
        case 'year':
          comparison = a.year - b.year
          break
      }

      return sortDesc ? -comparison : comparison
    })

    return result
  }, [players, draftedPlayerIds, showAvailableOnly, filterPosition, searchQuery, sortField, sortDesc])

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * PLAYERS_PER_PAGE,
    currentPage * PLAYERS_PER_PAGE
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortField(field)
      setSortDesc(true)
    }
  }

  const isPitcher = (position: string) => ['P', 'SP', 'RP'].includes(position)

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-xl font-display text-burgundy mb-4">Available Players</h2>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterPosition}
            onChange={(e) => {
              setFilterPosition(e.target.value as FilterPosition)
              setCurrentPage(1)
            }}
            className="input-field text-sm"
          >
            <option value="all">All Positions</option>
            <option value="C">Catcher</option>
            <option value="1B">First Base</option>
            <option value="2B">Second Base</option>
            <option value="SS">Shortstop</option>
            <option value="3B">Third Base</option>
            <option value="OF">Outfield</option>
            <option value="P">Pitcher</option>
          </select>

          <select
            value={sortField}
            onChange={(e) => handleSort(e.target.value as SortField)}
            className="input-field text-sm"
          >
            <option value="war">WAR</option>
            <option value="name">Name</option>
            <option value="position">Position</option>
            <option value="team">Team</option>
            <option value="year">Year</option>
          </select>

          <label className="flex items-center text-sm font-serif text-charcoal">
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => {
                setShowAvailableOnly(e.target.checked)
                setCurrentPage(1)
              }}
              className="mr-2"
            />
            Available Only
          </label>
        </div>

        <input
          type="text"
          placeholder="Search player name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          className="input-field w-full text-sm"
        />
      </div>

      {/* Player Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream">
            <tr className="border-b-2 border-charcoal/10">
              <th className="text-left py-2 px-2 font-display text-charcoal text-xs">Pos</th>
              <th className="text-left py-2 px-3 font-display text-charcoal text-xs">Player</th>
              <th className="text-left py-2 px-2 font-display text-charcoal text-xs">Year</th>
              <th className="text-right py-2 px-2 font-display text-charcoal text-xs">WAR</th>
              <th className="text-right py-2 px-2 font-display text-charcoal text-xs">AVG/ERA</th>
              <th className="text-right py-2 px-2 font-display text-charcoal text-xs">HR/K</th>
              <th className="text-center py-2 px-2 font-display text-charcoal text-xs">Draft</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlayers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-charcoal/50 font-serif">
                  No players found
                </td>
              </tr>
            ) : (
              paginatedPlayers.map((player) => {
                const isDrafted = draftedPlayerIds.has(player.player_id)
                const canDraft = currentTeamControl === 'human' && !isDrafted

                return (
                  <tr
                    key={player.id}
                    className={`border-b border-charcoal/5 ${
                      isDrafted ? 'opacity-40' : 'hover:bg-gold/5'
                    }`}
                  >
                    <td className="py-2 px-2 font-semibold text-burgundy">
                      {player.primary_position}
                    </td>
                    <td className="py-2 px-3 font-serif">
                      <div className="font-semibold text-charcoal">
                        {player.display_name}
                      </div>
                      <div className="text-xs text-charcoal/60">{player.team_id}</div>
                    </td>
                    <td className="py-2 px-2 text-charcoal/70">{player.year}</td>
                    <td className="py-2 px-2 text-right font-semibold text-burgundy">
                      {player.war?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-right text-charcoal/70">
                      {isPitcher(player.primary_position)
                        ? player.era?.toFixed(2) || 'N/A'
                        : player.batting_avg?.toFixed(3) || 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-right text-charcoal/70">
                      {isPitcher(player.primary_position)
                        ? player.strikeouts_pitched || 0
                        : player.home_runs || 0}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {isDrafted ? (
                        <span className="text-xs text-burgundy/50 font-semibold">DRAFTED</span>
                      ) : canDraft ? (
                        <button
                          onClick={() => onSelectPlayer(player)}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          +
                        </button>
                      ) : (
                        <span className="text-xs text-charcoal/30">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-charcoal/60 font-serif">
            Showing {(currentPage - 1) * PLAYERS_PER_PAGE + 1}-
            {Math.min(currentPage * PLAYERS_PER_PAGE, filteredPlayers.length)} of{' '}
            {filteredPlayers.length}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-30"
            >
              ‹
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded font-semibold ${
                    currentPage === pageNum
                      ? 'bg-burgundy text-cream'
                      : 'bg-charcoal/5 text-charcoal hover:bg-charcoal/10'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Tabbed Player Pool - Separate tabs for Position Players and Pitchers
 * Sortable columns for easy draft board scanning
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

type Tab = 'hitters' | 'pitchers'
type SortField = 'name' | 'position' | 'year' | 'avg' | 'hits' | 'hr' | 'rbi' | 'sb' | 'ops' | 'wins' | 'era' | 'strikeouts' | 'shutouts' | 'whip' | 'grade'
type SortDirection = 'asc' | 'desc'

const isPitcherPosition = (position: string): boolean => {
  return position === 'P' || position === 'SP' || position === 'RP' || position === 'CL'
}

const formatRating = (rating: number | null, position: string): string => {
  if (rating === null) return 'Not Rated'
  if (isPitcherPosition(position)) {
    return `Grade ${getPitcherGrade(rating)}`
  }
  return rating.toFixed(1)
}

export default function TabbedPlayerPool({
  players,
  draftedPlayerIds,
  onSelectPlayer,
  currentTeamControl,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('hitters')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('grade')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter available (undrafted) players
  // Note: draftedPlayerIds contains player_id (not season id), so all seasons of a drafted player are filtered out
  const availablePlayers = useMemo(() => {
    const startTime = performance.now()
    const filtered = players.filter(p => !draftedPlayerIds.has(p.player_id))
    const filterTime = performance.now() - startTime

    console.log(`[TabbedPlayerPool] Filter completed in ${filterTime.toFixed(2)}ms | Total: ${players.length} | Drafted: ${draftedPlayerIds.size} | Available: ${filtered.length}`)

    return filtered
  }, [players, draftedPlayerIds])

  // Split into position players and pitchers
  const positionPlayers = useMemo(() => {
    return availablePlayers.filter(p => !isPitcherPosition(p.primary_position))
  }, [availablePlayers])

  const pitchers = useMemo(() => {
    return availablePlayers.filter(p => isPitcherPosition(p.primary_position))
  }, [availablePlayers])

  // Apply search filter
  const filteredPlayers = useMemo(() => {
    const startTime = performance.now()
    const pool = activeTab === 'hitters' ? positionPlayers : pitchers

    if (!searchTerm) {
      const filterTime = performance.now() - startTime
      console.log(`[TabbedPlayerPool] Filter (no search) completed in ${filterTime.toFixed(2)}ms | Pool size: ${pool.length}`)
      return pool
    }

    const term = searchTerm.toLowerCase()
    const filtered = pool.filter(p => {
      const name = p.display_name || `${p.first_name} ${p.last_name}`
      return name.toLowerCase().includes(term)
    })

    const filterTime = performance.now() - startTime
    console.log(`[TabbedPlayerPool] Filter (search: "${term}") completed in ${filterTime.toFixed(2)}ms | ${pool.length} → ${filtered.length}`)

    return filtered
  }, [activeTab, positionPlayers, pitchers, searchTerm])

  // Apply sorting
  const sortedPlayers = useMemo(() => {
    const startTime = performance.now()
    console.log(`[TabbedPlayerPool] Starting sort of ${filteredPlayers.length} players on field: ${sortField}, direction: ${sortDirection}`)

    const sorted = [...filteredPlayers]

    sorted.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case 'name':
          aVal = (a.display_name || `${a.first_name} ${a.last_name}`).toLowerCase()
          bVal = (b.display_name || `${b.first_name} ${b.last_name}`).toLowerCase()
          break
        case 'position':
          aVal = a.primary_position
          bVal = b.primary_position
          break
        case 'year':
          aVal = a.year
          bVal = b.year
          break
        case 'avg':
          aVal = a.batting_avg || 0
          bVal = b.batting_avg || 0
          break
        case 'hits':
          aVal = a.hits || 0
          bVal = b.hits || 0
          break
        case 'hr':
          aVal = a.home_runs || 0
          bVal = b.home_runs || 0
          break
        case 'rbi':
          aVal = a.rbi || 0
          bVal = b.rbi || 0
          break
        case 'sb':
          aVal = a.stolen_bases || 0
          bVal = b.stolen_bases || 0
          break
        case 'ops':
          aVal = ((a.on_base_pct || 0) + (a.slugging_pct || 0))
          bVal = ((b.on_base_pct || 0) + (b.slugging_pct || 0))
          break
        case 'wins':
          aVal = a.wins || 0
          bVal = b.wins || 0
          break
        case 'era':
          aVal = a.era || 999
          bVal = b.era || 999
          break
        case 'strikeouts':
          aVal = a.strikeouts_pitched || 0
          bVal = b.strikeouts_pitched || 0
          break
        case 'shutouts':
          aVal = a.shutouts || 0
          bVal = b.shutouts || 0
          break
        case 'whip':
          aVal = a.whip || 999
          bVal = b.whip || 999
          break
        case 'grade':
          aVal = a.apba_rating || 0
          bVal = b.apba_rating || 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    const sortTime = performance.now() - startTime
    console.log(`[TabbedPlayerPool] Sort completed in ${sortTime.toFixed(2)}ms`)

    return sorted
  }, [filteredPlayers, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-charcoal/30 ml-1">⇅</span>
    }
    return sortDirection === 'asc' ?
      <span className="text-burgundy ml-1">↑</span> :
      <span className="text-burgundy ml-1">↓</span>
  }

  const handlePlayerClick = (player: PlayerSeason) => {
    if (currentTeamControl === 'human') {
      onSelectPlayer(player)
    }
  }

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-display text-burgundy mb-3">
          Player Pool
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('hitters')}
            className={`
              px-4 py-2 rounded-md font-display text-sm transition-colors
              ${activeTab === 'hitters'
                ? 'bg-burgundy text-cream'
                : 'bg-cream border border-charcoal/20 text-charcoal/70 hover:border-burgundy/40'}
            `}
          >
            Position Players ({positionPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('pitchers')}
            className={`
              px-4 py-2 rounded-md font-display text-sm transition-colors
              ${activeTab === 'pitchers'
                ? 'bg-burgundy text-cream'
                : 'bg-cream border border-charcoal/20 text-charcoal/70 hover:border-burgundy/40'}
            `}
          >
            Pitchers ({pitchers.length})
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search player name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-charcoal/20 rounded-md font-serif text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/50"
        />
        <p className="text-xs text-charcoal/60 font-serif mt-1">
          {sortedPlayers.length} players available | {draftedPlayerIds.size} drafted
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'hitters' ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-cream border-b-2 border-charcoal/20">
              <tr className="text-left">
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy" onClick={() => handleSort('name')}>
                  Player <SortIcon field="name" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center" onClick={() => handleSort('position')}>
                  Pos <SortIcon field="position" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center" onClick={() => handleSort('year')}>
                  Year <SortIcon field="year" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('avg')}>
                  AVG <SortIcon field="avg" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('hits')}>
                  H <SortIcon field="hits" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('hr')}>
                  HR <SortIcon field="hr" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('rbi')}>
                  RBI <SortIcon field="rbi" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('sb')}>
                  SB <SortIcon field="sb" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('ops')}>
                  OPS <SortIcon field="ops" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('grade')}>
                  Rating <SortIcon field="grade" />
                </th>
              </tr>
            </thead>
            <tbody className="font-serif">
              {sortedPlayers.map((player) => {
                const name = player.display_name || `${player.first_name} ${player.last_name}`
                const ops = (player.on_base_pct || 0) + (player.slugging_pct || 0)

                return (
                  <tr
                    key={player.id}
                    onClick={() => handlePlayerClick(player)}
                    className={`
                      border-b border-charcoal/10
                      ${currentTeamControl === 'human' ? 'hover:bg-gold/10 cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <td className="py-2 px-2 font-medium text-charcoal">{name}</td>
                    <td className="py-2 px-2 text-burgundy text-xs font-display text-center">{player.primary_position}</td>
                    <td className="py-2 px-2 text-charcoal/60 text-xs text-center">{player.year} {player.team_id}</td>
                    <td className="py-2 px-2 text-charcoal text-right">
                      {player.batting_avg !== null ? `.${Math.floor(player.batting_avg * 1000)}` : '-'}
                    </td>
                    <td className="py-2 px-2 text-charcoal text-right">{player.hits || '-'}</td>
                    <td className="py-2 px-2 text-charcoal text-right">{player.home_runs || '-'}</td>
                    <td className="py-2 px-2 text-charcoal text-right">{player.rbi || '-'}</td>
                    <td className="py-2 px-2 text-charcoal text-right">{player.stolen_bases || '-'}</td>
                    <td className="py-2 px-2 text-charcoal text-right">{ops > 0 ? ops.toFixed(3) : '-'}</td>
                    <td className="py-2 px-2 text-burgundy font-medium text-right">
                      {player.apba_rating !== null ? player.apba_rating.toFixed(1) : 'NR'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-cream border-b-2 border-charcoal/20">
              <tr className="text-left">
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy" onClick={() => handleSort('name')}>
                  Player <SortIcon field="name" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center" onClick={() => handleSort('position')}>
                  Pos <SortIcon field="position" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center" onClick={() => handleSort('year')}>
                  Year <SortIcon field="year" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('wins')}>
                  W-L <SortIcon field="wins" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('era')}>
                  ERA <SortIcon field="era" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('strikeouts')}>
                  K <SortIcon field="strikeouts" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('shutouts')}>
                  SHO <SortIcon field="shutouts" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('whip')}>
                  WHIP <SortIcon field="whip" />
                </th>
                <th className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right" onClick={() => handleSort('grade')}>
                  Grade <SortIcon field="grade" />
                </th>
              </tr>
            </thead>
            <tbody className="font-serif">
              {sortedPlayers.map((player) => {
                const name = player.display_name || `${player.first_name} ${player.last_name}`
                const winLoss = player.wins !== null && player.losses !== null
                  ? `${player.wins}-${player.losses}`
                  : '-'

                return (
                  <tr
                    key={player.id}
                    onClick={() => handlePlayerClick(player)}
                    className={`
                      border-b border-charcoal/10
                      ${currentTeamControl === 'human' ? 'hover:bg-gold/10 cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <td className="py-2 px-2 font-medium text-charcoal">{name}</td>
                    <td className="py-2 px-2 text-burgundy text-xs font-display text-center">{player.primary_position}</td>
                    <td className="py-2 px-2 text-charcoal/60 text-xs text-center">{player.year} {player.team_id}</td>
                    <td className="py-2 px-2 text-charcoal text-right">{winLoss}</td>
                    <td className="py-2 px-2 text-charcoal text-right">
                      {player.era !== null ? player.era.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-2 text-charcoal text-right">{player.strikeouts_pitched || '-'}</td>
                    <td className="py-2 px-2 text-charcoal text-right">{player.shutouts || '-'}</td>
                    <td className="py-2 px-2 text-charcoal text-right">
                      {player.whip !== null ? player.whip.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-2 text-burgundy font-medium text-right">
                      {formatRating(player.apba_rating, player.primary_position)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {sortedPlayers.length === 0 && (
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

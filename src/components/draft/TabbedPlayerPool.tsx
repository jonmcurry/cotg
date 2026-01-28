/**
 * Tabbed Player Pool - Separate tabs for Position Players and Pitchers
 * Sortable columns for easy draft board scanning
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import type { PlayerSeason } from '../../utils/cpuDraftLogic'

interface Props {
  players: PlayerSeason[]
  draftedPlayerIds: Set<string>
  onSelectPlayer: (player: PlayerSeason) => void
  currentTeamControl: 'human' | 'cpu'
}

type Tab = 'hitters' | 'pitchers'
type SortField = 'name' | 'position' | 'year' | 'avg' | 'hits' | 'hr' | 'rbi' | 'sb' | 'ops' | 'wins' | 'era' | 'strikeouts' | 'shutouts' | 'whip' | 'grade'
type SortDirection = 'asc' | 'desc'

// Determine if a player qualifies as a pitcher based on their actual pitching activity
// Uses innings_pitched_outs >= 30 threshold (same as DraftBoard.tsx player filter)
const isPitcher = (player: PlayerSeason): boolean => {
  return (player.innings_pitched_outs || 0) >= 30
}

// Determine if a player qualifies as a position player based on batting activity
// Uses at_bats >= 200 threshold to filter out NL pitchers who batted before DH rule
// This ensures only genuine two-way players (Babe Ruth, Shohei Ohtani) appear in both tabs
const isPositionPlayer = (player: PlayerSeason): boolean => {
  const atBats = Number(player.at_bats || 0)
  const qualifies = atBats >= 200

  // Debug logging for pitchers who might incorrectly appear as position players
  if (!qualifies && (player.innings_pitched_outs || 0) >= 30 && atBats > 0) {
    console.log('[TabbedPlayerPool] Pitcher filtered from position players:', {
      name: player.display_name || `${player.first_name} ${player.last_name}`,
      at_bats: player.at_bats,
      at_bats_type: typeof player.at_bats,
      at_bats_parsed: atBats,
      innings_pitched_outs: player.innings_pitched_outs,
      primary_position: player.primary_position
    })
  }

  return qualifies
}

// Two-way players (like Babe Ruth 1919 or Shohei Ohtani 2021) appear in BOTH tabs
// Teams can choose whether to draft them as pitcher or position player
// Once drafted in either tab, they disappear from both (handled by draftedPlayerIds filter)

export default function TabbedPlayerPool({
  players,
  draftedPlayerIds,
  onSelectPlayer,
  currentTeamControl,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('hitters')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'grade',
    direction: 'desc'
  })

  // Filter available (undrafted) players
  // Note: draftedPlayerIds contains player_id (not season id), so all seasons of a drafted player are filtered out
  const availablePlayers = useMemo(() => {
    const startTime = performance.now()
    const filtered = players.filter(p => !draftedPlayerIds.has(p.player_id))
    const filterTime = performance.now() - startTime

    console.log(`[TabbedPlayerPool] Filter completed in ${filterTime.toFixed(2)}ms | Total: ${players.length} | Drafted: ${draftedPlayerIds.size} | Available: ${filtered.length}`)

    return filtered
  }, [players, draftedPlayerIds])

  // Split into position players and pitchers based on actual activity
  // Two-way players (Babe Ruth, Shohei Ohtani) appear in BOTH tabs
  const positionPlayers = useMemo(() => {
    const filtered = availablePlayers.filter(p => isPositionPlayer(p))

    // Debug: Log any pitchers that made it through to position players (potential bug)
    const pitchersInPositionPool = filtered.filter(p => (p.innings_pitched_outs || 0) >= 30 && (p.at_bats || 0) < 200)
    if (pitchersInPositionPool.length > 0) {
      console.error('[TabbedPlayerPool] BUG DETECTED - Pitchers with < 200 AB in position players pool:', pitchersInPositionPool.map(p => ({
        name: p.display_name || `${p.first_name} ${p.last_name}`,
        at_bats: p.at_bats,
        innings_pitched_outs: p.innings_pitched_outs
      })))
    }

    return filtered
  }, [availablePlayers])

  const pitchers = useMemo(() => {
    return availablePlayers.filter(p => isPitcher(p))
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
    console.log(`[TabbedPlayerPool] Starting sort of ${filteredPlayers.length} players on field: ${sortConfig.field}, direction: ${sortConfig.direction}`)

    const sorted = [...filteredPlayers]

    sorted.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortConfig.field) {
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

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    const sortTime = performance.now() - startTime
    console.log(`[TabbedPlayerPool] Sort completed in ${sortTime.toFixed(2)}ms`)

    return sorted
  }, [filteredPlayers, sortConfig])

  const handleSort = (field: SortField) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        // Toggle direction for same field
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      } else {
        // New field, default to descending
        return { field, direction: 'desc' }
      }
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) {
      return <span className="text-charcoal/30 ml-1">⇅</span>
    }
    return sortConfig.direction === 'asc' ?
      <span className="text-burgundy ml-1">↑</span> :
      <span className="text-burgundy ml-1">↓</span>
  }

  const handlePlayerClick = (player: PlayerSeason) => {
    if (currentTeamControl === 'human') {
      onSelectPlayer(player)
    }
  }

  // Ref to measure list container height
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState(600)

  useEffect(() => {
    const updateHeight = () => {
      if (listContainerRef.current) {
        const rect = listContainerRef.current.getBoundingClientRect()
        setListHeight(rect.height)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Row renderer for hitters
  const HitterRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const player = sortedPlayers[index]
    const name = player.display_name || `${player.first_name} ${player.last_name}`
    const ops = (player.on_base_pct || 0) + (player.slugging_pct || 0)

    return (
      <div
        style={style}
        onClick={() => handlePlayerClick(player)}
        className={`
          flex items-center border-b border-charcoal/10 font-serif text-sm
          ${currentTeamControl === 'human' ? 'hover:bg-gold/10 cursor-pointer' : 'cursor-default'}
        `}
      >
        <div className="py-2 px-2 font-medium text-charcoal flex-[3]">{name}</div>
        <div className="py-2 px-2 text-burgundy text-xs font-display text-center flex-[1]">{player.primary_position}</div>
        <div className="py-2 px-2 text-charcoal/60 text-xs text-center flex-[1.5]">{player.year} {player.team_id}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">
          {player.batting_avg !== null ? `.${Math.floor(player.batting_avg * 1000)}` : '-'}
        </div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{player.hits || '-'}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{player.home_runs || '-'}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{player.rbi || '-'}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{player.stolen_bases || '-'}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{ops > 0 ? ops.toFixed(3) : '-'}</div>
        <div className="py-2 px-2 text-burgundy font-medium text-right flex-[1]">
          {player.apba_rating !== null ? player.apba_rating.toFixed(1) : 'NR'}
        </div>
      </div>
    )
  }

  // Row renderer for pitchers
  const PitcherRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const player = sortedPlayers[index]
    const name = player.display_name || `${player.first_name} ${player.last_name}`
    const winLoss = player.wins !== null && player.losses !== null
      ? `${player.wins}-${player.losses}`
      : '-'

    return (
      <div
        style={style}
        onClick={() => handlePlayerClick(player)}
        className={`
          flex items-center border-b border-charcoal/10 font-serif text-sm
          ${currentTeamControl === 'human' ? 'hover:bg-gold/10 cursor-pointer' : 'cursor-default'}
        `}
      >
        <div className="py-2 px-2 font-medium text-charcoal flex-[3]">{name}</div>
        <div className="py-2 px-2 text-burgundy text-xs font-display text-center flex-[1]">{player.primary_position}</div>
        <div className="py-2 px-2 text-charcoal/60 text-xs text-center flex-[1.5]">{player.year} {player.team_id}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{winLoss}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">
          {player.era !== null ? player.era.toFixed(2) : '-'}
        </div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{player.strikeouts_pitched || '-'}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">{player.shutouts || '-'}</div>
        <div className="py-2 px-2 text-charcoal text-right flex-[1]">
          {player.whip !== null ? player.whip.toFixed(2) : '-'}
        </div>
        <div className="py-2 px-2 text-burgundy font-medium text-right flex-[1]">
          {player.apba_rating !== null ? player.apba_rating.toFixed(1) : 'NR'}
        </div>
      </div>
    )
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
      <div className="flex-1 overflow-hidden flex flex-col" ref={listContainerRef}>
        {activeTab === 'hitters' ? (
          <>
            {/* Table Header */}
            <div className="w-full text-sm bg-cream border-b-2 border-charcoal/20">
              <div className="flex items-center text-left">
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy flex-[3]" onClick={() => handleSort('name')}>
                  Player <SortIcon field="name" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center flex-[1]" onClick={() => handleSort('position')}>
                  Pos <SortIcon field="position" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center flex-[1.5]" onClick={() => handleSort('year')}>
                  Year <SortIcon field="year" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('avg')}>
                  AVG <SortIcon field="avg" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('hits')}>
                  H <SortIcon field="hits" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('hr')}>
                  HR <SortIcon field="hr" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('rbi')}>
                  RBI <SortIcon field="rbi" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('sb')}>
                  SB <SortIcon field="sb" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('ops')}>
                  OPS <SortIcon field="ops" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('grade')}>
                  Rating <SortIcon field="grade" />
                </div>
              </div>
            </div>

            {/* Virtualized List */}
            {sortedPlayers.length > 0 ? (
              <List
                height={listHeight - 50}
                itemCount={sortedPlayers.length}
                itemSize={40}
                width="100%"
              >
                {HitterRow}
              </List>
            ) : (
              <div className="text-center py-12 text-charcoal/40 font-serif">
                No players found matching "{searchTerm}"
              </div>
            )}
          </>
        ) : (
          <>
            {/* Table Header */}
            <div className="w-full text-sm bg-cream border-b-2 border-charcoal/20">
              <div className="flex items-center text-left">
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy flex-[3]" onClick={() => handleSort('name')}>
                  Player <SortIcon field="name" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center flex-[1]" onClick={() => handleSort('position')}>
                  Pos <SortIcon field="position" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-center flex-[1.5]" onClick={() => handleSort('year')}>
                  Year <SortIcon field="year" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('wins')}>
                  W-L <SortIcon field="wins" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('era')}>
                  ERA <SortIcon field="era" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('strikeouts')}>
                  K <SortIcon field="strikeouts" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('shutouts')}>
                  SHO <SortIcon field="shutouts" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('whip')}>
                  WHIP <SortIcon field="whip" />
                </div>
                <div className="py-2 px-2 font-display text-charcoal/80 cursor-pointer hover:text-burgundy text-right flex-[1]" onClick={() => handleSort('grade')}>
                  Rating <SortIcon field="grade" />
                </div>
              </div>
            </div>

            {/* Virtualized List */}
            {sortedPlayers.length > 0 ? (
              <List
                height={listHeight - 50}
                itemCount={sortedPlayers.length}
                itemSize={40}
                width="100%"
              >
                {PitcherRow}
              </List>
            ) : (
              <div className="text-center py-12 text-charcoal/40 font-serif">
                No players found matching "{searchTerm}"
              </div>
            )}
          </>
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

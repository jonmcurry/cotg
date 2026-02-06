/**
 * League Leaders Component
 *
 * Displays top players by various statistical categories
 * Uses SIMULATION stats when available, falls back to historical stats
 */

import { useMemo } from 'react'
import type { PlayerSeason } from '../../types/player'
import type { SessionSimulationStats, PlayerSimulationStats } from '../../types/schedule.types'
import {
  formatStatValue,
  type BattingStatCategory,
  type PitchingStatCategory,
} from '../../utils/leagueLeaders'
import {
  getAllPlayerStats,
  hasSimulationStats,
  SIM_MIN_PLATE_APPEARANCES,
  SIM_MIN_INNINGS_PITCHED_OUTS,
} from '../../utils/simulationStats'

interface Props {
  players: PlayerSeason[]
  simulationStats?: SessionSimulationStats
  onPlayerClick?: (player: PlayerSeason) => void
}

interface SimLeaderEntry {
  stats: PlayerSimulationStats
  value: number
  rank: number
}

interface LeaderCardProps {
  title: string
  leaders: SimLeaderEntry[]
  category: BattingStatCategory | PitchingStatCategory
  onPlayerClick?: (displayName: string) => void
  isSimulation: boolean
}

function LeaderCard({ title, leaders, category, onPlayerClick, isSimulation }: LeaderCardProps) {
  if (leaders.length === 0) {
    return (
      <div className="bg-white border border-charcoal/10 rounded-sm p-4">
        <h4 className="font-display font-bold text-sm uppercase tracking-wide text-charcoal/70 mb-2">
          {title}
        </h4>
        <p className="text-sm text-charcoal/40 italic">
          {isSimulation ? 'No qualifying players yet' : 'No qualifying players'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-charcoal/10 rounded-sm p-4">
      <h4 className="font-display font-bold text-sm uppercase tracking-wide text-charcoal/70 mb-3">
        {title}
      </h4>
      <div className="space-y-2">
        {leaders.map((entry, idx) => (
          <div
            key={entry.stats.playerSeasonId}
            className={`
              flex items-center justify-between text-sm
              ${idx === 0 ? 'font-semibold' : ''}
              ${onPlayerClick ? 'cursor-pointer hover:text-burgundy' : ''}
            `}
            onClick={() => onPlayerClick?.(entry.stats.displayName)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`
                w-5 text-center font-display text-xs
                ${idx === 0 ? 'text-gold' : 'text-charcoal/40'}
              `}>
                {entry.rank}
              </span>
              <span className="truncate">
                {entry.stats.displayName}
              </span>
            </div>
            <span className={`
              font-mono text-sm ml-2
              ${idx === 0 ? 'text-burgundy font-bold' : 'text-charcoal/70'}
            `}>
              {formatStatValue(entry.value, category)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Calculate simulation-based leaders for a stat category
 */
function getSimBattingLeaders(
  allStats: PlayerSimulationStats[],
  category: BattingStatCategory,
  limit: number = 5
): SimLeaderEntry[] {
  // Filter to players with enough plate appearances
  const qualifying = allStats.filter(s => {
    const pa = s.atBats + s.walks
    return pa >= SIM_MIN_PLATE_APPEARANCES
  })

  let getValue: (s: PlayerSimulationStats) => number

  switch (category) {
    case 'avg':
      getValue = (s) => s.atBats > 0 ? s.hits / s.atBats : 0
      break
    case 'hr':
      getValue = (s) => s.homeRuns
      break
    case 'rbi':
      getValue = (s) => s.rbi
      break
    case 'hits':
      getValue = (s) => s.hits
      break
    case 'sb':
      getValue = (s) => s.stolenBases
      break
    default:
      return []
  }

  const sorted = [...qualifying].sort((a, b) => getValue(b) - getValue(a))

  return sorted.slice(0, limit).map((stats, index) => ({
    stats,
    value: getValue(stats),
    rank: index + 1,
  }))
}

function getSimPitchingLeaders(
  allStats: PlayerSimulationStats[],
  category: PitchingStatCategory,
  limit: number = 5
): SimLeaderEntry[] {
  // Filter to players with enough innings
  const qualifying = allStats.filter(s => s.inningsPitchedOuts >= SIM_MIN_INNINGS_PITCHED_OUTS)

  let getValue: (s: PlayerSimulationStats) => number
  let sortAscending = false

  switch (category) {
    case 'era':
      getValue = (s) => {
        const ip = s.inningsPitchedOuts / 3
        return ip > 0 ? (s.earnedRuns / ip) * 9 : 999
      }
      sortAscending = true
      break
    case 'wins':
      getValue = (s) => s.wins
      break
    case 'strikeouts':
      getValue = (s) => s.strikeoutsThrown
      break
    case 'saves':
      getValue = (s) => s.saves
      break
    default:
      return []
  }

  const sorted = [...qualifying].sort((a, b) => {
    const aVal = getValue(a)
    const bVal = getValue(b)
    return sortAscending ? aVal - bVal : bVal - aVal
  })

  return sorted.slice(0, limit).map((stats, index) => ({
    stats,
    value: getValue(stats),
    rank: index + 1,
  }))
}

export default function LeagueLeaders({ players, simulationStats, onPlayerClick }: Props) {
  const useSimStats = hasSimulationStats(simulationStats)
  const allSimStats = useMemo(
    () => simulationStats ? getAllPlayerStats(simulationStats) : [],
    [simulationStats]
  )

  // Calculate leaders based on source
  const battingAvgLeaders = useMemo(
    () => useSimStats ? getSimBattingLeaders(allSimStats, 'avg') : [],
    [useSimStats, allSimStats]
  )
  const hrLeaders = useMemo(
    () => useSimStats ? getSimBattingLeaders(allSimStats, 'hr') : [],
    [useSimStats, allSimStats]
  )
  const rbiLeaders = useMemo(
    () => useSimStats ? getSimBattingLeaders(allSimStats, 'rbi') : [],
    [useSimStats, allSimStats]
  )
  const hitsLeaders = useMemo(
    () => useSimStats ? getSimBattingLeaders(allSimStats, 'hits') : [],
    [useSimStats, allSimStats]
  )
  const sbLeaders = useMemo(
    () => useSimStats ? getSimBattingLeaders(allSimStats, 'sb') : [],
    [useSimStats, allSimStats]
  )

  const eraLeaders = useMemo(
    () => useSimStats ? getSimPitchingLeaders(allSimStats, 'era') : [],
    [useSimStats, allSimStats]
  )
  const winsLeaders = useMemo(
    () => useSimStats ? getSimPitchingLeaders(allSimStats, 'wins') : [],
    [useSimStats, allSimStats]
  )
  const kLeaders = useMemo(
    () => useSimStats ? getSimPitchingLeaders(allSimStats, 'strikeouts') : [],
    [useSimStats, allSimStats]
  )
  const savesLeaders = useMemo(
    () => useSimStats ? getSimPitchingLeaders(allSimStats, 'saves') : [],
    [useSimStats, allSimStats]
  )

  // Handler that finds player by name for clicking
  const handlePlayerClick = (displayName: string) => {
    if (!onPlayerClick) return
    const player = players.find(p =>
      (p.display_name || `${p.first_name} ${p.last_name}`) === displayName
    )
    if (player) onPlayerClick(player)
  }

  return (
    <div className="space-y-6">
      {/* Source Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
            useSimStats
              ? 'bg-burgundy/10 text-burgundy'
              : 'bg-charcoal/10 text-charcoal/60'
          }`}>
            {useSimStats ? 'Simulation Stats' : 'Historical Stats'}
          </span>
          {useSimStats && (
            <span className="text-xs text-charcoal/50">
              Min {SIM_MIN_PLATE_APPEARANCES} PA (batting) / {SIM_MIN_INNINGS_PITCHED_OUTS / 3} IP (pitching)
            </span>
          )}
        </div>
      </div>

      {!useSimStats && (
        <div className="bg-gold/10 border border-gold/30 rounded-sm p-4 text-sm text-charcoal/70">
          <strong>No simulation data yet.</strong> Simulate some games to see leaders based on your fantasy season performance.
          Historical stats are shown below for reference.
        </div>
      )}

      {/* Batting Leaders */}
      <div>
        <h3 className="font-display font-bold text-lg uppercase tracking-widest text-burgundy mb-4 border-b border-burgundy/20 pb-2">
          Batting Leaders
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <LeaderCard
            title="Batting Average"
            leaders={battingAvgLeaders}
            category="avg"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="Home Runs"
            leaders={hrLeaders}
            category="hr"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="RBI"
            leaders={rbiLeaders}
            category="rbi"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="Hits"
            leaders={hitsLeaders}
            category="hits"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="Stolen Bases"
            leaders={sbLeaders}
            category="sb"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
        </div>
      </div>

      {/* Pitching Leaders */}
      <div>
        <h3 className="font-display font-bold text-lg uppercase tracking-widest text-burgundy mb-4 border-b border-burgundy/20 pb-2">
          Pitching Leaders
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LeaderCard
            title="ERA"
            leaders={eraLeaders}
            category="era"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="Wins"
            leaders={winsLeaders}
            category="wins"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="Strikeouts"
            leaders={kLeaders}
            category="strikeouts"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
          <LeaderCard
            title="Saves"
            leaders={savesLeaders}
            category="saves"
            onPlayerClick={handlePlayerClick}
            isSimulation={useSimStats}
          />
        </div>
      </div>
    </div>
  )
}

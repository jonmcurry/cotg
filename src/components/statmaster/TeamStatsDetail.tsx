/**
 * Team Stats Detail Component
 *
 * Shows detailed roster stats for a selected team
 * Uses SIMULATION stats when available
 */

import { ArrowLeft } from 'lucide-react'
import type { DraftTeam } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'
import type { SessionSimulationStats, PlayerSimulationStats } from '../../types/schedule.types'
import { hasSimulationStats } from '../../utils/simulationStats'

interface Props {
  team: DraftTeam
  players: PlayerSeason[]
  simulationStats?: SessionSimulationStats
  onBack: () => void
}

// Position groups for organized display
const INFIELD_POSITIONS = ['C', '1B', '2B', 'SS', '3B']
const OUTFIELD_POSITIONS = ['OF', 'LF', 'CF', 'RF']
const PITCHER_POSITIONS = ['SP', 'RP', 'P', 'CL']

// Combined player data (historical + sim stats)
interface PlayerWithSimStats {
  player: PlayerSeason
  simStats?: PlayerSimulationStats
}

function SimBatterRow({ data, showPosition }: { data: PlayerWithSimStats; showPosition?: boolean }) {
  const { player, simStats } = data
  const hasStats = simStats && simStats.atBats > 0

  // Use sim stats if available, otherwise historical
  const atBats = hasStats ? simStats.atBats : player.at_bats
  const hits = hasStats ? simStats.hits : player.hits
  const hr = hasStats ? simStats.homeRuns : player.home_runs
  const rbi = hasStats ? simStats.rbi : player.rbi
  const sb = hasStats ? simStats.stolenBases : player.stolen_bases
  const avg = hasStats && simStats.atBats > 0
    ? simStats.hits / simStats.atBats
    : player.batting_avg
  const obp = hasStats
    ? (simStats.atBats + simStats.walks) > 0
      ? (simStats.hits + simStats.walks) / (simStats.atBats + simStats.walks)
      : 0
    : player.on_base_pct

  // Calculate SLG from sim stats
  let slg = player.slugging_pct
  if (hasStats && simStats.atBats > 0) {
    const singles = simStats.hits - simStats.doubles - simStats.triples - simStats.homeRuns
    const totalBases = singles + simStats.doubles * 2 + simStats.triples * 3 + simStats.homeRuns * 4
    slg = totalBases / simStats.atBats
  }

  return (
    <tr className={`border-b border-charcoal/5 hover:bg-cream-light/50 ${hasStats ? 'bg-burgundy/5' : ''}`}>
      <td className="py-2 px-2 font-serif">
        {player.display_name || `${player.first_name} ${player.last_name}`}
        {hasStats && <span className="ml-1 text-xs text-burgundy font-bold">*</span>}
      </td>
      {showPosition && (
        <td className="py-2 px-2 text-center text-xs uppercase text-charcoal/50">
          {player.primary_position}
        </td>
      )}
      <td className="py-2 px-2 text-center font-mono text-sm">
        {avg?.toFixed(3).replace(/^0/, '') ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {atBats ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {hits ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {hr ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {rbi ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {sb ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {obp?.toFixed(3).replace(/^0/, '') ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {slg?.toFixed(3).replace(/^0/, '') ?? '-'}
      </td>
    </tr>
  )
}

function SimPitcherRow({ data }: { data: PlayerWithSimStats }) {
  const { player, simStats } = data
  const hasStats = simStats && simStats.inningsPitchedOuts > 0

  // Use sim stats if available
  const ipOuts = hasStats ? simStats.inningsPitchedOuts : player.innings_pitched_outs
  const ip = ipOuts ? (ipOuts / 3).toFixed(1) : '-'

  const wins = hasStats ? simStats.wins : player.wins
  const losses = hasStats ? simStats.losses : player.losses
  const saves = hasStats ? simStats.saves : player.saves
  const k = hasStats ? simStats.strikeoutsThrown : player.strikeouts_pitched

  // Calculate ERA and WHIP from sim stats
  let era = player.era
  let whip = player.whip
  if (hasStats && simStats.inningsPitchedOuts > 0) {
    const innings = simStats.inningsPitchedOuts / 3
    era = (simStats.earnedRuns / innings) * 9
    whip = (simStats.walksAllowed + simStats.hitsAllowed) / innings
  }

  return (
    <tr className={`border-b border-charcoal/5 hover:bg-cream-light/50 ${hasStats ? 'bg-burgundy/5' : ''}`}>
      <td className="py-2 px-2 font-serif">
        {player.display_name || `${player.first_name} ${player.last_name}`}
        {hasStats && <span className="ml-1 text-xs text-burgundy font-bold">*</span>}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {wins ?? '-'}-{losses ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {era?.toFixed(2) ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {ip}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {k ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {saves ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {whip?.toFixed(2) ?? '-'}
      </td>
    </tr>
  )
}

function BatterGroup({
  title,
  data,
  showPosition = false,
}: {
  title: string
  data: PlayerWithSimStats[]
  showPosition?: boolean
}) {
  if (data.length === 0) return null

  return (
    <div className="mb-6">
      <h4 className="font-display font-bold text-sm uppercase tracking-widest text-burgundy mb-2 border-b border-burgundy/20 pb-1">
        {title}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-charcoal/20">
              <th className="py-2 px-2 text-left font-display uppercase text-xs tracking-wide">
                Player
              </th>
              {showPosition && (
                <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">Pos</th>
              )}
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">AVG</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">AB</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">H</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">HR</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">RBI</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">SB</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">OBP</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">SLG</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <SimBatterRow key={d.player.id} data={d} showPosition={showPosition} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PitcherGroup({
  title,
  data,
}: {
  title: string
  data: PlayerWithSimStats[]
}) {
  if (data.length === 0) return null

  return (
    <div className="mb-6">
      <h4 className="font-display font-bold text-sm uppercase tracking-widest text-burgundy mb-2 border-b border-burgundy/20 pb-1">
        {title}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-charcoal/20">
              <th className="py-2 px-2 text-left font-display uppercase text-xs tracking-wide">
                Player
              </th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">W-L</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">ERA</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">IP</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">K</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">SV</th>
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">WHIP</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <SimPitcherRow key={d.player.id} data={d} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TeamStatsDetail({ team, players, simulationStats, onBack }: Props) {
  const useSimStats = hasSimulationStats(simulationStats)

  // Get player IDs from team roster
  const rosterPlayerIds = new Set(
    team.roster
      .filter((slot) => slot.playerSeasonId)
      .map((slot) => slot.playerSeasonId!)
  )

  // Filter players to only those on this team's roster and merge with sim stats
  const teamPlayersWithStats: PlayerWithSimStats[] = players
    .filter((p) => rosterPlayerIds.has(p.id))
    .map((player) => ({
      player,
      simStats: simulationStats?.playerStats.get(player.id),
    }))

  // Group by position type
  const infielders = teamPlayersWithStats.filter((d) =>
    INFIELD_POSITIONS.includes(d.player.primary_position)
  )
  const outfielders = teamPlayersWithStats.filter((d) =>
    OUTFIELD_POSITIONS.includes(d.player.primary_position)
  )
  const pitchers = teamPlayersWithStats.filter((d) =>
    PITCHER_POSITIONS.includes(d.player.primary_position)
  )
  const others = teamPlayersWithStats.filter(
    (d) =>
      !INFIELD_POSITIONS.includes(d.player.primary_position) &&
      !OUTFIELD_POSITIONS.includes(d.player.primary_position) &&
      !PITCHER_POSITIONS.includes(d.player.primary_position)
  )

  // Sort each group by appropriate stat (using sim stats if available)
  const getAvg = (d: PlayerWithSimStats) => {
    if (d.simStats && d.simStats.atBats > 0) {
      return d.simStats.hits / d.simStats.atBats
    }
    return d.player.batting_avg || 0
  }
  const getEra = (d: PlayerWithSimStats) => {
    if (d.simStats && d.simStats.inningsPitchedOuts > 0) {
      return (d.simStats.earnedRuns / (d.simStats.inningsPitchedOuts / 3)) * 9
    }
    return d.player.era || 999
  }

  infielders.sort((a, b) => getAvg(b) - getAvg(a))
  outfielders.sort((a, b) => getAvg(b) - getAvg(a))
  pitchers.sort((a, b) => getEra(a) - getEra(b))
  others.sort((a, b) => getAvg(b) - getAvg(a))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-burgundy transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Standings</span>
        </button>
        <div className="flex-1">
          <h3 className="font-display font-bold text-xl uppercase tracking-wider">
            {team.name}
          </h3>
          {team.league && team.division && (
            <span className="text-sm text-charcoal/50">
              {team.league} {team.division}
            </span>
          )}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
          useSimStats
            ? 'bg-burgundy/10 text-burgundy'
            : 'bg-charcoal/10 text-charcoal/60'
        }`}>
          {useSimStats ? 'Simulation Stats' : 'Historical Stats'}
        </span>
      </div>

      {useSimStats && (
        <div className="mb-4 text-xs text-charcoal/50">
          <span className="text-burgundy font-bold">*</span> = Has simulation data
        </div>
      )}

      {/* Team Roster Stats */}
      {teamPlayersWithStats.length === 0 ? (
        <div className="text-center py-8 text-charcoal/50 italic">
          No roster data available for this team.
        </div>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-sm p-4">
          <BatterGroup title="Infield" data={infielders} />
          <BatterGroup title="Outfield" data={outfielders} />
          {others.length > 0 && <BatterGroup title="Other" data={others} showPosition />}
          <PitcherGroup title="Pitchers" data={pitchers} />
        </div>
      )}
    </div>
  )
}

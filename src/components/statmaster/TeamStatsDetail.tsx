/**
 * Team Stats Detail Component
 *
 * Shows detailed roster stats for a selected team
 * Part of the StatMaster view
 */

import { ArrowLeft } from 'lucide-react'
import type { DraftTeam } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'

interface Props {
  team: DraftTeam
  players: PlayerSeason[]
  onBack: () => void
}

// Position groups for organized display
const INFIELD_POSITIONS = ['C', '1B', '2B', 'SS', '3B']
const OUTFIELD_POSITIONS = ['OF', 'LF', 'CF', 'RF']
const PITCHER_POSITIONS = ['SP', 'RP', 'P', 'CL']

function PlayerRow({ player, showPitching }: { player: PlayerSeason; showPitching?: boolean }) {
  if (showPitching) {
    const ip = player.innings_pitched_outs
      ? (player.innings_pitched_outs / 3).toFixed(1)
      : '-'

    return (
      <tr className="border-b border-charcoal/5 hover:bg-cream-light/50">
        <td className="py-2 px-2 font-serif">
          {player.display_name || `${player.first_name} ${player.last_name}`}
        </td>
        <td className="py-2 px-2 text-center text-xs text-charcoal/60">
          {player.year}
        </td>
        <td className="py-2 px-2 text-center font-mono text-sm">
          {player.wins ?? '-'}-{player.losses ?? '-'}
        </td>
        <td className="py-2 px-2 text-center font-mono text-sm">
          {player.era?.toFixed(2) ?? '-'}
        </td>
        <td className="py-2 px-2 text-center font-mono text-sm">
          {ip}
        </td>
        <td className="py-2 px-2 text-center font-mono text-sm">
          {player.strikeouts_pitched ?? '-'}
        </td>
        <td className="py-2 px-2 text-center font-mono text-sm">
          {player.saves ?? '-'}
        </td>
        <td className="py-2 px-2 text-center font-mono text-sm">
          {player.whip?.toFixed(2) ?? '-'}
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-charcoal/5 hover:bg-cream-light/50">
      <td className="py-2 px-2 font-serif">
        {player.display_name || `${player.first_name} ${player.last_name}`}
      </td>
      <td className="py-2 px-2 text-center text-xs text-charcoal/60">
        {player.year}
      </td>
      <td className="py-2 px-2 text-center text-xs uppercase text-charcoal/50">
        {player.primary_position}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.batting_avg?.toFixed(3).replace(/^0/, '') ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.at_bats ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.hits ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.home_runs ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.rbi ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.stolen_bases ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.on_base_pct?.toFixed(3).replace(/^0/, '') ?? '-'}
      </td>
      <td className="py-2 px-2 text-center font-mono text-sm">
        {player.slugging_pct?.toFixed(3).replace(/^0/, '') ?? '-'}
      </td>
    </tr>
  )
}

function PositionGroup({
  title,
  players,
  showPitching,
}: {
  title: string
  players: PlayerSeason[]
  showPitching?: boolean
}) {
  if (players.length === 0) return null

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
              <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">
                Yr
              </th>
              {showPitching ? (
                <>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">W-L</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">ERA</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">IP</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">K</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">SV</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">WHIP</th>
                </>
              ) : (
                <>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">Pos</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">AVG</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">AB</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">H</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">HR</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">RBI</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">SB</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">OBP</th>
                  <th className="py-2 px-2 text-center font-display uppercase text-xs tracking-wide">SLG</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <PlayerRow key={player.id} player={player} showPitching={showPitching} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TeamStatsDetail({ team, players, onBack }: Props) {
  // Get player IDs from team roster
  const rosterPlayerIds = new Set(
    team.roster
      .filter((slot) => slot.playerSeasonId)
      .map((slot) => slot.playerSeasonId!)
  )

  // Filter players to only those on this team's roster
  const teamPlayers = players.filter((p) => rosterPlayerIds.has(p.id))

  // Group by position type
  const infielders = teamPlayers.filter((p) =>
    INFIELD_POSITIONS.includes(p.primary_position)
  )
  const outfielders = teamPlayers.filter((p) =>
    OUTFIELD_POSITIONS.includes(p.primary_position)
  )
  const pitchers = teamPlayers.filter((p) =>
    PITCHER_POSITIONS.includes(p.primary_position)
  )
  const others = teamPlayers.filter(
    (p) =>
      !INFIELD_POSITIONS.includes(p.primary_position) &&
      !OUTFIELD_POSITIONS.includes(p.primary_position) &&
      !PITCHER_POSITIONS.includes(p.primary_position)
  )

  // Sort each group by appropriate stat
  infielders.sort((a, b) => (b.batting_avg || 0) - (a.batting_avg || 0))
  outfielders.sort((a, b) => (b.batting_avg || 0) - (a.batting_avg || 0))
  pitchers.sort((a, b) => (a.era || 999) - (b.era || 999))
  others.sort((a, b) => (b.batting_avg || 0) - (a.batting_avg || 0))

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
      </div>

      {/* Team Roster Stats */}
      {teamPlayers.length === 0 ? (
        <div className="text-center py-8 text-charcoal/50 italic">
          No roster data available for this team.
        </div>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-sm p-4">
          <PositionGroup title="Infield" players={infielders} />
          <PositionGroup title="Outfield" players={outfielders} />
          {others.length > 0 && <PositionGroup title="Other" players={others} />}
          <PositionGroup title="Pitchers" players={pitchers} showPitching />
        </div>
      )}
    </div>
  )
}

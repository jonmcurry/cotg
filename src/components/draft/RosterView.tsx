/**
 * Roster View Component
 * Displays current team roster with position slots
 * Implements SRD requirements FR-RM-001 to FR-RM-006
 */

import { useMemo } from 'react'
import type { DraftTeam, PositionCode } from '../../types/draft.types'
import { POSITION_NAMES, ROSTER_REQUIREMENTS } from '../../types/draft.types'
import type { PlayerSeason } from '../../utils/cpuDraftLogic'

interface Props {
  team: DraftTeam
  players: PlayerSeason[] // All players for lookup
}

export default function RosterView({ team, players }: Props) {
  // Create a lookup map for player details
  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerSeason>()
    players.forEach(p => map.set(p.id, p))
    return map
  }, [players])

  // Group roster slots by position
  const groupedRoster = useMemo(() => {
    const groups: Record<PositionCode, typeof team.roster> = {
      'C': [],
      '1B': [],
      '2B': [],
      'SS': [],
      '3B': [],
      'OF': [],
      'SP': [],
      'RP': [],
      'CL': [],
      'DH': [],
      'BN': [],
    }

    team.roster.forEach(slot => {
      groups[slot.position].push(slot)
    })

    return groups
  }, [team.roster])

  // Calculate position counts
  const positionCounts = useMemo(() => {
    const counts: Record<string, { filled: number; total: number }> = {}

    Object.entries(ROSTER_REQUIREMENTS).forEach(([position, total]) => {
      const filled = team.roster.filter(
        slot => slot.position === position && slot.isFilled
      ).length

      counts[position] = { filled, total }
    })

    return counts
  }, [team.roster])

  const totalFilled = team.roster.filter(s => s.isFilled).length
  const totalSlots = team.roster.length

  const renderSlot = (slot: typeof team.roster[0]) => {
    const player = slot.playerSeasonId ? playerMap.get(slot.playerSeasonId) : null

    if (!player) {
      return (
        <div className="flex items-center justify-between py-2 px-3 bg-charcoal/5 rounded">
          <span className="text-charcoal/40 font-serif text-sm">[Empty]</span>
        </div>
      )
    }

    const isPitcher = ['SP', 'RP', 'CL', 'P'].includes(player.primary_position)

    return (
      <div className="flex items-center justify-between py-2 px-3 bg-gold/10 border border-gold/30 rounded">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-charcoal text-sm truncate">
            {player.display_name}
          </div>
          <div className="text-xs text-charcoal/60">
            {player.team_id} ({player.year})
          </div>
        </div>
        <div className="ml-3 text-right">
          <div className="text-xs font-semibold text-burgundy">
            WAR {player.war?.toFixed(1) || 'N/A'}
          </div>
          <div className="text-xs text-charcoal/60">
            {isPitcher
              ? `ERA ${player.era?.toFixed(2) || 'N/A'}`
              : `AVG ${player.batting_avg?.toFixed(3) || 'N/A'}`}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-display text-burgundy mb-1">
          {team.name}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-serif text-charcoal/70">
            {totalFilled}/{totalSlots} Players
          </span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            team.control === 'human'
              ? 'bg-gold/20 text-gold-dark'
              : 'bg-charcoal/10 text-charcoal/70'
          }`}>
            {team.control.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Roster Slots */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Infielders */}
        <div>
          <h3 className="text-sm font-display text-charcoal/60 mb-2 uppercase tracking-wide">
            Infield
          </h3>
          <div className="space-y-1">
            {(['C', '1B', '2B', 'SS', '3B'] as PositionCode[]).map(position => (
              <div key={position}>
                <div className="text-xs font-semibold text-burgundy mb-1">
                  {POSITION_NAMES[position]}:
                </div>
                {groupedRoster[position].map((slot, idx) => (
                  <div key={`${position}-${idx}`} className="mb-2">
                    {renderSlot(slot)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Outfield */}
        <div>
          <h3 className="text-sm font-display text-charcoal/60 mb-2 uppercase tracking-wide">
            Outfield
          </h3>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-burgundy mb-1">
              {POSITION_NAMES['OF']}:
            </div>
            {groupedRoster['OF'].map((slot, idx) => (
              <div key={`OF-${idx}`} className="mb-2">
                {renderSlot(slot)}
              </div>
            ))}
          </div>
        </div>

        {/* Pitchers */}
        <div>
          <h3 className="text-sm font-display text-charcoal/60 mb-2 uppercase tracking-wide">
            Pitching
          </h3>
          <div className="space-y-1">
            {(['SP', 'RP', 'CL'] as PositionCode[]).map(position => (
              <div key={position}>
                <div className="text-xs font-semibold text-burgundy mb-1">
                  {POSITION_NAMES[position]}:
                </div>
                {groupedRoster[position].map((slot, idx) => (
                  <div key={`${position}-${idx}`} className="mb-2">
                    {renderSlot(slot)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* DH & Bench */}
        <div>
          <h3 className="text-sm font-display text-charcoal/60 mb-2 uppercase tracking-wide">
            Other
          </h3>
          <div className="space-y-1">
            {(['DH', 'BN'] as PositionCode[]).map(position => (
              <div key={position}>
                <div className="text-xs font-semibold text-burgundy mb-1">
                  {POSITION_NAMES[position]}:
                </div>
                {groupedRoster[position].map((slot, idx) => (
                  <div key={`${position}-${idx}`} className="mb-2">
                    {renderSlot(slot)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Position Summary */}
      <div className="mt-4 pt-4 border-t border-charcoal/10">
        <h3 className="text-xs font-display text-charcoal/60 mb-2 uppercase tracking-wide">
          Position Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-2 text-xs font-serif">
          {Object.entries(positionCounts).map(([position, counts]) => (
            <div key={position} className="flex justify-between">
              <span className="text-charcoal/70">{position}:</span>
              <span className={`font-semibold ${
                counts.filled === counts.total
                  ? 'text-green-600'
                  : 'text-burgundy'
              }`}>
                {counts.filled}/{counts.total}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

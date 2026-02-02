/**
 * Roster View Component
 * Displays current team roster with position slots
 * Implements SRD requirements FR-RM-001 to FR-RM-006
 */

import { useMemo } from 'react'
import type { DraftTeam, PositionCode } from '../../types/draft.types'
import { ROSTER_REQUIREMENTS } from '../../types/draft.types'
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
        <div className="flex items-center justify-between py-2 px-3 border-b border-charcoal/10 min-h-[42px]">
          <span className="text-charcoal/30 font-serif italic text-sm tracking-wide">
            ......................................................
          </span>
        </div>
      )
    }

    const isPitcher = ['SP', 'RP', 'CL', 'P'].includes(player.primary_position)

    return (
      <div className="flex items-center justify-between py-1 px-2 border-b border-charcoal/10 bg-gold/5 min-h-[42px] group hover:bg-gold/10 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-charcoal text-sm truncate uppercase tracking-wide">
            {player.last_name}, {player.first_name}
          </div>
          <div className="text-xs text-charcoal/60 font-serif flex gap-2">
            <span>{player.team_id} '{player.year.toString().slice(-2)}</span>
            <span className="text-burgundy font-semibold">WAR {player.war?.toFixed(1) || '-'}</span>
          </div>
        </div>
        <div className="ml-3 text-right">
          <div className="text-xs font-mono text-charcoal/70 bg-cream px-1 rounded border border-charcoal/10">
            {isPitcher
              ? `${player.era?.toFixed(2)} ERA`
              : `.${Math.floor((player.batting_avg || 0) * 1000)}`}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card h-full flex flex-col bg-cream-light relative overflow-hidden">
      {/* "Hole Punch" decoration */}
      <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-charcoal/10 shadow-inner"></div>
      <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-charcoal/10 shadow-inner"></div>

      {/* Header */}
      <div className="mb-6 text-center border-b-2 border-charcoal pb-4 mt-2">
        <h2 className="text-2xl font-display font-bold text-charcoal uppercase tracking-[0.1em]">
          Official Roster
        </h2>
        <div className="flex justify-center items-center gap-3 mt-1 text-sm font-serif italic text-charcoal/60">
          <span>{team.name}</span>
          <span>•</span>
          <span>{totalFilled} / {totalSlots} Assigned</span>
        </div>
      </div>

      {/* Roster Slots */}
      <div className="flex-1 overflow-auto space-y-6 pr-2">
        {/* Infielders */}
        <div>
          <h3 className="text-xs font-sans font-bold text-charcoal/40 mb-2 uppercase tracking-widest border-b border-charcoal/10">
            Infield
          </h3>
          <div className="space-y-0">
            {(['C', '1B', '2B', 'SS', '3B'] as PositionCode[]).map(position => (
              <div key={position} className="flex hover:bg-charcoal/5">
                <div className="w-12 py-2 flex items-center justify-center border-r border-charcoal/10 text-xs font-bold text-charcoal/50 bg-charcoal/5">
                  {position}
                </div>
                <div className="flex-1">
                  {groupedRoster[position].map((slot, idx) => (
                    <div key={`${position}-${idx}`}>
                      {renderSlot(slot)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outfield */}
        <div>
          <h3 className="text-xs font-sans font-bold text-charcoal/40 mb-2 uppercase tracking-widest border-b border-charcoal/10">
            Outfield
          </h3>
          <div className="space-y-0">
            <div className="flex hover:bg-charcoal/5">
              <div className="w-12 flex items-center justify-center border-r border-charcoal/10 text-xs font-bold text-charcoal/50 bg-charcoal/5">
                OF
              </div>
              <div className="flex-1">
                {groupedRoster['OF'].map((slot, idx) => (
                  <div key={`OF-${idx}`}>
                    {renderSlot(slot)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pitchers */}
        <div>
          <h3 className="text-xs font-sans font-bold text-charcoal/40 mb-2 uppercase tracking-widest border-b border-charcoal/10">
            Pitching Staff
          </h3>
          <div className="space-y-0">
            {(['SP', 'RP', 'CL'] as PositionCode[]).map(position => (
              <div key={position} className="flex hover:bg-charcoal/5">
                <div className="w-12 flex items-center justify-center border-r border-charcoal/10 text-xs font-bold text-charcoal/50 bg-charcoal/5">
                  {position}
                </div>
                <div className="flex-1">
                  {groupedRoster[position].map((slot, idx) => (
                    <div key={`${position}-${idx}`}>
                      {renderSlot(slot)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other */}
        <div>
          <h3 className="text-xs font-sans font-bold text-charcoal/40 mb-2 uppercase tracking-widest border-b border-charcoal/10">
            Reserves
          </h3>
          <div className="space-y-0">
            {(['DH', 'BN'] as PositionCode[]).map(position => (
              <div key={position} className="flex hover:bg-charcoal/5">
                <div className="w-12 flex items-center justify-center border-r border-charcoal/10 text-xs font-bold text-charcoal/50 bg-charcoal/5">
                  {position === 'BN' ? 'BEN' : position}
                </div>
                <div className="flex-1">
                  {groupedRoster[position].map((slot, idx) => (
                    <div key={`${position}-${idx}`}>
                      {renderSlot(slot)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Position Summary - Footer */}
      <div className="mt-4 pt-4 border-t-2 border-charcoal/20 bg-charcoal/5 -mx-6 -mb-6 px-6 pb-2">
        <div className="grid grid-cols-4 gap-2 text-[10px] font-sans uppercase tracking-wider">
          {Object.entries(positionCounts).map(([position, counts]) => (
            <div key={position} className="flex justify-between items-center bg-white/50 px-2 py-1 rounded">
              <span className="text-charcoal/60">{position}</span>
              <span className={`font-bold ${counts.filled === counts.total
                ? 'text-green-700'
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

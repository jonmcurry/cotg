/**
 * Position Assignment Modal
 * Allows user to assign drafted player to specific roster position
 * Implements SRD UI requirement 7.4
 */

import { useState, useMemo } from 'react'
import type { DraftTeam, PositionCode } from '../../types/draft.types'
import { POSITION_NAMES, POSITION_ELIGIBILITY } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'

interface Props {
  player: PlayerSeason
  team: DraftTeam
  onConfirm: (position: PositionCode, slotNumber: number) => void
  onCancel: () => void
}

export default function PositionAssignmentModal({
  player,
  team,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<{
    position: PositionCode
    slotNumber: number
  } | null>(null)

  // Find eligible roster slots for this player
  const eligibleSlots = useMemo(() => {
    const slots = team.roster.filter(slot => {
      // Slot must be empty
      if (slot.isFilled) return false

      // Check if player qualifies for this position
      const eligiblePositions = POSITION_ELIGIBILITY[slot.position] || []
      return eligiblePositions.includes(player.primary_position)
    })

    // Group by position
    const grouped: Record<string, typeof slots> = {}
    slots.forEach(slot => {
      const key = slot.position
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(slot)
    })

    return grouped
  }, [player, team])

  const handleConfirm = () => {
    if (selectedSlot) {
      onConfirm(selectedSlot.position, selectedSlot.slotNumber)
    }
  }

  // Detect two-way players (Babe Ruth, Shohei Ohtani) who both pitch and hit
  // 200 at_bats threshold filters out NL pitchers who batted before DH rule
  const isPitcher = (player.innings_pitched_outs || 0) >= 30
  const isPositionPlayer = (player.at_bats || 0) >= 200
  const isTwoWayPlayer = isPitcher && isPositionPlayer

  return (
    <div className="fixed inset-0 bg-charcoal/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cream border-b border-charcoal/10 p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-display text-burgundy">Assign Position</h2>
            <button
              onClick={onCancel}
              className="text-charcoal/40 hover:text-charcoal text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Player Info */}
        <div className="p-6 bg-gold/5 border-b border-charcoal/10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-charcoal mb-1">
                {player.display_name}
              </h3>
              <div className="text-sm text-charcoal/60 font-serif">
                {player.team_id} ({player.year}) • {player.primary_position}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-charcoal/60">WAR</div>
              <div className="text-xl font-bold text-burgundy">
                {player.war?.toFixed(1) || 'N/A'}
              </div>
            </div>
          </div>

          {/* Show both hitting and pitching stats for two-way players */}
          {isTwoWayPlayer ? (
            <>
              <div className="text-xs text-charcoal/60 mt-4 mb-2 font-semibold">Hitting</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-charcoal/60">AVG</div>
                  <div className="font-semibold text-charcoal">
                    {player.batting_avg?.toFixed(3) || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-charcoal/60">HR</div>
                  <div className="font-semibold text-charcoal">
                    {player.home_runs || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-charcoal/60">RBI</div>
                  <div className="font-semibold text-charcoal">
                    {player.rbi || 0}
                  </div>
                </div>
              </div>
              <div className="text-xs text-charcoal/60 mt-4 mb-2 font-semibold">Pitching</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-charcoal/60">W-L</div>
                  <div className="font-semibold text-charcoal">
                    {player.wins || 0}-{player.losses || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-charcoal/60">ERA</div>
                  <div className="font-semibold text-charcoal">
                    {player.era?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-charcoal/60">K</div>
                  <div className="font-semibold text-charcoal">
                    {player.strikeouts_pitched || 0}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              {isPitcher ? (
                <>
                  <div>
                    <div className="text-xs text-charcoal/60">W-L</div>
                    <div className="font-semibold text-charcoal">
                      {player.wins || 0}-{player.losses || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">ERA</div>
                    <div className="font-semibold text-charcoal">
                      {player.era?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">K</div>
                    <div className="font-semibold text-charcoal">
                      {player.strikeouts_pitched || 0}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-charcoal/60">AVG</div>
                    <div className="font-semibold text-charcoal">
                      {player.batting_avg?.toFixed(3) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">HR</div>
                    <div className="font-semibold text-charcoal">
                      {player.home_runs || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">RBI</div>
                    <div className="font-semibold text-charcoal">
                      {player.rbi || 0}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Position Selection */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-charcoal mb-3">
            Assign to:
          </label>

          <div className="space-y-2">
            {Object.keys(eligibleSlots).length === 0 ? (
              <div className="text-center py-8 text-charcoal/50 font-serif">
                No available positions for this player
              </div>
            ) : (
              Object.entries(eligibleSlots).map(([position, slots]) =>
                slots.map((slot) => {
                  const isSelected =
                    selectedSlot?.position === position &&
                    selectedSlot?.slotNumber === slot.slotNumber

                  return (
                    <label
                      key={`${position}-${slot.slotNumber}`}
                      className={`flex items-center p-3 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-burgundy/10 border-2 border-burgundy'
                          : 'bg-charcoal/5 border-2 border-transparent hover:bg-charcoal/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="position"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedSlot({
                            position: position as PositionCode,
                            slotNumber: slot.slotNumber,
                          })
                        }
                        className="mr-3"
                      />
                      <span className="font-serif text-charcoal">
                        {POSITION_NAMES[position as PositionCode]}
                        {slots.length > 1 ? ` ${slot.slotNumber}` : ''}
                        <span className="text-charcoal/50"> (Empty)</span>
                      </span>
                    </label>
                  )
                })
              )
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-cream border-t border-charcoal/10 p-6 flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSlot}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Draft
          </button>
        </div>
      </div>
    </div>
  )
}

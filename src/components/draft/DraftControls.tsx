/**
 * Draft Controls Component
 * Shows current pick info and draft controls
 */

import type { DraftSession, DraftTeam } from '../../types/draft.types'
import { TOTAL_ROUNDS } from '../../types/draft.types'

interface Props {
  session: DraftSession
  currentTeam: DraftTeam | null
  nextTeam: DraftTeam | null
  onPause: () => void
  onResume: () => void
  onSave: () => void
}

export default function DraftControls({
  session,
  currentTeam,
  nextTeam,
  onPause,
  onResume,
  onSave,
}: Props) {
  const currentPick = session.picks[session.currentPick - 1]
  const totalPicks = session.numTeams * TOTAL_ROUNDS

  if (!currentPick || !currentTeam) {
    return null
  }

  return (
    <div className="bg-charcoal text-cream py-4 px-6 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        {/* Draft Progress */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-cream-dark uppercase tracking-wide">Round</div>
            <div className="text-2xl font-display font-bold text-gold">
              {currentPick.round} <span className="text-cream-dark">of {TOTAL_ROUNDS}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-cream-dark"></div>

          <div>
            <div className="text-xs text-cream-dark uppercase tracking-wide">Pick</div>
            <div className="text-2xl font-display font-bold text-gold">
              {session.currentPick} <span className="text-cream-dark">of {totalPicks}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-cream-dark"></div>

          <div>
            <div className="text-xs text-cream-dark uppercase tracking-wide">Pick in Round</div>
            <div className="text-2xl font-display font-bold text-gold">
              {currentPick.pickInRound} <span className="text-cream-dark">of {session.numTeams}</span>
            </div>
          </div>
        </div>

        {/* Current Pick Info */}
        <div className="text-center">
          <div className="text-xs text-cream-dark uppercase tracking-wide mb-1">On the Clock</div>
          <div className="text-xl font-display font-bold text-gold">
            {currentTeam.name}
            <span className="ml-2 text-sm">
              ({currentTeam.control === 'human' ? 'Human' : 'CPU'})
            </span>
          </div>
          {nextTeam && (
            <div className="text-xs text-cream-dark mt-1">
              Next: {nextTeam.name} ({nextTeam.control === 'human' ? 'Human' : 'CPU'})
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {session.status === 'in_progress' ? (
            <button onClick={onPause} className="btn-secondary">
              ⏸ Pause
            </button>
          ) : session.status === 'paused' ? (
            <button onClick={onResume} className="btn-primary">
              ▶ Resume
            </button>
          ) : null}

          <button onClick={onSave} className="btn-secondary">
            💾 Save
          </button>
        </div>
      </div>
    </div>
  )
}

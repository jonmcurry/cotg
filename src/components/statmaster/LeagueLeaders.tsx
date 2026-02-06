/**
 * League Leaders Component
 *
 * Displays top players by various statistical categories
 * Part of the StatMaster view
 */

import { useMemo } from 'react'
import type { PlayerSeason } from '../../types/player'
import {
  calculateLeagueLeaders,
  formatStatValue,
  type LeaderEntry,
  type BattingStatCategory,
  type PitchingStatCategory,
} from '../../utils/leagueLeaders'

interface Props {
  players: PlayerSeason[]
  onPlayerClick?: (player: PlayerSeason) => void
}

interface LeaderCardProps {
  title: string
  leaders: LeaderEntry[]
  category: BattingStatCategory | PitchingStatCategory
  onPlayerClick?: (player: PlayerSeason) => void
}

function LeaderCard({ title, leaders, category, onPlayerClick }: LeaderCardProps) {
  if (leaders.length === 0) {
    return (
      <div className="bg-white border border-charcoal/10 rounded-sm p-4">
        <h4 className="font-display font-bold text-sm uppercase tracking-wide text-charcoal/70 mb-2">
          {title}
        </h4>
        <p className="text-sm text-charcoal/40 italic">No qualifying players</p>
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
            key={entry.player.id}
            className={`
              flex items-center justify-between text-sm
              ${idx === 0 ? 'font-semibold' : ''}
              ${onPlayerClick ? 'cursor-pointer hover:text-burgundy' : ''}
            `}
            onClick={() => onPlayerClick?.(entry.player)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`
                w-5 text-center font-display text-xs
                ${idx === 0 ? 'text-gold' : 'text-charcoal/40'}
              `}>
                {entry.rank}
              </span>
              <span className="truncate">
                {entry.player.display_name || `${entry.player.first_name} ${entry.player.last_name}`}
              </span>
              <span className="text-xs text-charcoal/40">
                ({entry.player.year})
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

export default function LeagueLeaders({ players, onPlayerClick }: Props) {
  const leaders = useMemo(() => calculateLeagueLeaders(players, 5), [players])

  return (
    <div className="space-y-6">
      {/* Batting Leaders */}
      <div>
        <h3 className="font-display font-bold text-lg uppercase tracking-widest text-burgundy mb-4 border-b border-burgundy/20 pb-2">
          Batting Leaders
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <LeaderCard
            title="Batting Average"
            leaders={leaders.batting.avg}
            category="avg"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="Home Runs"
            leaders={leaders.batting.hr}
            category="hr"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="RBI"
            leaders={leaders.batting.rbi}
            category="rbi"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="Hits"
            leaders={leaders.batting.hits}
            category="hits"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="Stolen Bases"
            leaders={leaders.batting.sb}
            category="sb"
            onPlayerClick={onPlayerClick}
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
            leaders={leaders.pitching.era}
            category="era"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="Wins"
            leaders={leaders.pitching.wins}
            category="wins"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="Strikeouts"
            leaders={leaders.pitching.strikeouts}
            category="strikeouts"
            onPlayerClick={onPlayerClick}
          />
          <LeaderCard
            title="Saves"
            leaders={leaders.pitching.saves}
            category="saves"
            onPlayerClick={onPlayerClick}
          />
        </div>
      </div>
    </div>
  )
}

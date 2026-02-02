/**
 * League Setup Component
 * Create a new league with configuration settings before entering draft
 */

import { useState } from 'react'
import type { LeagueConfig, PlayoffFormat } from '../../types/league.types'

interface Props {
  onCreateLeague: (config: LeagueConfig) => void
  onBack: () => void
}

export default function LeagueSetup({ onCreateLeague, onBack }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [numTeams, setNumTeams] = useState(8)
  const [gamesPerSeason, setGamesPerSeason] = useState(162)
  const [playoffFormat, setPlayoffFormat] = useState<PlayoffFormat>('none')
  const [useDH, setUseDH] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('League name is required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      onCreateLeague({
        name: name.trim(),
        description: description.trim() || undefined,
        numTeams,
        gamesPerSeason,
        playoffFormat,
        useDH,
        useApbaRules: true,
        injuryEnabled: false,
        weatherEffects: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[LeagueSetup] Error creating league:', err)
      setError(message)
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="py-6 border-b border-charcoal/10">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-charcoal text-gold flex items-center justify-center font-display font-bold text-xl rounded-sm">
              CG
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal tracking-tight">
              Century of the Game
            </h1>
          </div>
          <button
            onClick={onBack}
            className="text-sm font-semibold uppercase tracking-widest text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-charcoal mb-2 tracking-tight">
            Create a League
          </h2>
          <p className="font-serif italic text-charcoal/60 mb-10">
            Configure your league settings before heading to the draft.
          </p>

          <div className="space-y-8">
            {/* League Name */}
            <div>
              <label className="block text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">
                League Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. The Sandlot League"
                className="w-full px-4 py-3 border-2 border-charcoal/15 rounded-sm bg-white font-serif text-charcoal text-lg focus:border-burgundy focus:outline-none transition-colors"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">
                Description
                <span className="text-charcoal/30 ml-2 normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="A brief description of your league"
                className="w-full px-4 py-3 border-2 border-charcoal/15 rounded-sm bg-white font-serif text-charcoal focus:border-burgundy focus:outline-none transition-colors"
                maxLength={200}
              />
            </div>

            {/* Number of Teams */}
            <div>
              <label className="block text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">
                Number of Teams
              </label>
              <div className="flex gap-2">
                {[4, 6, 8, 10, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumTeams(n)}
                    className={`flex-1 py-3 font-display font-bold text-lg border-2 rounded-sm transition-all ${
                      numTeams === n
                        ? 'bg-charcoal text-gold border-charcoal'
                        : 'bg-white text-charcoal/50 border-charcoal/10 hover:border-charcoal/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Games per Season */}
            <div>
              <label className="block text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">
                Games per Season
              </label>
              <div className="flex gap-2">
                {[
                  { value: 81, label: '81 (Half)' },
                  { value: 120, label: '120' },
                  { value: 162, label: '162 (Full)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGamesPerSeason(opt.value)}
                    className={`flex-1 py-3 font-display font-bold border-2 rounded-sm transition-all ${
                      gamesPerSeason === opt.value
                        ? 'bg-charcoal text-gold border-charcoal'
                        : 'bg-white text-charcoal/50 border-charcoal/10 hover:border-charcoal/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Playoff Format */}
            <div>
              <label className="block text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">
                Playoff Format
              </label>
              <select
                value={playoffFormat}
                onChange={e => setPlayoffFormat(e.target.value as PlayoffFormat)}
                className="w-full px-4 py-3 border-2 border-charcoal/15 rounded-sm bg-white font-serif text-charcoal focus:border-burgundy focus:outline-none transition-colors"
              >
                <option value="none">No Playoffs (Regular Season Only)</option>
                <option value="wild_card">Wild Card (Top 4 Teams)</option>
                <option value="division">Division Series (Top 6 Teams)</option>
                <option value="expanded">Expanded (Top 8 Teams)</option>
              </select>
            </div>

            {/* DH Rule */}
            <div className="flex items-center justify-between p-4 bg-white border-2 border-charcoal/10 rounded-sm">
              <div>
                <div className="font-display font-bold text-charcoal">Designated Hitter</div>
                <div className="text-sm font-serif text-charcoal/50 italic">
                  Pitchers bat when DH is off
                </div>
              </div>
              <button
                onClick={() => setUseDH(!useDH)}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  useDH ? 'bg-burgundy' : 'bg-charcoal/20'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${
                    useDH ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-sm">
                <p className="text-red-700 font-serif">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={creating || !name.trim()}
              className={`w-full py-4 font-display font-bold text-lg uppercase tracking-widest border-2 rounded-sm transition-all ${
                creating || !name.trim()
                  ? 'bg-charcoal/10 text-charcoal/30 border-charcoal/10 cursor-not-allowed'
                  : 'bg-burgundy text-white border-burgundy hover:bg-burgundy/90 shadow-md'
              }`}
            >
              {creating ? 'Creating League...' : 'Create League & Configure Draft'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

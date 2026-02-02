/**
 * Draft Configuration Screen
 * Allows users to set up draft parameters and team configuration
 */

import { useState } from 'react'
import type { DraftConfig, TeamControl } from '../../types/draft.types'

interface Props {
  onStartDraft: (config: DraftConfig) => void
  leagueNumTeams?: number
  leagueName?: string
}

export default function DraftConfig({ onStartDraft, leagueNumTeams, leagueName }: Props) {
  const initialTeamCount = leagueNumTeams || 8
  const [numTeams, setNumTeams] = useState(initialTeamCount)

  const defaultTeamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu']
  const [teams, setTeams] = useState<Array<{ name: string; control: TeamControl }>>(() =>
    Array.from({ length: initialTeamCount }, (_, i) => ({
      name: `Team ${defaultTeamNames[i] || String.fromCharCode(65 + i)}`,
      control: i === 0 ? 'human' as TeamControl : 'cpu' as TeamControl,
    }))
  )
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([])
  const [seasonMode, setSeasonMode] = useState<'all' | 'era' | 'specific'>('specific')
  const [eraSelection, setEraSelection] = useState('modern')
  const [specificYear, setSpecificYear] = useState('2024')
  const [randomizeDraftOrder, setRandomizeDraftOrder] = useState(true)

  // Update team count
  const handleTeamCountChange = (count: number) => {
    setNumTeams(count)

    const newTeams = [...teams]
    if (count > teams.length) {
      // Add more teams
      for (let i = teams.length; i < count; i++) {
        newTeams.push({
          name: `Team ${String.fromCharCode(65 + i)}`,
          control: 'cpu',
        })
      }
    } else {
      // Remove teams
      newTeams.length = count
    }
    setTeams(newTeams)
  }

  // Update team name
  const handleTeamNameChange = (index: number, name: string) => {
    const newTeams = [...teams]
    newTeams[index].name = name
    setTeams(newTeams)
  }

  // Update team control
  const handleTeamControlChange = (index: number, control: TeamControl) => {
    const newTeams = [...teams]
    newTeams[index].control = control
    setTeams(newTeams)
  }

  // Add specific year
  const handleAddYear = () => {
    const year = parseInt(specificYear)
    if (year >= 1901 && year <= 2025 && !selectedSeasons.includes(year)) {
      setSelectedSeasons([...selectedSeasons, year].sort((a, b) => a - b))
      setSpecificYear('')
    }
  }

  // Remove year
  const handleRemoveYear = (year: number) => {
    setSelectedSeasons(selectedSeasons.filter(y => y !== year))
  }

  // Start draft
  const handleStartDraft = () => {
    let finalSeasons = selectedSeasons

    // Determine seasons based on mode
    if (seasonMode === 'all') {
      finalSeasons = Array.from({ length: 125 }, (_, i) => 1901 + i) // 1901-2025
    } else if (seasonMode === 'era') {
      const eras: Record<string, number[]> = {
        'deadball': Array.from({ length: 19 }, (_, i) => 1901 + i), // 1901-1919
        'lively': Array.from({ length: 22 }, (_, i) => 1920 + i), // 1920-1941
        'integration': Array.from({ length: 19 }, (_, i) => 1942 + i), // 1942-1960
        'expansion': Array.from({ length: 18 }, (_, i) => 1961 + i), // 1961-1978
        'free-agency': Array.from({ length: 14 }, (_, i) => 1979 + i), // 1979-1992
        'steroids': Array.from({ length: 13 }, (_, i) => 1993 + i), // 1993-2005
        'modern': Array.from({ length: 20 }, (_, i) => 2006 + i), // 2006-2025
      }
      finalSeasons = eras[eraSelection] || []
    }

    if (finalSeasons.length === 0) {
      alert('Please select at least one season')
      return
    }

    const config: DraftConfig = {
      numTeams,
      teams: teams.slice(0, numTeams),
      selectedSeasons: finalSeasons,
      randomizeDraftOrder,
    }

    onStartDraft(config)
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-burgundy mb-2">
              Draft Configuration
            </h1>
            <p className="text-charcoal/70 font-serif">
              {leagueName
                ? `Configure the draft for ${leagueName}`
                : 'Set up your fantasy draft parameters'}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Draft Settings */}
          <section className="card">
            <h2 className="text-2xl font-display text-burgundy mb-6">Draft Settings</h2>

            {/* Number of Teams */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-charcoal mb-2">
                Number of Teams
              </label>
              <select
                value={numTeams}
                onChange={(e) => handleTeamCountChange(parseInt(e.target.value))}
                className="input-field w-48"
              >
                {Array.from({ length: 29 }, (_, i) => i + 2).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Season Selection */}
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-3">
                Season Selection
              </label>

              <div className="space-y-3">
                {/* All Years */}
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={seasonMode === 'all'}
                    onChange={() => setSeasonMode('all')}
                    className="mr-3"
                  />
                  <span className="font-serif">All Years (1901-2025)</span>
                </label>

                {/* Era */}
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={seasonMode === 'era'}
                    onChange={() => setSeasonMode('era')}
                    className="mr-3"
                  />
                  <span className="font-serif mr-3">Era:</span>
                  <select
                    value={eraSelection}
                    onChange={(e) => setEraSelection(e.target.value)}
                    disabled={seasonMode !== 'era'}
                    className="input-field w-64"
                  >
                    <option value="deadball">Dead Ball Era (1901-1919)</option>
                    <option value="lively">Lively Ball Era (1920-1941)</option>
                    <option value="integration">Integration Era (1942-1960)</option>
                    <option value="expansion">Expansion Era (1961-1978)</option>
                    <option value="free-agency">Free Agency Era (1979-1992)</option>
                    <option value="steroids">Steroids Era (1993-2005)</option>
                    <option value="modern">Modern Era (2006-2025)</option>
                  </select>
                </label>

                {/* Specific Years */}
                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="radio"
                      checked={seasonMode === 'specific'}
                      onChange={() => setSeasonMode('specific')}
                      className="mr-3"
                    />
                    <span className="font-serif">Specific Years:</span>
                  </label>

                  {seasonMode === 'specific' && (
                    <div className="ml-8 space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1901"
                          max="2025"
                          value={specificYear}
                          onChange={(e) => setSpecificYear(e.target.value)}
                          placeholder="YYYY"
                          className="input-field w-32"
                        />
                        <button
                          onClick={handleAddYear}
                          className="btn-secondary text-sm"
                          disabled={!specificYear}
                        >
                          + Add Year
                        </button>
                      </div>

                      {selectedSeasons.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSeasons.map(year => (
                            <span
                              key={year}
                              className="inline-flex items-center gap-2 bg-burgundy/10 text-burgundy px-3 py-1 rounded-full text-sm font-semibold"
                            >
                              {year}
                              <button
                                onClick={() => handleRemoveYear(year)}
                                className="text-burgundy/60 hover:text-burgundy"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Team Setup */}
          <section className="card">
            <h2 className="text-2xl font-display text-burgundy mb-6">Team Setup</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-charcoal/10">
                    <th className="text-left py-3 px-4 font-display text-charcoal">#</th>
                    <th className="text-left py-3 px-4 font-display text-charcoal">Team Name</th>
                    <th className="text-left py-3 px-4 font-display text-charcoal">Control</th>
                    <th className="text-left py-3 px-4 font-display text-charcoal">Draft Position</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.slice(0, numTeams).map((team, index) => (
                    <tr key={index} className="border-b border-charcoal/5">
                      <td className="py-3 px-4 font-semibold text-charcoal/60">{index + 1}</td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => handleTeamNameChange(index, e.target.value)}
                          className="input-field w-full"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={team.control}
                          onChange={(e) => handleTeamControlChange(index, e.target.value as TeamControl)}
                          className="input-field"
                        >
                          <option value="human">Human</option>
                          <option value="cpu">CPU</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center text-charcoal font-semibold">
                        {randomizeDraftOrder ? 'Random' : index + 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={randomizeDraftOrder}
                  onChange={(e) => setRandomizeDraftOrder(e.target.checked)}
                  className="mr-3"
                />
                <span className="font-serif text-charcoal">Randomize Draft Order</span>
              </label>
            </div>
          </section>

          {/* Start Draft Button */}
          <div className="flex justify-center">
            <button
              onClick={handleStartDraft}
              className="btn-primary text-lg px-12 py-4"
            >
              Start Draft ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

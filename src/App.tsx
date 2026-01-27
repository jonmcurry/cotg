/**
 * Main Application Component with Draft System
 * Orchestrates draft configuration and draft board screens
 */

import { useState } from 'react'
import { useDraftStore } from './stores/draftStore'
import DraftConfig from './components/draft/DraftConfig'
import DraftBoard from './components/draft/DraftBoard'
import type { DraftConfig as DraftConfigType } from './types/draft.types'

type Screen = 'home' | 'config' | 'draft'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { session, createSession, startDraft, resetSession } = useDraftStore()

  const handleStartDraft = async (config: DraftConfigType) => {
    await createSession(config)
    setScreen('draft')
    // Give a moment for state to update, then start the draft
    setTimeout(() => {
      startDraft()
    }, 100)
  }

  const handleLoadDraft = () => {
    // TODO: Implement load draft from Supabase
    alert('Load draft functionality coming soon!')
  }

  const handleExitDraft = () => {
    resetSession()
    setScreen('home')
  }

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-charcoal text-cream py-8 shadow-lg">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-display font-bold text-gold mb-2">
              Century of the Game
            </h1>
            <p className="text-cream-dark text-lg font-serif italic">
              Every era. Every legend. Your lineup.
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="card text-center mb-8">
              <h2 className="text-3xl font-display text-burgundy mb-4">
                Draft Your Dream Team
              </h2>
              <p className="text-lg font-serif text-charcoal/70 mb-6">
                Build your fantasy roster from over 125 years of baseball history.
                Choose from 63,000+ player-seasons spanning 1901-2025.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setScreen('config')}
                  className="btn-primary text-lg px-8 py-3"
                >
                  New Draft
                </button>
                <button
                  onClick={handleLoadDraft}
                  className="btn-secondary text-lg px-8 py-3"
                >
                  Load Draft
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card text-center">
                <h3 className="text-xl font-display text-burgundy mb-2">
                  125 Years of History
                </h3>
                <p className="text-sm font-serif text-charcoal/70">
                  Draft from the Dead Ball Era through the Modern Age
                </p>
              </div>

              <div className="card text-center">
                <h3 className="text-xl font-display text-burgundy mb-2">
                  Intelligent CPU
                </h3>
                <p className="text-sm font-serif text-charcoal/70">
                  Advanced AI drafts based on WAR and positional need
                </p>
              </div>

              <div className="card text-center">
                <h3 className="text-xl font-display text-burgundy mb-2">
                  Bill James Metrics
                </h3>
                <p className="text-sm font-serif text-charcoal/70">
                  Complete statistical analysis for every player
                </p>
              </div>
            </div>

            {/* Phase Status */}
            <div className="card mt-8">
              <h3 className="text-xl font-display text-burgundy mb-4">Development Status</h3>
              <div className="space-y-2 font-sans text-sm">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2 text-lg">✓</span>
                  <span className="text-charcoal">Phase 1.1-1.6: Data Pipeline Complete</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2 text-lg">✓</span>
                  <span className="text-charcoal">63,084 APBA Cards Generated</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2 text-lg">→</span>
                  <span className="text-charcoal font-semibold">Phase 2: Draft System (In Progress)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-charcoal/30 mr-2 text-lg">○</span>
                  <span className="text-charcoal/50">Phase 3: Game Simulation (Coming Soon)</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-charcoal text-cream-dark py-6 mt-12">
          <div className="container mx-auto px-4 text-center font-serif text-sm">
            <p>&copy; 2026 Century of the Game. A tribute to baseball history.</p>
          </div>
        </footer>
      </div>
    )
  }

  // Configuration Screen
  if (screen === 'config') {
    return (
      <DraftConfig
        onStartDraft={handleStartDraft}
        onLoadDraft={handleLoadDraft}
      />
    )
  }

  // Draft Screen
  if (screen === 'draft' && session) {
    return <DraftBoard onExit={handleExitDraft} />
  }

  // Fallback
  return null
}

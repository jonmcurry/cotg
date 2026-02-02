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
      <div className="min-h-screen bg-cream flex flex-col">
        {/* Minimalist Header */}
        <header className="bg-charcoal text-cream py-4">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <span className="text-sm font-sans uppercase tracking-[0.3em] text-gold/80">
              Est. 1901
            </span>
            <span className="text-sm font-sans uppercase tracking-[0.3em] text-cream-dark">
              APBA Baseball
            </span>
          </div>
        </header>

        <main className="flex-1">
          {/* Hero Section - massive centered typography */}
          <section className="bg-charcoal text-cream py-20 md:py-28">
            <div className="container mx-auto px-4 text-center max-w-4xl">
              <p className="text-sm font-sans uppercase tracking-[0.4em] text-gold mb-6">
                Every Era. Every Legend. Your Lineup.
              </p>
              <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-9xl text-cream leading-none mb-2">
                CENTURY
              </h1>
              <p className="font-serif italic text-2xl md:text-3xl text-gold/80 mb-1">
                of the
              </p>
              <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-9xl text-cream leading-none mb-10">
                GAME
              </h1>
              <p className="text-lg font-serif text-cream-dark/80 max-w-xl mx-auto mb-10">
                Build your fantasy roster from over 125 years of baseball history.
                63,000+ player-seasons spanning 1901&ndash;2025.
              </p>
              <div className="flex gap-5 justify-center">
                <button
                  onClick={() => setScreen('config')}
                  className="btn-primary text-base px-10 py-4"
                >
                  New Draft
                </button>
                <button
                  onClick={handleLoadDraft}
                  className="btn-secondary text-base px-10 py-4 border-cream/20 text-cream hover:bg-cream/10 hover:border-cream/40"
                >
                  Load Draft
                </button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="card text-center hover:shadow-lift transition-shadow duration-300">
                  <div className="text-xs font-sans uppercase tracking-[0.3em] text-gold mb-3">Heritage</div>
                  <h3 className="text-xl font-display text-burgundy mb-2">
                    125 Years of History
                  </h3>
                  <p className="text-sm font-serif text-charcoal/60">
                    Draft from the Dead Ball Era through the Modern Age
                  </p>
                </div>

                <div className="card text-center hover:shadow-lift transition-shadow duration-300">
                  <div className="text-xs font-sans uppercase tracking-[0.3em] text-gold mb-3">Strategy</div>
                  <h3 className="text-xl font-display text-burgundy mb-2">
                    Intelligent CPU
                  </h3>
                  <p className="text-sm font-serif text-charcoal/60">
                    Advanced AI drafts the best player available by rating and need
                  </p>
                </div>

                <div className="card text-center hover:shadow-lift transition-shadow duration-300">
                  <div className="text-xs font-sans uppercase tracking-[0.3em] text-gold mb-3">Analytics</div>
                  <h3 className="text-xl font-display text-burgundy mb-2">
                    Bill James Metrics
                  </h3>
                  <p className="text-sm font-serif text-charcoal/60">
                    Complete statistical analysis for every player
                  </p>
                </div>
              </div>

              {/* Phase Status */}
              <div className="card mt-10">
                <h3 className="text-lg font-display text-burgundy mb-4">Development Status</h3>
                <div className="space-y-2.5 font-sans text-sm">
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-green-700/15 text-green-700 flex items-center justify-center text-xs mr-3">&#10003;</span>
                    <span className="text-charcoal/80">Phase 1.1-1.6: Data Pipeline Complete</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-green-700/15 text-green-700 flex items-center justify-center text-xs mr-3">&#10003;</span>
                    <span className="text-charcoal/80">63,084 APBA Cards Generated</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-burgundy/15 text-burgundy flex items-center justify-center text-xs mr-3">&rarr;</span>
                    <span className="text-charcoal font-semibold">Phase 2: Draft System (In Progress)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-charcoal/5 text-charcoal/30 flex items-center justify-center text-xs mr-3">&#9675;</span>
                    <span className="text-charcoal/40">Phase 3: Game Simulation (Coming Soon)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer with leather accent */}
        <footer className="border-t border-leather/20 bg-charcoal text-cream-dark py-6">
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

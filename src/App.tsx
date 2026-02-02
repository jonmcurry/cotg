/**
 * Main Application Component with Draft System
 * Orchestrates draft configuration and draft board screens
 */

import { useState } from 'react'
import { useDraftStore } from './stores/draftStore'
import DraftConfig from './components/draft/DraftConfig'
import DraftBoard from './components/draft/DraftBoard'
import Clubhouse from './components/clubhouse/Clubhouse'
import StatMaster from './components/statmaster/StatMaster'
import type { DraftConfig as DraftConfigType } from './types/draft.types'

type Screen = 'home' | 'config' | 'draft' | 'clubhouse' | 'statmaster'

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

  const handleDraftComplete = () => {
    setScreen('clubhouse')
  }

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        {/* Navigation - Minimalist & Elegant */}
        <header className="py-6 border-b border-charcoal/10 relative z-10">
          <div className="container mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-charcoal text-gold flex items-center justify-center font-display font-bold text-xl rounded-sm">
                CG
              </div>
              <h1 className="text-2xl font-display font-bold text-charcoal tracking-tight">
                Century of the Game
              </h1>
            </div>
            <nav className="hidden md:flex gap-8 font-sans text-sm font-semibold tracking-widest uppercase text-charcoal/70">
              <button className="hover:text-burgundy transition-colors">History</button>
              <button className="hover:text-burgundy transition-colors">Rules</button>
              <button className="hover:text-burgundy transition-colors">Community</button>
            </nav>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-6 py-16 lg:py-24 relative">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            {/* Hero Section */}
            <h2 className="text-xl md:text-2xl font-serif italic text-burgundy mb-6">
              1901 — 2025
            </h2>
            <h1 className="text-6xl md:text-8xl font-display font-bold text-charcoal mb-8 leading-[0.9] tracking-tight">
              Every Era.<br />
              Every Legend.<br />
              <span className="text-gold selection:text-charcoal selection:bg-gold">Your Lineup.</span>
            </h1>

            <p className="text-xl font-serif text-charcoal/80 mb-12 max-w-2xl mx-auto leading-relaxed">
              Build your fantasy roster from 125 years of baseball history.
              Draft from over 63,000 player-seasons using advanced sabotage metrics
              and intelligent AI opponents.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-24">
              <button
                onClick={() => setScreen('config')}
                className="btn-primary text-base px-10 py-4 min-w-[200px]"
              >
                Start New Draft
              </button>
              <button
                onClick={handleLoadDraft}
                className="btn-secondary text-base px-10 py-4 min-w-[200px]"
              >
                Load Saved Draft
              </button>
            </div>

            {/* Features Grid - Clean, Typography Focus */}
            <div className="grid md:grid-cols-3 gap-12 border-t border-charcoal/10 pt-16">
              <div className="text-left group">
                <div className="text-4xl font-display text-charcoal/20 mb-4 group-hover:text-burgundy/30 transition-colors">01</div>
                <h3 className="text-xl font-display font-bold text-charcoal mb-2">Deep History</h3>
                <p className="font-serif text-charcoal/70 leading-relaxed">
                  Every player from the Dead Ball Era through the Modern Age at your fingertips.
                </p>
              </div>

              <div className="text-left group">
                <div className="text-4xl font-display text-charcoal/20 mb-4 group-hover:text-burgundy/30 transition-colors">02</div>
                <h3 className="text-xl font-display font-bold text-charcoal mb-2">Smart Rivals</h3>
                <p className="font-serif text-charcoal/70 leading-relaxed">
                  Compete against AI that drafts based on positional needs and advanced WAR metrics.
                </p>
              </div>

              <div className="text-left group">
                <div className="text-4xl font-display text-charcoal/20 mb-4 group-hover:text-burgundy/30 transition-colors">03</div>
                <h3 className="text-xl font-display font-bold text-charcoal mb-2">Sabermetrics</h3>
                <p className="font-serif text-charcoal/70 leading-relaxed">
                  Powered by Bill James' projections and accurate historical simulation data.
                </p>
              </div>
            </div>

            {/* Development Status - Subtle */}
            <div className="mt-24 inline-flex items-center gap-3 px-6 py-3 bg-charcoal/5 rounded-full border border-charcoal/5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-sans font-semibold tracking-wider uppercase text-charcoal/60">
                System Active • Database Loaded
              </span>
            </div>
          </div>
        </main>

        <footer className="py-8 text-center border-t border-charcoal/10">
          <p className="font-serif text-sm text-charcoal/50 italic">
            &copy; 2026 Century of the Game. A tribute to the national pastime.
          </p>
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
    return (
      <DraftBoard
        onExit={handleExitDraft}
        onComplete={handleDraftComplete}
      />
    )
  }

  // Clubhouse Screen
  if (screen === 'clubhouse' && session) {
    return (
      <Clubhouse
        session={session}
        onExit={handleExitDraft}
        onStartSeason={() => setScreen('statmaster')}
      />
    )
  }

  // StatMaster Screen
  if (screen === 'statmaster' && session) {
    return <StatMaster session={session} onExit={() => setScreen('clubhouse')} />
  }

  // Fallback
  return null
}

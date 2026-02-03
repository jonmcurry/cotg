/**
 * Main Application Component
 * Orchestrates the full workflow: League -> Draft Config -> Draft -> Clubhouse -> StatMaster
 */

import { useState } from 'react'
import { useDraftStore } from './stores/draftStore'
import { useLeagueStore } from './stores/leagueStore'
import LeagueSetup from './components/league/LeagueSetup'
import LeagueList from './components/league/LeagueList'
import DraftConfig from './components/draft/DraftConfig'
import DraftBoard from './components/draft/DraftBoard'
import Clubhouse from './components/clubhouse/Clubhouse'
import StatMaster from './components/statmaster/StatMaster'
import type { DraftConfig as DraftConfigType } from './types/draft.types'
import type { League, LeagueConfig } from './types/league.types'

type Screen = 'home' | 'league-setup' | 'league-list' | 'config' | 'draft' | 'clubhouse' | 'statmaster'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { session, createSession, startDraft, resetSession } = useDraftStore()
  const { currentLeague, createLeague, setCurrentLeague, loadLeague, linkDraftSession, updateLeagueStatus } = useLeagueStore()

  const handleCreateLeague = async (config: LeagueConfig) => {
    const seasonYear = new Date().getFullYear()
    const league = await createLeague(config, seasonYear)
    console.log('[App] League created:', league.id, league.name)
    setScreen('config')
  }

  const handleSelectLeague = async (league: League) => {
    await loadLeague(league.id)

    // Route to appropriate screen based on league status
    switch (league.status) {
      case 'draft':
        if (league.draftSessionId) {
          // If we have a matching session in local storage, use it
          if (session?.id === league.draftSessionId) {
            if (session.status === 'completed' || session.status === 'clubhouse') {
              setScreen('clubhouse')
            } else {
              setScreen('draft')
            }
          } else {
            // TODO: Implement full load draft from Supabase when loadSession is ready
            alert('Draft session not found in local storage. Load from database is not yet implemented.')
            setScreen('config')
          }
        } else {
          setScreen('config')
        }
        break
      case 'in_season':
      case 'playoffs':
        if (session) {
          setScreen('statmaster')
        } else {
          alert('Session data not found in local storage. Load from database is not yet implemented.')
          setScreen('config')
        }
        break
      case 'completed':
        if (session) {
          setScreen('statmaster')
        } else {
          alert('Session data not found in local storage. Load from database is not yet implemented.')
          setScreen('home')
        }
        break
      default:
        setScreen('config')
    }
  }

  const handleStartDraft = async (config: DraftConfigType) => {
    await createSession(config)

    // Link draft session to current league
    const draftSession = useDraftStore.getState().session
    if (currentLeague && draftSession) {
      await linkDraftSession(currentLeague.id, draftSession.id)
    }

    setScreen('draft')
    // Wait a moment for UI to render, then start the draft
    // This ensures the draft board is mounted before CPU drafting begins
    setTimeout(async () => {
      await startDraft()
    }, 100)
  }

  const handleExitToHome = () => {
    resetSession()
    setCurrentLeague(null)
    setScreen('home')
  }

  const handleDraftComplete = () => {
    setScreen('clubhouse')
  }

  const handleStartSeason = async () => {
    if (currentLeague) {
      await updateLeagueStatus(currentLeague.id, 'in_season')
    }
    setScreen('statmaster')
  }

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        {/* Navigation */}
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
              Draft from over 63,000 player-seasons using advanced Sabermetrics
              and intelligent AI opponents.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-24">
              <button
                onClick={() => setScreen('league-setup')}
                className="btn-primary text-base px-10 py-4 min-w-[200px]"
              >
                Create New League
              </button>
              <button
                onClick={() => setScreen('league-list')}
                className="btn-secondary text-base px-10 py-4 min-w-[200px]"
              >
                Load League
              </button>
            </div>

            {/* Features Grid */}
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

            {/* Development Status */}
            <div className="mt-24 inline-flex items-center gap-3 px-6 py-3 bg-charcoal/5 rounded-full border border-charcoal/5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-sans font-semibold tracking-wider uppercase text-charcoal/60">
                System Active -- Database Loaded
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

  // League Setup Screen
  if (screen === 'league-setup') {
    return (
      <LeagueSetup
        onCreateLeague={handleCreateLeague}
        onBack={() => setScreen('home')}
      />
    )
  }

  // League List Screen
  if (screen === 'league-list') {
    return (
      <LeagueList
        onSelectLeague={handleSelectLeague}
        onBack={() => setScreen('home')}
      />
    )
  }

  // Configuration Screen
  if (screen === 'config') {
    return (
      <DraftConfig
        onStartDraft={handleStartDraft}
        leagueNumTeams={currentLeague?.numTeams}
        leagueName={currentLeague?.name}
      />
    )
  }

  // Draft Screen
  if (screen === 'draft' && session) {
    return (
      <DraftBoard
        onExit={handleExitToHome}
        onComplete={handleDraftComplete}
      />
    )
  }

  // Clubhouse Screen
  if (screen === 'clubhouse' && session) {
    return (
      <Clubhouse
        session={session}
        onExit={handleExitToHome}
        onStartSeason={handleStartSeason}
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

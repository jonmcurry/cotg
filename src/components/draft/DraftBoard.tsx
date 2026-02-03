/**
 * Draft Board - Main Draft Screen
 * Orchestrates the entire draft interface
 * Implements SRD UI requirement 7.3
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDraftStore } from '../../stores/draftStore'
import TabbedPlayerPool from './TabbedPlayerPool'
import RosterView from './RosterView'
import PositionAssignmentModal from './PositionAssignmentModal'
import DraftControls from './DraftControls'
import PickHistory from './PickHistory'
import type { PlayerSeason } from '../../utils/cpuDraftLogic'
import { selectBestPlayer } from '../../utils/cpuDraftLogic'
import { transformPlayerSeasonData } from '../../utils/transformPlayerData'
import type { PositionCode } from '../../types/draft.types'

interface Props {
  onExit: () => void
  onComplete?: () => void
}

export default function DraftBoard({ onExit, onComplete }: Props) {

  const {
    session,
    getCurrentPickingTeam,
    getNextPickingTeam,
    makePick,
    pauseDraft,
    resumeDraft,
    saveSession,
  } = useDraftStore()

  const [players, setPlayers] = useState<PlayerSeason[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0, hasMore: true })
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSeason | null>(null)
  const [cpuThinking, setCpuThinking] = useState(false)
  const [lastCpuPick, setLastCpuPick] = useState<{
    teamName: string
    playerName: string
    position: string
    year: number
  } | null>(null)
  const lastCpuPickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Prevent concurrent player loading (race condition guard)
  const loadingInProgress = useRef(false)

  // Prevent concurrent draft operations (prevents duplicate pick database errors)
  const draftInProgress = useRef(false)

  // Prevent concurrent human pick submissions (double-click guard)
  const humanPickInProgress = useRef(false)

  const currentTeam = getCurrentPickingTeam()
  const nextTeam = getNextPickingTeam()

  // Create stable reference to selected seasons for useEffect dependency
  // Only changes when actual seasons change, not when picks are made
  const selectedSeasonsKey = useMemo(
    () => session?.selectedSeasons?.join(',') || '',
    [session?.selectedSeasons]
  )

  // Load players from Supabase
  useEffect(() => {
    async function loadPlayers() {
      if (!session) return

      // Prevent concurrent loads (race condition where session reference changes while loading)
      if (loadingInProgress.current) {
        return
      }

      loadingInProgress.current = true
      setLoading(true)
      setLoadingProgress({ loaded: 0, total: 0, hasMore: true })
      try {
        const { supabase } = await import('../../lib/supabaseClient')

        // First, get total count for progress indication
        const { count, error: countError } = await supabase
          .from('player_seasons')
          .select('id', { count: 'exact', head: true })
          .in('year', session.selectedSeasons)
          .or('at_bats.gte.200,innings_pitched_outs.gte.30')

        if (countError) {
          console.error('[Player Load] Error getting count:', countError)
          console.error('[Player Load] Error code:', countError.code)
          console.error('[Player Load] Error message:', countError.message)
          console.error('[Player Load] Error details:', countError.details)
        }

        const totalPlayers = count || 0

        if (totalPlayers === 0) {
          console.error('[Player Load] WARNING: totalPlayers is 0!')
          console.error('[Player Load] This will skip the loading loop and show "No players found" error')
          console.error('[Player Load] Debugging info:')
          console.error('  - session:', session)
          console.error('  - session.selectedSeasons:', session.selectedSeasons)
          console.error('  - countError:', countError)
        }
        setLoadingProgress({ loaded: 0, total: totalPlayers, hasMore: true })

        // Fetch all players using parallel batch loading (3 batches at a time)
        const allPlayers: any[] = []
        const batchSize = 1000
        const parallelBatches = 3
        let offset = 0

        while (offset < totalPlayers) {
          // Create array of batch promises (up to 3 at a time)
          const batchPromises = []
          for (let i = 0; i < parallelBatches && offset < totalPlayers; i++) {
            const currentOffset = offset

            batchPromises.push(
              supabase
                .from('player_seasons')
                .select(`
                  id,
                  player_id,
                  year,
                  team_id,
                  primary_position,
                  apba_rating,
                  war,
                  at_bats,
                  batting_avg,
                  hits,
                  home_runs,
                  rbi,
                  stolen_bases,
                  on_base_pct,
                  slugging_pct,
                  innings_pitched_outs,
                  wins,
                  losses,
                  era,
                  strikeouts_pitched,
                  saves,
                  shutouts,
                  whip,
                  players!inner (
                    display_name,
                    first_name,
                    last_name,
                    bats
                  )
                `)
                .in('year', session.selectedSeasons)
                .or('at_bats.gte.200,innings_pitched_outs.gte.30')
                .order('apba_rating', { ascending: false, nullsFirst: false })
                .range(currentOffset, currentOffset + batchSize - 1)
            )

            offset += batchSize
          }

          // Wait for all parallel batches to complete
          const results = await Promise.all(batchPromises)

          // Process results
          for (const result of results) {
            if (result.error) {
              console.error('[Player Load] CRITICAL ERROR loading players:', result.error)
              alert(`CRITICAL ERROR: Failed to load players from Supabase.\n\nError: ${result.error.message}\n\nCheck console for details.`)
              return
            }

            if (result.data && result.data.length > 0) {
              allPlayers.push(...result.data)
            }
          }

          // Update progress after parallel batches complete
          // Use actual received data length (allPlayers.length) not requested offset
          // Progress only updates after Promise.all completes, so no race condition between batches
          setLoadingProgress({
            loaded: allPlayers.length,
            total: totalPlayers,
            hasMore: allPlayers.length < totalPlayers
          })
        }

        if (allPlayers.length === 0) {
          console.error('[Player Load] CRITICAL ERROR - No players found for selected seasons:', session.selectedSeasons)
          alert(`CRITICAL ERROR: No players found for selected seasons: ${session.selectedSeasons.join(', ')}

TROUBLESHOOTING STEPS:
1. Try a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache and reload the page
3. Clear localStorage: Open browser console and run: localStorage.clear()
4. Check browser console for detailed error messages

If this persists, the database may be updating. Wait a few minutes and try again.`)
          return
        }

        // Transform data to typed PlayerSeason objects (shared utility)
        // Handles numeric coercion for at_bats/innings_pitched_outs and flattens player join data
        const transformedPlayers = allPlayers.map(transformPlayerSeasonData)

        setPlayers(transformedPlayers)
      } catch (err) {
        console.error('[Player Load] CRITICAL ERROR - Exception:', err)
        alert(`CRITICAL ERROR: Exception while loading players.\n\nError: ${err}\n\nCheck console for details.`)
      } finally {
        setLoading(false)
        loadingInProgress.current = false
      }
    }

    loadPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: We intentionally depend only on selectedSeasonsKey, not the entire session object
    // This prevents reloading all players after every pick (which would interrupt CPU draft)
    // The session object changes frequently (after each pick), but selectedSeasons rarely changes
  }, [selectedSeasonsKey])

  // CPU auto-draft logic
  // Uses draftInProgress ref + cleanup cancelled flag as concurrency guards.
  // The cancelled flag handles React 18 StrictMode double-execution: StrictMode
  // simulates unmount/remount, creating new refs. Without cleanup, two async IIFEs
  // would race and both call makePick for the same pick number (causing 409 duplicates).
  // cpuThinking state is in the dependency array so the effect re-triggers when a pick completes.
  useEffect(() => {
    let cancelled = false // StrictMode cleanup: set true on unmount to abort async work

    if (!session) return
    if (!currentTeam) return
    if (currentTeam.control !== 'cpu') return

    // Ref-based concurrency guard: prevents re-entrant calls within the same mount
    if (draftInProgress.current) return

    if (session.status !== 'in_progress') return

    // Wait for players to finish loading before checking if empty
    if (loading) return

    // Only show error if loading is complete and still no players
    if (players.length === 0) {
      console.error('[CPU Draft] CRITICAL ERROR - No players loaded! Cannot draft.')
      alert('CRITICAL ERROR: No players loaded for draft. Please check Supabase connection and player_seasons data.')
      return
    }

    // Set guards BEFORE starting async operation
    draftInProgress.current = true
    setCpuThinking(true)

      // Async IIFE - checks cancelled flag before side effects
      ; (async () => {
        try {
          // Check if this effect instance was cancelled (StrictMode unmount)
          if (cancelled) return

          // Build deduplication sets from completed picks
          // draftedPlayerIds: cross-season dedup by player_id (all seasons of a drafted player excluded)
          // draftedSeasonIds: exact-season dedup by playerSeasonId (fallback when player_id is null)
          const draftedPlayerIds = new Set<string>()
          const draftedSeasonIds = new Set<string>()

          session.picks.forEach(pick => {
            if (pick.playerSeasonId) {
              draftedSeasonIds.add(pick.playerSeasonId)
            }
            if (pick.playerId) {
              draftedPlayerIds.add(pick.playerId)
            } else if (pick.playerSeasonId) {
              const player = players.find(p => p.id === pick.playerSeasonId)
              if (player?.player_id) {
                draftedPlayerIds.add(player.player_id)
              }
            }
          })

          // Performance optimization: Filter undrafted players and pass a balanced pool
          // Players array is already sorted by apba_rating DESC from SQL query
          // Split into hitters and pitchers to guarantee both are represented in the pool
          // (pitchers can dominate raw APBA ratings, starving the CPU of hitter candidates)
          // Dual filter: exclude by player_id (cross-season) AND by season id (exact match fallback)
          const undraftedPlayers = players.filter(p =>
            !draftedPlayerIds.has(p.player_id) && !draftedSeasonIds.has(p.id)
          )
          const undraftedHitters = undraftedPlayers.filter(p => (p.at_bats || 0) >= 200)
          const undraftedPitchers = undraftedPlayers.filter(p => (p.innings_pitched_outs || 0) >= 90 && (p.at_bats || 0) < 200)
          const topUndrafted = [
            ...undraftedHitters.slice(0, 600),
            ...undraftedPitchers.slice(0, 400),
          ]

          // Check cancelled again before the expensive selectBestPlayer call
          if (cancelled) return

          const selection = selectBestPlayer(topUndrafted, currentTeam, draftedPlayerIds, session.currentRound)

          // Final cancelled check before the critical makePick database write
          if (cancelled) return

          if (selection) {
            const success = await makePick(selection.player.id, selection.player.player_id, selection.position, selection.slotNumber, selection.player.bats)

            if (!success) {
              // makePick failed (likely DB constraint violation) - pause to break infinite loop
              console.error('[CPU Draft] makePick failed for player:', selection.player.display_name, selection.player.id)
              if (!cancelled) {
                pauseDraft()
                alert('ERROR: CPU draft pick failed (possible duplicate player). Draft paused. Check console for details.')
              }
              return
            }

            // Show inline ticker for this pick (clears after 3 seconds)
            if (!cancelled) {
              if (lastCpuPickTimer.current) clearTimeout(lastCpuPickTimer.current)
              setLastCpuPick({
                teamName: currentTeam.name,
                playerName: selection.player.display_name || 'Unknown Player',
                position: selection.position,
                year: selection.player.year,
              })
              lastCpuPickTimer.current = setTimeout(() => setLastCpuPick(null), 3000)
            }
          } else {
            console.error('[CPU Draft] CRITICAL ERROR - CPU could not find a player to draft!', {
              playersAvailable: players.length,
              alreadyDrafted: draftedPlayerIds.size,
              teamRosterFilled: currentTeam.roster.filter(s => s.isFilled).length,
            })
            alert('CRITICAL ERROR: CPU could not find a player to draft. Check console for details.')
          }

        } catch (error) {
          console.error('[CPU Draft] ERROR during draft operation:', error)
          alert('ERROR during CPU draft. Check console for details.')
        } finally {
          // Only reset guards if this effect instance is still active (not cancelled by StrictMode)
          if (!cancelled) {
            draftInProgress.current = false
            setCpuThinking(false)
          }
        }
      })()

    // Cleanup: cancel this effect instance on unmount (critical for StrictMode double-execution)
    return () => {
      cancelled = true
      draftInProgress.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentPick, session?.status, currentTeam?.id, players.length, loading, makePick, cpuThinking])

  const handlePlayerSelect = useCallback((player: PlayerSeason) => {
    if (!currentTeam || currentTeam.control !== 'human') {
      return
    }

    setSelectedPlayer(player)
  }, [currentTeam])

  const handleConfirmPick = useCallback(
    async (position: PositionCode, slotNumber: number) => {
      if (!selectedPlayer) return
      if (humanPickInProgress.current) return
      humanPickInProgress.current = true

      try {
        await makePick(selectedPlayer.id, selectedPlayer.player_id, position, slotNumber, selectedPlayer.bats)
        setSelectedPlayer(null)
      } finally {
        humanPickInProgress.current = false
      }
    },
    [selectedPlayer, makePick]
  )

  // Build deduplication sets for UI (TabbedPlayerPool uses draftedPlayerIds)
  // draftedPlayerIds: cross-season dedup by player_id
  // draftedSeasonIds: exact-season dedup fallback (handles null player_id)
  const { draftedPlayerIds, draftedSeasonIds } = useMemo(() => {
    const completedPicks = session?.picks.filter(p => p.playerSeasonId !== null) || []

    const playerIds = new Set<string>()
    const seasonIds = new Set<string>()

    for (const pick of completedPicks) {
      if (pick.playerSeasonId) {
        seasonIds.add(pick.playerSeasonId)
      }
      if (pick.playerId) {
        playerIds.add(pick.playerId)
      } else if (pick.playerSeasonId) {
        const player = players.find(p => p.id === pick.playerSeasonId)
        if (player?.player_id) {
          playerIds.add(player.player_id)
        } else {
          console.warn('[DraftBoard] Could not resolve player_id for drafted season:', pick.playerSeasonId)
        }
      }
    }

    return { draftedPlayerIds: playerIds, draftedSeasonIds: seasonIds }
  }, [session?.picks, players])

  if (!session) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display text-cream mb-4">No Active Draft</h2>
          <button onClick={onExit} className="btn-primary">
            Return to Configuration
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center max-w-md w-full px-8">
          <h2 className="text-2xl font-display text-cream mb-4">Loading Players...</h2>
          <p className="text-cream/60 font-serif mb-6">
            Preparing {session.selectedSeasons.length} season(s)
          </p>

          {/* Progress Info */}
          <div className="mb-3">
            {loadingProgress.total > 0 ? (
              <>
                <p className="text-lg font-display text-gold">
                  {loadingProgress.loaded.toLocaleString()} of {loadingProgress.total.toLocaleString()} players
                </p>
                <p className="text-sm text-cream/60 font-serif mt-1">
                  {Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}% complete
                </p>
              </>
            ) : (
              <p className="text-lg font-display text-gold">
                Calculating total players...
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gold h-full rounded-full transition-all duration-300 ease-out relative"
              style={{
                width: loadingProgress.total > 0
                  ? `${Math.min((loadingProgress.loaded / loadingProgress.total) * 100, 100)}%`
                  : '100%',
                animation: loadingProgress.hasMore ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }}
            >
              {/* Shimmer effect while loading */}
              {loadingProgress.hasMore && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  style={{
                    animation: 'shimmer 1.5s infinite'
                  }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-cream/40 font-serif mt-3 tracking-widest uppercase">
            {loadingProgress.hasMore ? 'Retrieving Archives...' : 'Complete'}
          </p>

          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center relative overflow-hidden">
        {/* Confetti or celebration bg could go here */}
        <div className="text-center max-w-2xl mx-auto p-12 bg-charcoal-light border border-gold/20 rounded-sm shadow-2xl relative z-10">
          <h1 className="text-4xl font-display font-bold text-gold mb-4">
            Draft Complete
          </h1>
          <p className="text-xl font-serif text-cream/80 mb-8 italic">
            "The rosters are set. The legends are ready. Let the games begin."
          </p>
          <div className="space-x-4">
            <button onClick={onExit} className="btn-secondary-dark px-8">
              Return to Home
            </button>
            {onComplete && (
              <button onClick={onComplete} className="btn-primary px-8">
                Manage Rosters (Clubhouse)
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charcoal flex flex-col relative">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>

      {/* Draft Controls */}
      <div className="relative z-10">
        <DraftControls
          session={session}
          currentTeam={currentTeam}
          nextTeam={nextTeam}
          onPause={pauseDraft}
          onResume={resumeDraft}
          onSave={saveSession}
        />
      </div>

      {/* Main Content - War Room Desk */}
      <div className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          {/* Left Column: Player Pool (The Ledger) */}
          <div className="lg:col-span-8 h-full max-h-[calc(100vh-160px)] flex flex-col">
            <TabbedPlayerPool
              players={players}
              draftedPlayerIds={draftedPlayerIds}
              draftedSeasonIds={draftedSeasonIds}
              onSelectPlayer={handlePlayerSelect}
              currentTeamControl={currentTeam?.control || 'cpu'}
            />
          </div>

          {/* Right Column: Roster & History (The Clipboard) */}
          <div className="lg:col-span-4 space-y-6 h-full overflow-y-auto max-h-[calc(100vh-160px)] pr-2">
            {currentTeam && (
              <RosterView team={currentTeam} players={players} />
            )}

            <PickHistory
              session={session}
              players={players}
            />
          </div>
        </div>
      </div>

      {/* Position Assignment Modal */}
      {selectedPlayer && currentTeam && (
        <PositionAssignmentModal
          player={selectedPlayer}
          team={currentTeam}
          onConfirm={handleConfirmPick}
          onCancel={() => setSelectedPlayer(null)}
        />
      )}

      {/* CPU Pick Ticker - inline banner instead of blocking modal */}
      {(cpuThinking || lastCpuPick) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="container mx-auto px-4 pb-4">
            <div className="bg-charcoal/95 backdrop-blur-sm border border-gold/30 rounded-sm px-6 py-3 shadow-[0_0_30px_rgba(197,160,89,0.1)] flex items-center gap-4 max-w-2xl mx-auto">
              {cpuThinking && currentTeam ? (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="text-xs font-sans font-bold tracking-[0.15em] text-red-400 uppercase flex-shrink-0">
                    On the Wire
                  </span>
                  <div className="h-4 w-px bg-gold/20"></div>
                  <span className="text-sm font-display font-bold text-gold truncate">
                    {currentTeam.name}
                  </span>
                  <span className="text-sm font-serif italic text-cream/50 animate-pulse">
                    selecting...
                  </span>
                </>
              ) : lastCpuPick ? (
                <>
                  <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-sans font-bold tracking-[0.15em] text-gold uppercase flex-shrink-0">
                    Picked
                  </span>
                  <div className="h-4 w-px bg-gold/20"></div>
                  <span className="text-sm font-display font-bold text-cream truncate">
                    {lastCpuPick.teamName}
                  </span>
                  <span className="text-sm text-cream/40">drafts</span>
                  <span className="text-sm font-display font-bold text-gold truncate">
                    {lastCpuPick.playerName}
                  </span>
                  <span className="text-xs font-sans text-cream/40">
                    {lastCpuPick.position} / {lastCpuPick.year}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
import type { PlayerSeason } from '../../types/player'
import { transformPlayerSeasonData } from '../../utils/transformPlayerData'
import type { PositionCode } from '../../types/draft.types'
import { api } from '../../lib/api'

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
    applyCpuPick,
    pauseDraft,
    resumeDraft,
    saveSession,
  } = useDraftStore()

  // FIXED Issue #3: Convert module-level guards to component-scoped refs
  // These refs are properly cleaned up on component unmount, preventing
  // React 18 StrictMode from causing permanent hangs
  const cpuDraftInProgressRef = useRef(false)
  const failedPlayerSeasonIdsRef = useRef(new Set<string>())
  const lastSessionIdRef = useRef<string | null>(null)

  // FIXED Issue #8: Add AbortController for player loading cancellation
  const loadingAbortControllerRef = useRef<AbortController | null>(null)

  // Automatic retry tracking
  const cpuRetryCountRef = useRef(0)
  const maxRetries = 3

  // Debug: Log every render to track session state changes
  console.log('[DraftBoard] RENDER Component render:', {
    sessionId: session?.id,
    currentPick: session?.currentPick,
    currentRound: session?.currentRound,
    status: session?.status,
    picksCount: session?.picks.length
  })

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
  // FIXED Issue #11: Track CPU errors for error recovery UI
  const [cpuError, setCpuError] = useState<string | null>(null)

  // Prevent concurrent player loading (race condition guard)
  const loadingInProgress = useRef(false)

  // draftInProgress guard is component-scoped ref (cpuDraftInProgressRef) with proper cleanup

  // Prevent concurrent human pick submissions (double-click guard)
  const humanPickInProgress = useRef(false)

  const currentTeam = getCurrentPickingTeam()
  const nextTeam = getNextPickingTeam()

  // Debug: Log current team to see why CPU draft isn't running
  console.log('[DraftBoard] TEAM Current team:', {
    currentTeam: currentTeam ? {
      id: currentTeam.id,
      name: currentTeam.name,
      control: currentTeam.control
    } : null,
    cpuThinking
  })

  // Create stable reference to selected seasons for useEffect dependency
  // Only changes when actual seasons change, not when picks are made
  const selectedSeasonsKey = useMemo(
    () => session?.selectedSeasons?.join(',') || '',
    [session?.selectedSeasons]
  )

  // Load players from API
  useEffect(() => {
    async function loadPlayers() {
      if (!session) return

      // Prevent concurrent loads (race condition where session reference changes while loading)
      if (loadingInProgress.current) {
        return
      }

      // FIXED Issue #8: Create AbortController for this load operation
      loadingAbortControllerRef.current = new AbortController()
      const signal = loadingAbortControllerRef.current.signal

      loadingInProgress.current = true
      setLoading(true)
      setLoadingProgress({ loaded: 0, total: 0, hasMore: true })
      try {
        const { api } = await import('../../lib/api')
        const seasonsParam = session.selectedSeasons.join(',')

        // First, get total count for progress indication
        const countResponse = await api.get<{ count: number }>(`/players/pool?seasons=${seasonsParam}&countOnly=true`)
        const totalPlayers = countResponse.count || 0

        if (totalPlayers === 0) {
          console.error('[Player Load] WARNING: totalPlayers is 0!')
          console.error('[Player Load] This will skip the loading loop and show "No players found" error')
          console.error('[Player Load] Debugging info:')
          console.error('  - session:', session)
          console.error('  - session.selectedSeasons:', session.selectedSeasons)
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
              api.get<any[]>(`/players/pool?seasons=${seasonsParam}&offset=${currentOffset}&limit=${batchSize}`)
            )

            offset += batchSize
          }

          // Wait for all parallel batches to complete
          const results = await Promise.all(batchPromises)

          // Process results
          for (const data of results) {
            if (data && data.length > 0) {
              allPlayers.push(...data)
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
        // FIXED Issue #8: Don't show error if request was aborted (cleanup)
        if (signal.aborted) {
          console.log('[Player Load] Load aborted (cleanup)')
          return
        }
        console.error('[Player Load] CRITICAL ERROR - Exception:', err)
        alert(`CRITICAL ERROR: Exception while loading players.\n\nError: ${err}\n\nCheck console for details.`)
      } finally {
        // FIXED Issue #8: Only update state if not aborted
        if (!signal.aborted) {
          setLoading(false)
          loadingInProgress.current = false
        }
      }
    }

    loadPlayers()

    // FIXED Issue #8: Cleanup function to abort loading on unmount/re-run
    return () => {
      if (loadingAbortControllerRef.current) {
        loadingAbortControllerRef.current.abort()
        loadingInProgress.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: We intentionally depend only on selectedSeasonsKey, not the entire session object
    // This prevents reloading all players after every pick (which would interrupt CPU draft)
    // The session object changes frequently (after each pick), but selectedSeasons rarely changes
  }, [selectedSeasonsKey])

  // Debug: Track dependency changes
  useEffect(() => {
    console.log('[CPU Draft] DEPS Dependencies changed:', {
      'session?.currentPick': session?.currentPick,
      'session?.status': session?.status,
      'currentTeam?.id': currentTeam?.id,
      'applyCpuPick': typeof applyCpuPick,
      'pauseDraft': typeof pauseDraft
    })
  }, [session?.currentPick, session?.status, currentTeam?.id, applyCpuPick, pauseDraft])

  // CPU auto-draft logic - uses backend API for pick selection and execution
  // Component-scoped cpuDraftInProgress guard with proper cleanup prevents race conditions
  useEffect(() => {
    console.log('[CPU Draft] EFFECT Effect triggered, checking conditions:', {
      hasSession: !!session,
      hasCurrentTeam: !!currentTeam,
      currentTeamControl: currentTeam?.control,
      cpuDraftInProgress: cpuDraftInProgressRef.current,
      sessionStatus: session?.status,
      currentPick: session?.currentPick
    })

    let cancelled = false // StrictMode cleanup: set true on unmount to skip UI updates

    if (!session) {
      console.log('[CPU Draft] BLOCKED No session')
      return
    }

    // Reset retry counter when session changes
    if (lastSessionIdRef.current !== session.id) {
      console.log('[CPU Draft] Session changed, resetting retry counter')
      cpuRetryCountRef.current = 0
      lastSessionIdRef.current = session.id
    }

    if (!currentTeam) {
      console.log('[CPU Draft] BLOCKED No current team')
      return
    }
    if (currentTeam.control !== 'cpu') {
      console.log('[CPU Draft] BLOCKED Current team is not CPU (control=' + currentTeam.control + ')')
      return
    }

    // Component-scoped guard: properly cleaned up on unmount
    if (cpuDraftInProgressRef.current) {
      console.log('[CPU Draft] BLOCKED CPU draft already in progress')
      return
    }

    if (session.status !== 'in_progress') {
      console.log('[CPU Draft] BLOCKED Session status is not in_progress (status=' + session.status + ')')
      return
    }

    console.log('[CPU Draft] SUCCESS All guards passed - starting CPU draft pick')

    // Clear the failed-player blacklist when starting a new draft session
    if (session.id !== lastSessionIdRef.current) {
      failedPlayerSeasonIdsRef.current = new Set<string>()
      lastSessionIdRef.current = session.id
    }

    // Set guard BEFORE starting async operation
    cpuDraftInProgressRef.current = true
    setCpuThinking(true)

    // CPU pick API response type
    interface CpuPickResponse {
      result: 'success' | 'duplicate' | 'not_cpu_turn' | 'error'
      pick?: {
        pickNumber: number
        round: number
        pickInRound: number
        teamId: string
        playerSeasonId: string
        playerId: string
        position: PositionCode
        slotNumber: number
        playerName: string
        year: number
        bats?: 'L' | 'R' | 'B' | null
      }
      session?: {
        currentPick: number
        currentRound: number
        status: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned' | 'clubhouse'
      }
      error?: string
      playerSeasonId?: string
    }

    // Async IIFE - checks cancelled flag before side effects
    ;(async () => {
      try {
        console.log('[CPU Draft] START Async IIFE started, cancelled=' + cancelled)

        // Check if this effect instance was cancelled (StrictMode unmount)
        if (cancelled) {
          console.log('[CPU Draft] BLOCKED Async IIFE blocked by cancelled flag')
          return
        }

        console.log('[CPU Draft] API Calling CPU pick API:', `/draft/sessions/${session.id}/cpu-pick`)

        // FIXED Issue #6: Send blacklisted player IDs to prevent infinite retry loop
        const response = await api.post<CpuPickResponse>(
          `/draft/sessions/${session.id}/cpu-pick`,
          {
            seasons: session.selectedSeasons,
            excludePlayerSeasonIds: Array.from(failedPlayerSeasonIdsRef.current)
          }
        )

        console.log('[CPU Draft] RESPONSE API response received:', response.result)
        console.log('[CPU Draft] DETAILS Response details:', {
          result: response.result,
          hasPick: !!response.pick,
          hasSession: !!response.session,
          error: response.error,
          fullResponse: response
        })

        // Final cancelled check before updating state
        if (cancelled) return

        if (response.result === 'not_cpu_turn') {
          // Shouldn't happen since we check currentTeam.control, but handle gracefully
          console.warn('[CPU Draft] API says not CPU turn')
          return
        }

        if (response.result === 'duplicate') {
          // Player already in DB - blacklist and retry
          if (response.playerSeasonId) {
            failedPlayerSeasonIdsRef.current.add(response.playerSeasonId)
          }
          console.warn('[CPU Draft] Duplicate player - will auto-retry')
          return
        }

        if (response.result === 'error') {
          console.error('[CPU Draft] API error:', response.error)

          // Automatic retry with exponential backoff
          cpuRetryCountRef.current += 1
          console.log(`[CPU Draft] RETRY Attempt ${cpuRetryCountRef.current}/${maxRetries}`)

          if (cpuRetryCountRef.current < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delayMs = Math.pow(2, cpuRetryCountRef.current - 1) * 1000
            console.log(`[CPU Draft] RETRY Waiting ${delayMs}ms before retry...`)

            // Don't pause draft, just wait and let effect retry
            setTimeout(() => {
              console.log('[CPU Draft] RETRY Triggering retry by resetting guard')
              cpuDraftInProgressRef.current = false
            }, delayMs)
            return
          }

          // Max retries exhausted - show error to user
          console.error('[CPU Draft] RETRY Max retries exhausted, showing error to user')
          setCpuError(response.error || 'Unknown error during CPU draft')
          pauseDraft()
          return
        }

        if (response.result === 'success' && response.pick && response.session) {
          // Reset retry counter on success
          cpuRetryCountRef.current = 0
          console.log('[CPU Draft] SUCCESS CPU pick successful:', {
            pick: response.pick.pickNumber,
            player: response.pick.playerName,
            currentPickBefore: session.currentPick,
            currentPickFromAPI: response.session.currentPick
          })

          // Update session with pick data - don't reload entire session to avoid
          // triggering player reload (loadSession doesn't preserve selectedSeasons)
          applyCpuPick(
            {
              teamId: response.pick.teamId,
              playerSeasonId: response.pick.playerSeasonId,
              playerId: response.pick.playerId,
              position: response.pick.position,
              slotNumber: response.pick.slotNumber,
              bats: response.pick.bats,
            },
            {
              currentPick: response.session.currentPick,
              currentRound: response.session.currentRound,
              status: response.session.status,
            }
          )

          // Show inline ticker for this pick (clears after 3 seconds)
          if (!cancelled) {
            if (lastCpuPickTimer.current) clearTimeout(lastCpuPickTimer.current)
            setLastCpuPick({
              teamName: currentTeam.name,
              playerName: response.pick.playerName,
              position: response.pick.position,
              year: response.pick.year,
            })
            lastCpuPickTimer.current = setTimeout(() => setLastCpuPick(null), 3000)
          }
        }
      } catch (error) {
        console.error('[CPU Draft] ERROR during API call:', error)

        // Automatic retry with exponential backoff
        cpuRetryCountRef.current += 1
        console.log(`[CPU Draft] RETRY (Exception) Attempt ${cpuRetryCountRef.current}/${maxRetries}`)

        if (cpuRetryCountRef.current < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, cpuRetryCountRef.current - 1) * 1000
          console.log(`[CPU Draft] RETRY Waiting ${delayMs}ms before retry...`)

          // Don't pause draft, just wait and let effect retry
          setTimeout(() => {
            console.log('[CPU Draft] RETRY Triggering retry by resetting guard')
            cpuDraftInProgressRef.current = false
          }, delayMs)
          return
        }

        // Max retries exhausted - show error to user
        console.error('[CPU Draft] RETRY Max retries exhausted, showing error to user')
        setCpuError(`CPU draft failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        pauseDraft()
      } finally {
        // Always reset guards so the next effect run can proceed
        cpuDraftInProgressRef.current = false
        setCpuThinking(false)
      }
    })()

    // Cleanup: mark this instance as cancelled and reset guards
    // This properly cleans up on StrictMode unmount, preventing permanent hangs
    return () => {
      cancelled = true
      cpuDraftInProgressRef.current = false
      // Keep failedPlayerSeasonIds across same session, only clear on new session
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentPick, session?.status, currentTeam?.id, applyCpuPick, pauseDraft])
  // Note: cpuThinking is intentionally NOT in dependencies to avoid cancelling the async operation
  // when setCpuThinking(true) is called

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

  // FIXED Issue #11: Retry handler for CPU draft errors
  const handleRetry = useCallback(() => {
    console.log('[CPU Draft] Manual retry triggered, resetting counter')
    cpuRetryCountRef.current = 0
    setCpuError(null)
    resumeDraft()
  }, [resumeDraft])

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

      {/* FIXED Issue #11: CPU Error Recovery UI */}
      {cpuError && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-red-900/95 backdrop-blur-sm border border-red-500/50 rounded-sm px-8 py-6 shadow-[0_0_40px_rgba(239,68,68,0.3)] max-w-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                <h3 className="text-lg font-sans font-bold tracking-wider text-red-400 uppercase">
                  CPU Draft Error
                </h3>
              </div>
              <p className="text-sm font-serif text-cream/90 leading-relaxed">
                {cpuError}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 bg-gold hover:bg-gold/80 text-charcoal font-sans font-bold text-sm tracking-wider uppercase px-4 py-2 rounded-sm transition-colors"
                >
                  Retry Draft
                </button>
                <button
                  onClick={() => setCpuError(null)}
                  className="flex-1 bg-charcoal/80 hover:bg-charcoal border border-cream/20 hover:border-cream/40 text-cream font-sans font-bold text-sm tracking-wider uppercase px-4 py-2 rounded-sm transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
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

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
    applyCpuPicksBatch,
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
  // console.log('[DraftBoard] RENDER Component render:', {
  //   sessionId: session?.id,
  //   currentPick: session?.currentPick,
  //   currentRound: session?.currentRound,
  //   status: session?.status,
  //   picksCount: session?.picks.length
  // })

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
  // console.log('[DraftBoard] TEAM Current team:', {
  //   currentTeam: currentTeam ? {
  //     id: currentTeam.id,
  //     name: currentTeam.name,
  //     control: currentTeam.control
  //   } : null,
  //   cpuThinking
  // })

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

        // Use cached pool endpoint - single request instead of 70+ paginated requests
        // This uses the same server-side cache as CPU picks
        console.log('[Player Load] Loading full player pool from cache...')
        setLoadingProgress({ loaded: 0, total: 1, hasMore: true })

        const allPlayers = await api.get<any[]>(
          `/players/pool-full?sessionId=${session.id}&seasons=${seasonsParam}`
        )

        console.log(`[Player Load] Received ${allPlayers?.length || 0} players`)

        if (!allPlayers || allPlayers.length === 0) {
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

        setLoadingProgress({ loaded: allPlayers.length, total: allPlayers.length, hasMore: false })

        // Transform data to typed PlayerSeason objects (shared utility)
        // Handles numeric coercion for at_bats/innings_pitched_outs and flattens player join data
        const transformedPlayers = allPlayers.map(transformPlayerSeasonData)

        setPlayers(transformedPlayers)
      } catch (err) {
        // FIXED Issue #8: Don't show error if request was aborted (cleanup)
        if (signal.aborted) {
          // console.log('[Player Load] Load aborted (cleanup)')
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
  // useEffect(() => {
  //   console.log('[CPU Draft] DEPS Dependencies changed:', {
  //     'session?.currentPick': session?.currentPick,
  //     'session?.status': session?.status,
  //     'currentTeam?.id': currentTeam?.id,
  //     'applyCpuPick': typeof applyCpuPick,
  //     'pauseDraft': typeof pauseDraft
  //   })
  // }, [session?.currentPick, session?.status, currentTeam?.id, applyCpuPick, pauseDraft])

  // CPU auto-draft logic - uses BATCH endpoint for all consecutive CPU picks
  // This eliminates frontend round-trip latency by processing all CPU picks in one API call
  useEffect(() => {
    let cancelled = false // StrictMode cleanup: set true on unmount to skip UI updates

    // DEBUG: Log all conditions to trace why CPU picks might not trigger
    console.log('[CPU Batch] useEffect triggered:', {
      hasSession: !!session,
      sessionStatus: session?.status,
      currentPick: session?.currentPick,
      currentTeamId: currentTeam?.id,
      currentTeamName: currentTeam?.name,
      currentTeamControl: currentTeam?.control,
      cpuDraftInProgress: cpuDraftInProgressRef.current,
    })

    if (!session) {
      console.log('[CPU Batch] BLOCKED: No session')
      return
    }

    // Reset retry counter when session changes
    if (lastSessionIdRef.current !== session.id) {
      cpuRetryCountRef.current = 0
      lastSessionIdRef.current = session.id
      failedPlayerSeasonIdsRef.current = new Set<string>()
    }

    if (!currentTeam) {
      console.log('[CPU Batch] BLOCKED: No currentTeam')
      return
    }
    if (currentTeam.control !== 'cpu') {
      console.log('[CPU Batch] BLOCKED: currentTeam is not CPU, control=' + currentTeam.control)
      return
    }

    // Component-scoped guard: properly cleaned up on unmount
    if (cpuDraftInProgressRef.current) {
      console.log('[CPU Batch] BLOCKED: CPU draft already in progress')
      return
    }

    if (session.status !== 'in_progress') {
      console.log('[CPU Batch] BLOCKED: session status is not in_progress, status=' + session.status)
      return
    }

    console.log('[CPU Batch] All guards passed - proceeding with batch picks')

    // Set guard BEFORE starting async operation
    cpuDraftInProgressRef.current = true
    setCpuThinking(true)

    // CPU batch picks API response type
    interface CpuBatchResponse {
      result: 'success' | 'error'
      picks?: Array<{
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
      }>
      picksCount?: number
      session?: {
        currentPick: number
        currentRound: number
        status: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned' | 'clubhouse'
      }
      error?: string
    }

    // Async IIFE - processes all consecutive CPU picks in one batch
    ;(async () => {
      try {
        if (cancelled) return

        console.log('[CPU Batch] Starting batch CPU picks...')
        const startTime = Date.now()

        // Call batch endpoint - processes ALL consecutive CPU picks
        const response = await api.post<CpuBatchResponse>(
          `/draft/sessions/${session.id}/cpu-picks-batch`,
          {
            seasons: session.selectedSeasons,
            excludePlayerSeasonIds: Array.from(failedPlayerSeasonIdsRef.current)
          }
        )

        if (cancelled) return

        if (response.result === 'error') {
          console.error('[CPU Batch] API error:', response.error)

          cpuRetryCountRef.current += 1
          if (cpuRetryCountRef.current < maxRetries) {
            const delayMs = Math.pow(2, cpuRetryCountRef.current - 1) * 1000
            setTimeout(() => {
              cpuDraftInProgressRef.current = false
            }, delayMs)
            return
          }

          setCpuError(response.error || 'Unknown error during CPU draft')
          pauseDraft()
          return
        }

        console.log('[CPU Batch] API response:', JSON.stringify(response, null, 2))
        console.log('[CPU Batch] Response check:', {
          result: response.result,
          hasPicks: !!response.picks,
          picksLength: response.picks?.length,
          hasSession: !!response.session,
          sessionData: response.session
        })

        if (response.result === 'success' && response.picks && response.session) {
          console.log('[CPU Batch] SUCCESS condition met, calling applyCpuPicksBatch')
          cpuRetryCountRef.current = 0
          const batchTime = Date.now() - startTime
          console.log(`[CPU Batch] Completed ${response.picks.length} picks in ${batchTime}ms`)

          // Apply all picks at once using batch function
          console.log('[CPU Batch] Calling applyCpuPicksBatch with', response.picks.length, 'picks')
          applyCpuPicksBatch(
            response.picks.map(pick => ({
              pickNumber: pick.pickNumber,
              teamId: pick.teamId,
              playerSeasonId: pick.playerSeasonId,
              playerId: pick.playerId,
              position: pick.position,
              slotNumber: pick.slotNumber,
              bats: pick.bats,
            })),
            {
              currentPick: response.session.currentPick,
              currentRound: response.session.currentRound,
              status: response.session.status,
            }
          )
          console.log('[CPU Batch] applyCpuPicksBatch completed')

          // Show ticker for the last pick in the batch
          if (!cancelled && response.picks.length > 0) {
            const lastPick = response.picks[response.picks.length - 1]
            const pickingTeam = session.teams.find(t => t.id === lastPick.teamId)
            if (lastCpuPickTimer.current) clearTimeout(lastCpuPickTimer.current)
            setLastCpuPick({
              teamName: pickingTeam?.name || 'CPU',
              playerName: lastPick.playerName,
              position: lastPick.position,
              year: lastPick.year,
            })
            lastCpuPickTimer.current = setTimeout(() => setLastCpuPick(null), 3000)
          }
        }
      } catch (error) {
        console.error('[CPU Batch] ERROR during API call:', error)

        cpuRetryCountRef.current += 1
        if (cpuRetryCountRef.current < maxRetries) {
          const delayMs = Math.pow(2, cpuRetryCountRef.current - 1) * 1000
          setTimeout(() => {
            cpuDraftInProgressRef.current = false
          }, delayMs)
          return
        }

        setCpuError(`CPU draft failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        pauseDraft()
      } finally {
        cpuDraftInProgressRef.current = false
        setCpuThinking(false)
      }
    })()

    // Cleanup: mark this instance as cancelled and reset guards
    return () => {
      cancelled = true
      cpuDraftInProgressRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentPick, session?.status, currentTeam?.id, applyCpuPicksBatch, pauseDraft])
  // Note: cpuThinking is intentionally NOT in dependencies to avoid cancelling the async operation

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
    // console.log('[CPU Draft] Manual retry triggered, resetting counter')
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

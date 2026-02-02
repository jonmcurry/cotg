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

  // Prevent concurrent player loading (race condition guard)
  const loadingInProgress = useRef(false)

  // Prevent concurrent draft operations (prevents duplicate pick database errors)
  const draftInProgress = useRef(false)

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
        console.log('[Player Load] BLOCKED - Already loading, skipping concurrent load')
        return
      }

      loadingInProgress.current = true
      console.log('[Player Load] EFFECT TRIGGERED - Starting player load for seasons:', session.selectedSeasons)
      console.log('[Player Load] Seasons array length:', session.selectedSeasons?.length)
      console.log('[Player Load] Seasons array type:', typeof session.selectedSeasons)
      console.log('[Player Load] Seasons array is array?:', Array.isArray(session.selectedSeasons))
      console.log('[Player Load] Current player count:', players.length)
      setLoading(true)
      setLoadingProgress({ loaded: 0, total: 0, hasMore: true })
      try {
        const { supabase } = await import('../../lib/supabaseClient')

        // First, get total count for progress indication
        console.log('[Player Load] Building count query...')
        console.log('[Player Load] Query params: years =', session.selectedSeasons)
        const { count, error: countError } = await supabase
          .from('player_seasons')
          .select('id', { count: 'exact', head: true })
          .in('year', session.selectedSeasons)
          .or('at_bats.gte.200,innings_pitched_outs.gte.30')

        console.log('[Player Load] Count query result: count =', count, ', error =', countError)

        if (countError) {
          console.error('[Player Load] Error getting count:', countError)
          console.error('[Player Load] Error code:', countError.code)
          console.error('[Player Load] Error message:', countError.message)
          console.error('[Player Load] Error details:', countError.details)
        }

        const totalPlayers = count || 0
        console.log(`[Player Load] Total players to fetch: ${totalPlayers}`)

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
            console.log(`[Player Load] Starting batch at offset ${currentOffset}...`)

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
              console.log(`[Player Load] Fetched ${result.data.length} players in batch`)
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

        console.log(`[Player Load] SUCCESS - Loaded ${transformedPlayers.length} total players across all batches`)
        console.log(`[Player Load] Setting players state (will trigger TabbedPlayerPool re-render)`)
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
  // Uses draftInProgress ref as sole concurrency guard (synchronous, not subject to React batching).
  // cpuThinking state is in the dependency array so the effect re-triggers when a pick completes
  // (setCpuThinking(false) in finally -> dependency changes -> effect re-runs -> picks up next team).
  // No setTimeout used - async IIFE runs directly to avoid cleanup-related race conditions.
  useEffect(() => {
    console.log('[CPU Draft] useEffect triggered', {
      hasSession: !!session,
      hasCurrentTeam: !!currentTeam,
      teamControl: currentTeam?.control,
      cpuThinking,
      draftInProgress: draftInProgress.current,
      sessionStatus: session?.status,
      playersCount: players.length,
      loading,
      currentPick: session?.currentPick,
    })

    if (!session) {
      console.log('[CPU Draft] Early return - no session')
      return
    }

    if (!currentTeam) {
      console.log('[CPU Draft] Early return - no current team')
      return
    }

    if (currentTeam.control !== 'cpu') {
      console.log('[CPU Draft] Early return - current team is human controlled')
      return
    }

    // Sole concurrency guard: ref-based, synchronous, not subject to React batching
    // Do NOT use cpuThinking state as a guard - it's a stale closure value that
    // causes the draft to stall when makePick triggers an optimistic session update
    // before the async operation completes.
    if (draftInProgress.current) {
      console.log('[CPU Draft] Early return - draft operation already in progress (ref guard)')
      return
    }

    if (session.status !== 'in_progress') {
      console.log('[CPU Draft] Early return - session status is not in_progress:', session.status)
      return
    }

    // Wait for players to finish loading before checking if empty
    if (loading) {
      console.log('[CPU Draft] Early return - players still loading')
      return
    }

    // Only show error if loading is complete and still no players
    if (players.length === 0) {
      console.error('[CPU Draft] CRITICAL ERROR - No players loaded! Cannot draft.')
      alert('CRITICAL ERROR: No players loaded for draft. Please check Supabase connection and player_seasons data.')
      return
    }

    console.log(`[CPU Draft] ${currentTeam.name} is picking...`)

    // Set guards BEFORE starting async operation
    draftInProgress.current = true
    setCpuThinking(true)

      // Async IIFE - no setTimeout needed (avoids cleanup race conditions)
      ; (async () => {
        try {
          console.time('[CPU Draft] Total CPU pick time')
          console.time('[CPU Draft] 1. Build drafted player IDs')

          // Build Set of drafted player_id values (not playerSeasonId)
          // This prevents the same player from being drafted multiple times for different seasons
          // Example: If Christy Mathewson 1908 is drafted, ALL his other seasons are excluded
          const draftedPlayerIds = new Set<string>()

          session.teams.forEach(team => {
            team.roster.forEach(slot => {
              if (slot.isFilled && slot.playerSeasonId) {
                // Find the player in the players array to get their player_id
                const player = players.find(p => p.id === slot.playerSeasonId)
                if (player && player.player_id) {
                  draftedPlayerIds.add(player.player_id)
                }
              }
            })
          })

          console.log(`[CPU Draft] Drafted players: ${draftedPlayerIds.size} unique players`)
          console.timeEnd('[CPU Draft] 1. Build drafted player IDs')

          // Performance optimization: Filter undrafted players and only pass top 1000 by rating
          // Players array is already sorted by apba_rating DESC from SQL query
          // This reduces processing from 69,459 players to ~1000 per pick (98.5% reduction)
          console.time('[CPU Draft] 2. Filter undrafted players')
          const undraftedPlayers = players.filter(p => !draftedPlayerIds.has(p.player_id))
          const topUndrafted = undraftedPlayers.slice(0, 1000)
          console.timeEnd('[CPU Draft] 2. Filter undrafted players')

          console.log(`[CPU Draft] Selecting from ${topUndrafted.length} top-rated undrafted players (${draftedPlayerIds.size} unique players already drafted, ${undraftedPlayers.length} player-seasons remaining)`)

          console.time('[CPU Draft] 3. selectBestPlayer()')
          const selection = selectBestPlayer(topUndrafted, currentTeam, draftedPlayerIds, session.currentRound)
          console.timeEnd('[CPU Draft] 3. selectBestPlayer()')

          if (selection) {
            console.log(`[CPU Draft] ${currentTeam.name} drafts: ${selection.player.display_name} (${selection.position}), bats: ${selection.player.bats || 'unknown'}`)
            console.time('[CPU Draft] 4. makePick() - database write')
            await makePick(selection.player.id, selection.player.player_id, selection.position, selection.slotNumber, selection.player.bats)
            console.timeEnd('[CPU Draft] 4. makePick() - database write')
          } else {
            console.error('[CPU Draft] CRITICAL ERROR - CPU could not find a player to draft!', {
              playersAvailable: players.length,
              alreadyDrafted: draftedPlayerIds.size,
              teamRosterFilled: currentTeam.roster.filter(s => s.isFilled).length,
            })
            alert('CRITICAL ERROR: CPU could not find a player to draft. Check console for details.')
          }

          console.timeEnd('[CPU Draft] Total CPU pick time')
        } catch (error) {
          console.error('[CPU Draft] ERROR during draft operation:', error)
          alert('ERROR during CPU draft. Check console for details.')
        } finally {
          // Reset ref guard first (synchronous), then state (triggers re-render -> effect re-runs)
          draftInProgress.current = false
          setCpuThinking(false)
        }
      })()

    // No cleanup function - the ref guard prevents concurrent operations.
    // Previously, cleanup was resetting cpuThinking which caused race conditions.
    // The async operation completes naturally and resets guards in its finally block.
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

      await makePick(selectedPlayer.id, selectedPlayer.player_id, position, slotNumber, selectedPlayer.bats)
      setSelectedPlayer(null)
    },
    [selectedPlayer, makePick]
  )

  const draftedPlayerIds = useMemo(() => {
    // Get all drafted season IDs
    const draftedSeasonIds = new Set(
      session?.picks
        .filter(p => p.playerSeasonId !== null)
        .map(p => p.playerSeasonId!) || []
    )

    // Convert season IDs to player IDs so all seasons of a drafted player are filtered out
    const playerIds = new Set(
      players
        .filter(p => draftedSeasonIds.has(p.id))
        .map(p => p.player_id)
    )

    console.log('[DraftBoard] Drafted seasons:', draftedSeasonIds.size, '| Unique players drafted:', playerIds.size)

    return playerIds
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

      {/* CPU Thinking Overlay - Vintage Broadcast */}
      {cpuThinking && currentTeam && (
        <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-charcoal px-12 py-8 border-y-2 border-gold/50 shadow-[0_0_50px_rgba(197,160,89,0.1)] text-center max-w-lg w-full mx-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <span className="text-xs font-sans font-bold tracking-[0.2em] text-red-500 uppercase">
                Wire Transmitting
              </span>
            </div>

            <h3 className="text-3xl font-display font-bold text-cream mb-2 tracking-tight">
              {currentTeam.name}
            </h3>
            <div className="h-px w-24 bg-gold/30 mx-auto mb-4"></div>
            <p className="text-gold/80 font-serif italic text-lg animate-pulse">
              Selecting player...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

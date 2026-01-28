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
import type { PositionCode } from '../../types/draft.types'

interface Props {
  onExit: () => void
}

export default function DraftBoard({ onExit }: Props) {
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

  const currentTeam = getCurrentPickingTeam()
  const nextTeam = getNextPickingTeam()

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
      console.log('[Player Load] Current player count:', players.length)
      setLoading(true)
      setLoadingProgress({ loaded: 0, total: 0, hasMore: true })
      try {
        const { supabase } = await import('../../lib/supabaseClient')

        // First, get total count for progress indication
        console.log('[Player Load] Getting total player count...')
        const { count, error: countError } = await supabase
          .from('player_seasons')
          .select('id', { count: 'exact', head: true })
          .in('year', session.selectedSeasons)
          .or('at_bats.gte.200,innings_pitched_outs.gte.30')

        if (countError) {
          console.error('[Player Load] Error getting count:', countError)
        }

        const totalPlayers = count || 0
        console.log(`[Player Load] Total players to fetch: ${totalPlayers}`)
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
                    last_name
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
          alert(`CRITICAL ERROR: No players found for selected seasons: ${session.selectedSeasons.join(', ')}\n\nPlease ensure player_seasons table has data for these years.`)
          return
        }

        // Transform data to include player names
        const transformedPlayers = allPlayers.map((p: any) => ({
          id: p.id,
          player_id: p.player_id,
          year: p.year,
          team_id: p.team_id,
          primary_position: p.primary_position,
          apba_rating: p.apba_rating,
          war: p.war,
          at_bats: p.at_bats,
          batting_avg: p.batting_avg,
          hits: p.hits,
          home_runs: p.home_runs,
          rbi: p.rbi,
          stolen_bases: p.stolen_bases,
          on_base_pct: p.on_base_pct,
          slugging_pct: p.slugging_pct,
          innings_pitched_outs: p.innings_pitched_outs,
          wins: p.wins,
          losses: p.losses,
          era: p.era,
          strikeouts_pitched: p.strikeouts_pitched,
          saves: p.saves,
          shutouts: p.shutouts,
          whip: p.whip,
          display_name: p.players.display_name,
          first_name: p.players.first_name,
          last_name: p.players.last_name,
        }))

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
  }, [session])

  // CPU auto-draft logic
  useEffect(() => {
    console.log('[CPU Draft] useEffect triggered', {
      hasSession: !!session,
      hasCurrentTeam: !!currentTeam,
      teamControl: currentTeam?.control,
      cpuThinking,
      sessionStatus: session?.status,
      playersCount: players.length,
      loading,
    })

    if (!session || !currentTeam || currentTeam.control !== 'cpu' || cpuThinking) {
      console.log('[CPU Draft] Early return - conditions not met')
      return
    }

    if (session.status !== 'in_progress') {
      console.error('[CPU Draft] BLOCKED - Session status is not in_progress:', session.status)
      return
    }

    // Wait for players to finish loading before checking if empty
    if (loading) {
      console.log('[CPU Draft] Waiting for players to load...')
      return
    }

    // Only show error if loading is complete and still no players
    if (players.length === 0) {
      console.error('[CPU Draft] CRITICAL ERROR - No players loaded! Cannot draft.')
      alert('CRITICAL ERROR: No players loaded for draft. Please check Supabase connection and player_seasons data.')
      return
    }

    // CPU makes pick after 1-2 second delay for realism
    console.log(`[CPU Draft] ${currentTeam.name} is thinking...`)
    setCpuThinking(true)
    const delay = 1000 + Math.random() * 1000

    const timeoutId = setTimeout(() => {
      const draftedIds = new Set(
        session.picks
          .filter(p => p.playerSeasonId !== null)
          .map(p => p.playerSeasonId!)
      )

      console.log(`[CPU Draft] Selecting from ${players.length} players, ${draftedIds.size} already drafted`)

      const selection = selectBestPlayer(players, currentTeam, draftedIds)

      if (selection) {
        console.log(`[CPU Draft] ${currentTeam.name} drafts: ${selection.player.display_name} (${selection.position})`)
        makePick(selection.player.id, selection.position, selection.slotNumber)
      } else {
        console.error('[CPU Draft] CRITICAL ERROR - CPU could not find a player to draft!', {
          playersAvailable: players.length,
          alreadyDrafted: draftedIds.size,
          teamRosterFilled: currentTeam.roster.filter(s => s.isFilled).length,
        })
        alert('CRITICAL ERROR: CPU could not find a player to draft. Check console for details.')
      }

      setCpuThinking(false)
    }, delay)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: We only depend on values that should trigger a NEW draft decision:
    // - session?.currentPick: Re-run when pick advances to next team
    // - session?.status: Re-run when draft starts/pauses
    // - currentTeam?.id: Re-run when the picking team changes
    // - players.length: Re-run when players become available (0 -> 1000)
    // We intentionally do NOT depend on: session (full object), players (array reference), loading, cpuThinking
    // Using players.length (primitive) instead of players (array) prevents false re-runs when array reference changes
  }, [session?.currentPick, session?.status, currentTeam?.id, players.length, makePick])

  const handlePlayerSelect = useCallback((player: PlayerSeason) => {
    if (!currentTeam || currentTeam.control !== 'human') {
      return
    }

    setSelectedPlayer(player)
  }, [currentTeam])

  const handleConfirmPick = useCallback(
    async (position: PositionCode, slotNumber: number) => {
      if (!selectedPlayer) return

      await makePick(selectedPlayer.id, position, slotNumber)
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display text-burgundy mb-4">No Active Draft</h2>
          <button onClick={onExit} className="btn-primary">
            Return to Configuration
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center max-w-md w-full px-8">
          <h2 className="text-2xl font-display text-burgundy mb-4">Loading Players...</h2>
          <p className="text-charcoal/60 font-serif mb-6">
            Preparing {session.selectedSeasons.length} season(s)
          </p>

          {/* Progress Info */}
          <div className="mb-3">
            {loadingProgress.total > 0 ? (
              <>
                <p className="text-lg font-display text-charcoal">
                  {loadingProgress.loaded.toLocaleString()} of {loadingProgress.total.toLocaleString()} players
                </p>
                <p className="text-sm text-charcoal/60 font-serif mt-1">
                  {Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}% complete
                </p>
              </>
            ) : (
              <p className="text-lg font-display text-charcoal">
                Calculating total players...
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-charcoal/10 rounded-full h-3 overflow-hidden">
            <div
              className="bg-burgundy h-full rounded-full transition-all duration-300 ease-out relative"
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
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{
                    animation: 'shimmer 1.5s infinite'
                  }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-charcoal/50 font-serif mt-3">
            {loadingProgress.hasMore ? 'Loading player data...' : 'Complete!'}
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1 className="text-4xl font-display font-bold text-burgundy mb-4">
            Draft Complete!
          </h1>
          <p className="text-xl font-serif text-charcoal mb-8">
            All {session.numTeams} teams have completed their rosters.
          </p>
          <div className="space-x-4">
            <button onClick={onExit} className="btn-primary">
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Draft Controls */}
      <DraftControls
        session={session}
        currentTeam={currentTeam}
        nextTeam={nextTeam}
        onPause={pauseDraft}
        onResume={resumeDraft}
        onSave={saveSession}
      />

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Column: Player Pool */}
          <div className="lg:col-span-2">
            <TabbedPlayerPool
              players={players}
              draftedPlayerIds={draftedPlayerIds}
              onSelectPlayer={handlePlayerSelect}
              currentTeamControl={currentTeam?.control || 'cpu'}
            />
          </div>

          {/* Right Column: Roster & History */}
          <div className="space-y-6">
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

      {/* CPU Thinking Overlay */}
      {cpuThinking && currentTeam && (
        <div className="fixed inset-0 bg-charcoal/30 flex items-center justify-center z-40">
          <div className="bg-cream rounded-lg shadow-2xl p-8 text-center max-w-md">
            <h3 className="text-xl font-display text-burgundy mb-2">
              {currentTeam.name} is drafting...
            </h3>
            <p className="text-charcoal/60 font-serif text-sm">
              Evaluating available players
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

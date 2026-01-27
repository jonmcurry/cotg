/**
 * Draft Board - Main Draft Screen
 * Orchestrates the entire draft interface
 * Implements SRD UI requirement 7.3
 */

import { useState, useEffect, useCallback } from 'react'
import { useDraftStore } from '../../stores/draftStore'
import PlayerPool from './PlayerPool'
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
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSeason | null>(null)
  const [cpuThinking, setCpuThinking] = useState(false)

  const currentTeam = getCurrentPickingTeam()
  const nextTeam = getNextPickingTeam()

  // Load players from Supabase
  useEffect(() => {
    async function loadPlayers() {
      if (!session) return

      console.log('[Player Load] Starting player load for seasons:', session.selectedSeasons)
      setLoading(true)
      try {
        const { supabase } = await import('../../lib/supabaseClient')

        // Build query to get players from selected seasons
        const { data, error } = await supabase
          .from('player_seasons')
          .select(`
            id,
            player_id,
            year,
            team_id,
            primary_position,
            war,
            batting_avg,
            home_runs,
            rbi,
            stolen_bases,
            wins,
            losses,
            era,
            strikeouts_pitched,
            saves,
            players!inner (
              display_name,
              first_name,
              last_name
            )
          `)
          .in('year', session.selectedSeasons)
          .or('at_bats.gte.100,innings_pitched_outs.gte.60') // Minimum playing time
          .order('war', { ascending: false, nullsFirst: false })

        if (error) {
          console.error('[Player Load] CRITICAL ERROR loading players:', error)
          alert(`CRITICAL ERROR: Failed to load players from Supabase.\n\nError: ${error.message}\n\nCheck console for details.`)
          return
        }

        if (!data || data.length === 0) {
          console.error('[Player Load] CRITICAL ERROR - No players found for selected seasons:', session.selectedSeasons)
          alert(`CRITICAL ERROR: No players found for selected seasons: ${session.selectedSeasons.join(', ')}\n\nPlease ensure player_seasons table has data for these years.`)
          return
        }

        // Transform data to include player names
        const transformedPlayers = data.map((p: any) => ({
          id: p.id,
          player_id: p.player_id,
          year: p.year,
          team_id: p.team_id,
          primary_position: p.primary_position,
          war: p.war,
          batting_avg: p.batting_avg,
          home_runs: p.home_runs,
          rbi: p.rbi,
          stolen_bases: p.stolen_bases,
          wins: p.wins,
          losses: p.losses,
          era: p.era,
          strikeouts_pitched: p.strikeouts_pitched,
          saves: p.saves,
          display_name: p.players.display_name,
          first_name: p.players.first_name,
          last_name: p.players.last_name,
        }))

        console.log(`[Player Load] SUCCESS - Loaded ${transformedPlayers.length} players`)
        setPlayers(transformedPlayers)
      } catch (err) {
        console.error('[Player Load] CRITICAL ERROR - Exception:', err)
        alert(`CRITICAL ERROR: Exception while loading players.\n\nError: ${err}\n\nCheck console for details.`)
      } finally {
        setLoading(false)
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
    // Note: cpuThinking and loading are intentionally NOT in dependencies to prevent cleanup from canceling timeout
  }, [session, currentTeam, players, makePick])

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

  const draftedPlayerIds = new Set(
    session?.picks
      .filter(p => p.playerSeasonId !== null)
      .map(p => p.playerSeasonId!) || []
  )

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
        <div className="text-center">
          <h2 className="text-2xl font-display text-burgundy mb-2">Loading Players...</h2>
          <p className="text-charcoal/60 font-serif">
            Preparing {session.selectedSeasons.length} season(s)
          </p>
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
            <PlayerPool
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

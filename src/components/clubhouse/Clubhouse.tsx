/**
 * Clubhouse Screen
 * Post-draft management interface for setting depth charts and rotations
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import type { DraftSession, DraftTeam } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'
import { transformPlayerSeasonData } from '../../utils/transformPlayerData'
import RosterView from '../draft/RosterView'
import LineupEditor from './LineupEditor'
import RotationEditor from './RotationEditor'
import { useDraftStore } from '../../stores/draftStore'
import { api } from '../../lib/api'
import type { TeamDepthChart } from '../../types/draft.types'

interface Props {
    session: DraftSession
    onExit: () => void
    onStartSeason?: () => void
}

type ViewMode = 'roster' | 'lineup' | 'rotation'

/**
 * Validate that a team has minimum requirements to start a season:
 * - Both lineups (vs RHP and vs LHP) must have 9 players
 * - Rotation must have at least 4 starters
 * - Must have a closer assigned
 */
function validateTeamReadiness(team: DraftTeam): string[] {
    const issues: string[] = []
    if (!team.depthChart) {
        issues.push(`${team.name}: No depth chart configured`)
        return issues
    }

    const { lineupVS_RHP, lineupVS_LHP, rotation, bullpen } = team.depthChart

    const rhpFilled = lineupVS_RHP.filter(s => s.playerSeasonId).length
    if (rhpFilled < 9) {
        issues.push(`${team.name}: vs RHP lineup has ${rhpFilled}/9 players`)
    }

    const lhpFilled = lineupVS_LHP.filter(s => s.playerSeasonId).length
    if (lhpFilled < 9) {
        issues.push(`${team.name}: vs LHP lineup has ${lhpFilled}/9 players`)
    }

    const rotationFilled = rotation.filter(s => s.playerSeasonId).length
    if (rotationFilled < 4) {
        issues.push(`${team.name}: Rotation has ${rotationFilled}/4 minimum starters`)
    }

    if (!bullpen.closer) {
        issues.push(`${team.name}: No closer assigned`)
    }

    return issues
}

export default function Clubhouse({ session, onExit, onStartSeason }: Props) {
    const { generateSeasonSchedule, updateTeamDepthChart } = useDraftStore()
    const [selectedTeamId, setSelectedTeamId] = useState<string>(session.teams[0]?.id || '')
    const [viewMode, setViewMode] = useState<ViewMode>('roster')
    const [players, setPlayers] = useState<PlayerSeason[]>([])
    const [loading, setLoading] = useState(true)
    const [generatingSchedule, setGeneratingSchedule] = useState(false)
    const [scheduleError, setScheduleError] = useState<string | null>(null)

    // Track if lineups have been generated this session to prevent infinite loops
    const lineupsGeneratedRef = useRef(false)

    const selectedTeam = session.teams.find(t => t.id === selectedTeamId)

    // Cache key: derive from the set of drafted player season IDs
    // Re-fetches when roster composition actually changes (not just on every render)
    const seasonIdsCacheKey = useMemo(() => {
        return session.teams
            .flatMap(t => t.roster.filter(s => s.isFilled && s.playerSeasonId).map(s => s.playerSeasonId))
            .sort()
            .join(',')
    }, [session.teams])

    // Load drafted players - re-fetches when roster composition changes
    // NOTE: Only depends on seasonIdsCacheKey (not session.teams) to prevent infinite loops
    // when depth charts are updated (which changes session.teams reference)
    useEffect(() => {
        async function loadDraftedPlayers() {
            try {
                const { api } = await import('../../lib/api')

                // Collect all drafted player season IDs
                const seasonIds = session.teams.flatMap(t =>
                    t.roster
                        .filter(slot => slot.isFilled && slot.playerSeasonId)
                        .map(slot => slot.playerSeasonId!)
                )

                if (seasonIds.length === 0) {
                    setLoading(false)
                    return
                }

                // Use batch API endpoint (handles batching internally)
                const data = await api.post<any[]>('/players/batch', { ids: seasonIds })

                if (data && data.length > 0) {
                    const transformedPlayers = data.map(transformPlayerSeasonData)
                    setPlayers(transformedPlayers)
                }
            } catch (err) {
                console.error('[Clubhouse] Exception loading players:', err)
                alert(`ERROR: Exception loading player data. Check console for details.`)
            } finally {
                setLoading(false)
            }
        }

        setLoading(true)
        loadDraftedPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seasonIdsCacheKey])

    // Auto-generate depth charts for teams that don't have one yet
    // Runs ONCE after player data finishes loading - uses backend API
    // Uses ref guard to prevent infinite loops from session.teams reference changes
    useEffect(() => {
        if (loading || players.length === 0) return
        if (lineupsGeneratedRef.current) return // Already generated this session

        async function generateLineups() {
            // Mark as generated BEFORE async calls to prevent re-entry
            lineupsGeneratedRef.current = true

            for (const team of session.teams) {
                // Skip teams that already have a configured depth chart
                const hasLineup = team.depthChart?.lineupVS_RHP?.some(s => s.playerSeasonId)
                if (hasLineup) continue

                try {
                    // Prepare roster data for API
                    const roster = team.roster
                        .filter(slot => slot.isFilled && slot.playerSeasonId)
                        .map(slot => ({
                            position: slot.position,
                            playerSeasonId: slot.playerSeasonId!,
                        }))

                    // Call API to generate optimal depth chart
                    const response = await api.post<{ depthChart: TeamDepthChart }>(
                        `/teams/${team.id}/auto-lineup`,
                        { roster }
                    )

                    if (response.depthChart) {
                        updateTeamDepthChart(team.id, response.depthChart)
                    }
                } catch (err) {
                    console.error('[Clubhouse] Error generating lineup for team:', team.name, err)
                }
            }
        }

        generateLineups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, players.length])

    // Validate all teams for season readiness
    const validationIssues = useMemo(() => {
        return session.teams.flatMap(validateTeamReadiness)
    }, [session.teams])

    const isSeasonReady = validationIssues.length === 0

    const handleGenerateSchedule = async () => {
        setGeneratingSchedule(true)
        setScheduleError(null)
        try {
            await generateSeasonSchedule(162)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            console.error('[Clubhouse] Schedule generation failed:', err)
            setScheduleError(message)
            alert(`ERROR: Failed to generate schedule.\n\n${message}`)
        } finally {
            setGeneratingSchedule(false)
        }
    }

    if (!selectedTeam) return null

    return (
        <div className="min-h-screen bg-cream flex flex-col">
            {/* Header */}
            <header className="bg-charcoal text-cream py-4 px-6 border-b-4 border-gold shadow-lg z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-display font-bold tracking-wider uppercase text-gold">
                            The Clubhouse
                        </h1>
                        <div className="h-6 w-px bg-white/20"></div>
                        <span className="font-serif italic text-white/60">
                            Season Prep
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleGenerateSchedule}
                            disabled={generatingSchedule || !!session.schedule}
                            className={`btn-primary ${session.schedule ? 'bg-charcoal border-charcoal text-white/50 cursor-default' : ''}`}
                        >
                            {session.schedule
                                ? `162-Game Schedule Generated`
                                : generatingSchedule
                                    ? 'Generating...'
                                    : 'Generate 162-Game Schedule'
                            }
                        </button>

                        {session.schedule && onStartSeason && (
                            <div className="relative group">
                                <button
                                    onClick={isSeasonReady ? onStartSeason : undefined}
                                    disabled={!isSeasonReady}
                                    className={`btn-primary ${isSeasonReady
                                        ? 'bg-gold text-charcoal border-gold hover:bg-gold-light animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                                        : 'bg-charcoal-light text-white/30 border-white/10 cursor-not-allowed'
                                        }`}
                                >
                                    Enter StatMaster (Play Season)
                                </button>
                                {!isSeasonReady && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-charcoal border border-gold/30 rounded-sm p-3 shadow-xl z-50 hidden group-hover:block">
                                        <p className="text-gold font-display font-bold text-xs uppercase tracking-wider mb-2">
                                            Not Ready - Missing:
                                        </p>
                                        <ul className="space-y-1">
                                            {validationIssues.map((issue, i) => (
                                                <li key={i} className="text-cream/70 text-xs font-serif">
                                                    {issue}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        {scheduleError && (
                            <span className="text-red-400 text-xs font-serif">
                                Schedule Error
                            </span>
                        )}
                        <button
                            onClick={onExit}
                            className="text-sm font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto p-6 flex gap-6 overflow-hidden">
                {/* Sidebar: Team List */}
                <aside className="w-64 flex flex-col gap-2 overflow-y-auto pr-2">
                    {session.teams.map(team => (
                        <button
                            key={team.id}
                            onClick={() => setSelectedTeamId(team.id)}
                            className={`text-left p-4 rounded-sm border transition-all ${selectedTeamId === team.id
                                ? 'bg-burgundy text-white border-burgundy shadow-md'
                                : 'bg-white text-charcoal border-charcoal/10 hover:border-burgundy/30 hover:bg-white/80'
                                }`}
                        >
                            <div className="font-display font-bold truncate">{team.name}</div>
                            <div className="text-xs opacity-70 mt-1 uppercase tracking-wide">
                                {team.control}
                            </div>
                        </button>
                    ))}
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 card flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-charcoal/10 mb-6">
                        <button
                            onClick={() => setViewMode('roster')}
                            className={`px-6 py-3 font-display font-bold text-sm tracking-widest uppercase border-b-2 transition-colors ${viewMode === 'roster'
                                ? 'border-burgundy text-burgundy'
                                : 'border-transparent text-charcoal/40 hover:text-charcoal/70'
                                }`}
                        >
                            Full Roster
                        </button>
                        <button
                            onClick={() => setViewMode('lineup')}
                            className={`px-6 py-3 font-display font-bold text-sm tracking-widest uppercase border-b-2 transition-colors ${viewMode === 'lineup'
                                ? 'border-burgundy text-burgundy'
                                : 'border-transparent text-charcoal/40 hover:text-charcoal/70'
                                }`}
                        >
                            Lineups
                        </button>
                        <button
                            onClick={() => setViewMode('rotation')}
                            className={`px-6 py-3 font-display font-bold text-sm tracking-widest uppercase border-b-2 transition-colors ${viewMode === 'rotation'
                                ? 'border-burgundy text-burgundy'
                                : 'border-transparent text-charcoal/40 hover:text-charcoal/70'
                                }`}
                        >
                            Rotation
                        </button>
                    </div>

                    {/* View Content */}
                    <div className="flex-1 overflow-y-auto">
                        {viewMode === 'roster' && (
                            <div className="h-full">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full text-charcoal/50">
                                        <div className="text-center">
                                            <div className="w-8 h-8 border-4 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="font-serif italic">Loading Clubhouse Data...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <RosterView team={selectedTeam} players={players} />
                                )}
                            </div>
                        )}

                        {viewMode === 'lineup' && (
                            <div className="h-full">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full text-charcoal/50">
                                        Loading Player Data...
                                    </div>
                                ) : (
                                    <LineupEditor team={selectedTeam} players={players} />
                                )}
                            </div>
                        )}

                        {viewMode === 'rotation' && (
                            <div className="h-full">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full text-charcoal/50">
                                        Loading Player Data...
                                    </div>
                                ) : (
                                    <RotationEditor team={selectedTeam} players={players} />
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

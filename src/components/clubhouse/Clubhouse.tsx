/**
 * Clubhouse Screen - Redesigned
 * Post-draft management interface for setting depth charts and rotations
 * Premium vintage baseball aesthetic with modal-based team selection
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DraftSession, DraftTeam } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'
import { transformPlayerSeasonData } from '../../utils/transformPlayerData'
import RosterView from '../draft/RosterView'
import LineupEditor from './LineupEditor'
import RotationEditor from './RotationEditor'
import TeamSelectorModal from './TeamSelectorModal'
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
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)

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
    // PERFORMANCE FIX: Uses Promise.allSettled for parallel execution (4-8x faster)
    useEffect(() => {
        if (loading || players.length === 0) return
        if (lineupsGeneratedRef.current) return // Already generated this session

        async function generateLineups() {
            // Mark as generated BEFORE async calls to prevent re-entry
            lineupsGeneratedRef.current = true

            // Filter teams that need lineup generation
            const teamsNeedingLineups = session.teams.filter(team => {
                const hasLineup = team.depthChart?.lineupVS_RHP?.some(s => s.playerSeasonId)
                return !hasLineup
            })

            if (teamsNeedingLineups.length === 0) {
                console.log('[Clubhouse] All teams already have lineups')
                return
            }

            console.log(`[Clubhouse] Generating lineups for ${teamsNeedingLineups.length} teams in parallel...`)
            const startTime = Date.now()

            // PERFORMANCE FIX: Generate all lineups in parallel instead of sequentially
            // This reduces load time from N*150ms to ~150ms (4-8x faster for 8 teams)
            const results = await Promise.allSettled(
                teamsNeedingLineups.map(async (team) => {
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

                    return { teamId: team.id, depthChart: response.depthChart }
                })
            )

            // Process results - update state for successful generations
            let successCount = 0
            let errorCount = 0

            results.forEach((result, index) => {
                const team = teamsNeedingLineups[index]
                if (result.status === 'fulfilled' && result.value.depthChart) {
                    updateTeamDepthChart(result.value.teamId, result.value.depthChart)
                    successCount++
                } else if (result.status === 'rejected') {
                    console.error('[Clubhouse] Error generating lineup for team:', team.name, result.reason)
                    errorCount++
                }
            })

            const elapsed = Date.now() - startTime
            console.log(`[Clubhouse] Lineup generation complete: ${successCount} succeeded, ${errorCount} failed in ${elapsed}ms`)
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
            {/* Header - Dark charcoal with gold accents */}
            <header className="bg-charcoal text-cream py-4 px-6 border-b-4 border-gold shadow-lg z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-display font-bold tracking-wider uppercase text-gold">
                            The Clubhouse
                        </h1>
                        <div className="h-6 w-px bg-white/20"></div>
                        <span className="font-serif italic text-white/60">
                            Season Prep {session.schedule ? '| 162-Game Schedule Generated' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleGenerateSchedule}
                            disabled={generatingSchedule || !!session.schedule}
                            className={`btn-primary ${session.schedule ? 'bg-charcoal border-charcoal text-white/50 cursor-default' : ''}`}
                        >
                            {session.schedule
                                ? 'Schedule Ready'
                                : generatingSchedule
                                    ? 'Generating...'
                                    : 'Generate Schedule'
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

            {/* Main Content - Full width centered card */}
            <div className="flex-1 container mx-auto p-6 flex justify-center overflow-hidden">
                <main className="w-full max-w-7xl bg-white border border-charcoal/10 rounded-sm shadow-lift flex flex-col overflow-hidden">
                    {/* Official Roster Header */}
                    <div className="bg-gradient-to-b from-cream to-white px-8 py-6 border-b border-charcoal/10 text-center">
                        <h2 className="font-display font-bold text-2xl tracking-[0.2em] uppercase text-charcoal mb-3">
                            Official Roster
                        </h2>

                        {/* Team Selector Dropdown */}
                        <button
                            onClick={() => setIsTeamModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-charcoal/20 rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all group"
                        >
                            <span className="font-display font-bold text-lg text-charcoal group-hover:text-burgundy transition-colors">
                                {selectedTeam.name}
                            </span>
                            <ChevronDown
                                size={20}
                                className="text-charcoal/50 group-hover:text-burgundy transition-colors"
                            />
                        </button>

                        {/* Division Badge */}
                        {selectedTeam.league && selectedTeam.division && (
                            <div className="mt-2 text-xs font-sans tracking-widest uppercase text-charcoal/50">
                                {selectedTeam.league} {selectedTeam.division} Division
                            </div>
                        )}
                    </div>

                    {/* Decorative border */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent"></div>

                    {/* View Tabs */}
                    <div className="flex border-b border-charcoal/10 bg-cream-light">
                        <button
                            onClick={() => setViewMode('roster')}
                            className={`flex-1 px-6 py-4 font-display font-bold text-sm tracking-widest uppercase border-b-2 transition-all ${viewMode === 'roster'
                                ? 'border-burgundy text-burgundy bg-white'
                                : 'border-transparent text-charcoal/40 hover:text-charcoal/70 hover:bg-white/50'
                                }`}
                        >
                            Full Roster
                        </button>
                        <button
                            onClick={() => setViewMode('lineup')}
                            className={`flex-1 px-6 py-4 font-display font-bold text-sm tracking-widest uppercase border-b-2 transition-all ${viewMode === 'lineup'
                                ? 'border-burgundy text-burgundy bg-white'
                                : 'border-transparent text-charcoal/40 hover:text-charcoal/70 hover:bg-white/50'
                                }`}
                        >
                            Lineups
                        </button>
                        <button
                            onClick={() => setViewMode('rotation')}
                            className={`flex-1 px-6 py-4 font-display font-bold text-sm tracking-widest uppercase border-b-2 transition-all ${viewMode === 'rotation'
                                ? 'border-burgundy text-burgundy bg-white'
                                : 'border-transparent text-charcoal/40 hover:text-charcoal/70 hover:bg-white/50'
                                }`}
                        >
                            Rotation & Bullpen
                        </button>
                    </div>

                    {/* View Content */}
                    <div className="flex-1 overflow-y-auto bg-white">
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
                                        <div className="text-center">
                                            <div className="w-8 h-8 border-4 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="font-serif italic">Loading Player Data...</p>
                                        </div>
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
                                        <div className="text-center">
                                            <div className="w-8 h-8 border-4 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="font-serif italic">Loading Player Data...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <RotationEditor team={selectedTeam} players={players} />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-cream-light border-t border-charcoal/10 flex justify-between items-center">
                        <span className="text-xs font-serif italic text-charcoal/50">
                            {selectedTeam.roster.filter(s => s.isFilled).length} / 21 roster spots filled
                        </span>
                        <span className="text-xs font-sans uppercase tracking-widest text-charcoal/40">
                            {selectedTeam.control === 'human' ? 'Your Team' : 'CPU Managed'}
                        </span>
                    </div>
                </main>
            </div>

            {/* Team Selector Modal */}
            <TeamSelectorModal
                teams={session.teams}
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
                onClose={() => setIsTeamModalOpen(false)}
                isOpen={isTeamModalOpen}
            />
        </div>
    )
}

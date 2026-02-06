/**
 * StatMaster Screen
 * Main interface for season simulation and stat tracking
 */

import { useState, useEffect, useRef } from 'react'
import type { DraftSession, DraftTeam, LeagueType } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'
import { useDraftStore } from '../../stores/draftStore'
import { simulateGames, getTeamRecord, getNextGame, type BoxScore } from '../../utils/statMaster'
import { accumulateBoxScore, createEmptySessionStats } from '../../utils/simulationStats'
import { calculateStandings } from '../../utils/scheduleGenerator'
import { transformPlayerSeasonData } from '../../utils/transformPlayerData'
import { selectAllStarRosters, simulateAllStarGame, findAllStarGame } from '../../utils/allStarGame'
import type { AllStarRoster } from '../../utils/allStarGame'
import type { ScheduledGame } from '../../types/schedule.types'
import LeagueLeaders from './LeagueLeaders'
import TeamStatsDetail from './TeamStatsDetail'

type StatMasterView = 'overview' | 'leaders' | 'team-detail'

interface Props {
    session: DraftSession
    onExit: () => void
}

export default function StatMaster({ session, onExit }: Props) {
    const { session: storeSession } = useDraftStore()
    const [players, setPlayers] = useState<PlayerSeason[]>([])
    const [loading, setLoading] = useState(true)
    const [simulating, setSimulating] = useState(false)
    const [allStarRosters, setAllStarRosters] = useState<{ home: AllStarRoster; away: AllStarRoster } | null>(null)
    const [allStarResult, setAllStarResult] = useState<{ homeScore: number; awayScore: number } | null>(null)
    const [selectedLeague, setSelectedLeague] = useState<LeagueType>('AL')
    const [currentView, setCurrentView] = useState<StatMasterView>('overview')
    const [selectedTeam, setSelectedTeam] = useState<DraftTeam | null>(null)
    const loadedRef = useRef(false)

    // Use store session to get latest schedule updates
    const currentSession = storeSession || session

    useEffect(() => {
        async function loadPlayers() {
            if (loadedRef.current) return
            loadedRef.current = true

            try {
                const seasonIds = currentSession.teams.flatMap(t =>
                    t.roster
                        .filter(slot => slot.isFilled && slot.playerSeasonId)
                        .map(slot => slot.playerSeasonId!)
                )

                if (seasonIds.length === 0) {
                    setLoading(false)
                    return
                }

                // Use backend API to fetch player data
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
                const response = await fetch(`${apiUrl}/api/players/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: seasonIds })
                })

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`)
                }

                const data = await response.json()

                if (data && data.length > 0) {
                    const transformedPlayers = data.map(transformPlayerSeasonData)
                    setPlayers(transformedPlayers)
                }
            } catch (err) {
                console.error('[StatMaster] Exception loading players:', err)
            } finally {
                setLoading(false)
            }
        }

        loadPlayers()
    }, [currentSession.teams])

    const schedule = currentSession.schedule
    const standings = schedule ? calculateStandings(schedule, currentSession.teams) : []
    const nextGame = schedule ? getNextGame(schedule.games) : null
    const allStarGame = schedule ? findAllStarGame(schedule.games) : null
    const isNextGameAllStar = nextGame?.isAllStarGame === true
    const gamesPlayed = schedule?.games.filter((g: ScheduledGame) => g.result && !g.isAllStarGame).length || 0
    const totalGames = schedule?.games.filter((g: ScheduledGame) => !g.isAllStarGame).length || 0

    const updateScheduleInStore = (updatedGames: ScheduledGame[], gamesSimmed: number, boxScores?: BoxScore[]) => {
        const store = useDraftStore.getState()
        if (store.session && schedule) {
            // Accumulate simulation stats from box scores
            let simulationStats = store.session.simulationStats || createEmptySessionStats()

            if (boxScores && boxScores.length > 0) {
                for (const boxScore of boxScores) {
                    // Find the matching game to get the result with pitcher decisions
                    const matchingGame = updatedGames.find(g => g.id === boxScore.gameId)
                    accumulateBoxScore(simulationStats, boxScore, matchingGame?.result)
                }
            }

            const updatedSession = {
                ...store.session,
                schedule: {
                    ...schedule,
                    games: updatedGames,
                    currentGameIndex: schedule.currentGameIndex + gamesSimmed
                },
                simulationStats,
                updatedAt: new Date()
            }
            useDraftStore.setState({ session: updatedSession })
        }
    }

    const handleSimulateGame = async () => {
        if (!schedule || simulating) return
        setSimulating(true)

        const { games: updatedGames, boxScores } = simulateGames(
            schedule.games,
            currentSession.teams,
            players,
            1
        )

        updateScheduleInStore(updatedGames, 1, boxScores)
        setSimulating(false)
    }

    const handleSimulateWeek = async () => {
        if (!schedule || simulating) return
        setSimulating(true)

        const { games: updatedGames, boxScores } = simulateGames(
            schedule.games,
            currentSession.teams,
            players,
            7
        )

        updateScheduleInStore(updatedGames, boxScores.length, boxScores)
        setSimulating(false)
    }

    const handleSimulateSeason = async () => {
        if (!schedule || simulating) return
        setSimulating(true)

        let currentGames = [...schedule.games]

        // Check if All-Star game is next and not played - auto-play it
        const unplayedAllStar = currentGames.find(g => g.isAllStarGame && !g.result)
        if (unplayedAllStar) {
            // Auto-play All-Star game
            const { homeSquad, awaySquad } = selectAllStarRosters(currentSession.teams, players)
            setAllStarRosters({ home: homeSquad, away: awaySquad })

            const result = simulateAllStarGame(homeSquad, awaySquad)
            setAllStarResult({ homeScore: result.homeScore, awayScore: result.awayScore })

            // Update the All-Star Game in current games
            currentGames = currentGames.map((g: ScheduledGame) =>
                g.isAllStarGame ? { ...g, result } : g
            )
        }

        // Calculate remaining regular games
        const remainingCount = currentGames.filter(
            (g: ScheduledGame) => !g.result && !g.isAllStarGame
        ).length

        if (remainingCount === 0) {
            // Even if no regular games left, update store with All-Star result if played
            if (unplayedAllStar) {
                updateScheduleInStore(currentGames, 1)
            }
            setSimulating(false)
            return
        }

        // Simulate all remaining regular games in batches to avoid UI freeze
        let totalBoxScores: BoxScore[] = []
        let gamesSimulated = 0
        const batchSize = 20 // Simulate 20 games at a time

        while (gamesSimulated < remainingCount) {
            const toSimulate = Math.min(batchSize, remainingCount - gamesSimulated)
            const { games: updatedGames, boxScores } = simulateGames(
                currentGames,
                currentSession.teams,
                players,
                toSimulate
            )
            currentGames = updatedGames
            totalBoxScores = [...totalBoxScores, ...boxScores]
            gamesSimulated += boxScores.length

            // Update store periodically to show progress
            if (gamesSimulated % 50 === 0 || gamesSimulated >= remainingCount) {
                updateScheduleInStore(currentGames, gamesSimulated, totalBoxScores)
            }
        }

        // Final update
        updateScheduleInStore(currentGames, gamesSimulated, totalBoxScores)
        setSimulating(false)
    }

    const handleResetSeason = () => {
        if (!schedule || simulating) return

        const store = useDraftStore.getState()
        if (!store.session) return

        // Clear all game results
        const resetGames = schedule.games.map((g: ScheduledGame) => ({
            ...g,
            result: undefined
        }))

        // Reset the schedule and simulation stats
        const updatedSession = {
            ...store.session,
            schedule: {
                ...schedule,
                games: resetGames,
                currentGameIndex: 0
            },
            simulationStats: createEmptySessionStats(),
            updatedAt: new Date()
        }

        useDraftStore.setState({ session: updatedSession })

        // Reset local state
        setAllStarRosters(null)
        setAllStarResult(null)
    }

    // Check if season is complete
    const isSeasonComplete = schedule
        ? schedule.games.filter((g: ScheduledGame) => !g.result && !g.isAllStarGame).length === 0
        : false

    const handleAllStarGame = () => {
        if (!schedule || simulating || !allStarGame || allStarGame.result) return
        setSimulating(true)

        // Select rosters
        const { homeSquad, awaySquad } = selectAllStarRosters(currentSession.teams, players)
        setAllStarRosters({ home: homeSquad, away: awaySquad })

        // Simulate
        const result = simulateAllStarGame(homeSquad, awaySquad)
        setAllStarResult({ homeScore: result.homeScore, awayScore: result.awayScore })

        // Update the All-Star Game in the schedule
        const updatedGames = schedule.games.map((g: ScheduledGame) =>
            g.isAllStarGame ? { ...g, result } : g
        )
        updateScheduleInStore(updatedGames, 1)

        // console.log(`[StatMaster] All-Star Game: ${awaySquad.squadName} ${result.awayScore} @ ${homeSquad.squadName} ${result.homeScore}`)
        setSimulating(false)
    }

    const handleTeamClick = (teamId: string) => {
        const team = currentSession.teams.find(t => t.id === teamId)
        if (team) {
            setSelectedTeam(team)
            setCurrentView('team-detail')
        }
    }

    const handleBackToOverview = () => {
        setSelectedTeam(null)
        setCurrentView('overview')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-serif italic text-charcoal/60">Loading StatMaster...</p>
                </div>
            </div>
        )
    }

    if (!schedule) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-display font-bold text-charcoal mb-4">No Schedule Found</h2>
                    <p className="text-charcoal/60 mb-6">Generate a schedule from the Clubhouse first.</p>
                    <button onClick={onExit} className="btn-primary">
                        Return to Clubhouse
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-cream flex flex-col">
            {/* Header */}
            <header className="bg-charcoal text-cream border-b-4 border-gold shadow-lg">
                <div className="container mx-auto">
                    {/* Top Row */}
                    <div className="flex justify-between items-center py-4 px-6">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-display font-bold tracking-wider uppercase text-gold">
                                StatMaster
                            </h1>
                            <div className="h-6 w-px bg-white/20"></div>
                            <span className="font-serif italic text-white/60">
                                {gamesPlayed} / {totalGames} Games Played
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleSimulateGame}
                                disabled={simulating || gamesPlayed >= totalGames || isNextGameAllStar}
                                className="btn-primary"
                            >
                                {simulating ? 'Simulating...' : 'Sim Next Game'}
                            </button>
                            <button
                                onClick={handleSimulateWeek}
                                disabled={simulating || gamesPlayed >= totalGames || isNextGameAllStar}
                                className="btn-secondary-dark"
                            >
                                Sim Week
                            </button>
                            <button
                                onClick={handleSimulateSeason}
                                disabled={simulating || gamesPlayed >= totalGames}
                                className="btn-secondary-dark"
                            >
                                {simulating ? 'Simulating...' : 'Sim Season'}
                            </button>
                            {isSeasonComplete && (
                                <button
                                    onClick={handleResetSeason}
                                    disabled={simulating}
                                    className="bg-gold text-charcoal font-display font-bold text-sm uppercase tracking-widest px-4 py-2 rounded-sm hover:bg-gold/90 transition-colors"
                                >
                                    Reset Season
                                </button>
                            )}
                            <button
                                onClick={onExit}
                                className="text-sm font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                    {/* View Tabs */}
                    <div className="flex gap-1 px-6 pb-2">
                        <button
                            onClick={() => { setCurrentView('overview'); setSelectedTeam(null); }}
                            className={`px-4 py-2 font-display font-bold text-sm uppercase tracking-wider rounded-t transition-colors ${
                                currentView === 'overview'
                                    ? 'bg-cream text-burgundy'
                                    : 'bg-charcoal-light text-white/60 hover:text-white hover:bg-charcoal-light/80'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => { setCurrentView('leaders'); setSelectedTeam(null); }}
                            className={`px-4 py-2 font-display font-bold text-sm uppercase tracking-wider rounded-t transition-colors ${
                                currentView === 'leaders'
                                    ? 'bg-cream text-burgundy'
                                    : 'bg-charcoal-light text-white/60 hover:text-white hover:bg-charcoal-light/80'
                            }`}
                        >
                            League Leaders
                        </button>
                        {selectedTeam && (
                            <button
                                className="px-4 py-2 font-display font-bold text-sm uppercase tracking-wider rounded-t bg-cream text-burgundy"
                            >
                                {selectedTeam.name}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto p-6 flex gap-6 overflow-hidden">
                {/* Standings */}
                <div className="w-96 flex flex-col bg-white border border-charcoal/10 rounded-sm overflow-hidden">
                    <div className="bg-charcoal p-4">
                        <h2 className="font-display font-bold text-gold text-lg uppercase tracking-widest text-center">
                            Standings
                        </h2>
                    </div>
                    {/* League Tabs */}
                    <div className="flex border-b border-charcoal/10">
                        <button
                            onClick={() => setSelectedLeague('AL')}
                            className={`flex-1 py-2 font-display font-bold text-sm uppercase tracking-wider transition-colors ${
                                selectedLeague === 'AL'
                                    ? 'bg-burgundy text-white'
                                    : 'bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10'
                            }`}
                        >
                            American
                        </button>
                        <button
                            onClick={() => setSelectedLeague('NL')}
                            className={`flex-1 py-2 font-display font-bold text-sm uppercase tracking-wider transition-colors ${
                                selectedLeague === 'NL'
                                    ? 'bg-burgundy text-white'
                                    : 'bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10'
                            }`}
                        >
                            National
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {/* Render divisions for selected league */}
                        {(['East', 'West', 'North', 'South'] as const).map(division => {
                            const divisionStandings = standings.filter(
                                s => s.league === selectedLeague && s.division === division
                            )
                            if (divisionStandings.length === 0) return null

                            return (
                                <div key={`${selectedLeague}-${division}`} className="mb-2">
                                    <div className="bg-charcoal/10 px-3 py-1.5 font-display font-bold text-xs uppercase tracking-widest text-charcoal/70">
                                        {selectedLeague} {division}
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="bg-charcoal/5">
                                            <tr>
                                                <th className="text-left p-2 font-display text-charcoal/50 text-xs">Team</th>
                                                <th className="text-center p-2 font-display text-charcoal/50 text-xs w-10">W</th>
                                                <th className="text-center p-2 font-display text-charcoal/50 text-xs w-10">L</th>
                                                <th className="text-center p-2 font-display text-charcoal/50 text-xs w-12">PCT</th>
                                                <th className="text-center p-2 font-display text-charcoal/50 text-xs w-10">GB</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {divisionStandings.map((standing) => (
                                                <tr key={standing.teamId} className="border-b border-charcoal/5 hover:bg-charcoal/5">
                                                    <td
                                                        className="p-2 font-display font-bold text-charcoal truncate max-w-[140px] cursor-pointer hover:text-burgundy transition-colors"
                                                        title={standing.teamName}
                                                        onClick={() => handleTeamClick(standing.teamId)}
                                                    >
                                                        {standing.teamName}
                                                    </td>
                                                    <td className="p-2 text-center font-mono text-green-600 text-xs">{standing.wins}</td>
                                                    <td className="p-2 text-center font-mono text-red-600 text-xs">{standing.losses}</td>
                                                    <td className="p-2 text-center font-mono text-xs">
                                                        {standing.winPct.toFixed(3).slice(1)}
                                                    </td>
                                                    <td className="p-2 text-center font-mono text-charcoal/50 text-xs">
                                                        {standing.gamesBack === 0 ? '-' : standing.gamesBack.toFixed(1)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })}
                        {/* Fallback for teams without divisions */}
                        {standings.filter(s => !s.league || !s.division).length > 0 && (
                            <div className="mb-2">
                                <div className="bg-charcoal/10 px-3 py-1.5 font-display font-bold text-xs uppercase tracking-widest text-charcoal/70">
                                    Unassigned
                                </div>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {standings.filter(s => !s.league || !s.division).map((standing) => (
                                            <tr key={standing.teamId} className="border-b border-charcoal/5 hover:bg-charcoal/5">
                                                <td
                                                    className="p-2 font-display font-bold text-charcoal truncate max-w-[140px] cursor-pointer hover:text-burgundy transition-colors"
                                                    onClick={() => handleTeamClick(standing.teamId)}
                                                >
                                                    {standing.teamName}
                                                </td>
                                                <td className="p-2 text-center font-mono text-green-600 text-xs">{standing.wins}</td>
                                                <td className="p-2 text-center font-mono text-red-600 text-xs">{standing.losses}</td>
                                                <td className="p-2 text-center font-mono text-xs">
                                                    {standing.winPct.toFixed(3).slice(1)}
                                                </td>
                                                <td className="p-2 text-center font-mono text-charcoal/50 text-xs">
                                                    {standing.gamesBack === 0 ? '-' : standing.gamesBack.toFixed(1)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                    {/* Team Detail View */}
                    {currentView === 'team-detail' && selectedTeam && (
                        <div className="bg-white border border-charcoal/10 rounded-sm p-6">
                            <TeamStatsDetail
                                team={selectedTeam}
                                players={players}
                                simulationStats={currentSession.simulationStats}
                                onBack={handleBackToOverview}
                            />
                        </div>
                    )}

                    {/* League Leaders View */}
                    {currentView === 'leaders' && (
                        <div className="bg-white border border-charcoal/10 rounded-sm p-6">
                            <LeagueLeaders
                                players={players}
                                simulationStats={currentSession.simulationStats}
                                onPlayerClick={(player) => {
                                    // Find the team that has this player and show team detail
                                    const teamWithPlayer = currentSession.teams.find(t =>
                                        t.roster.some(slot => slot.playerSeasonId === player.id)
                                    )
                                    if (teamWithPlayer) {
                                        handleTeamClick(teamWithPlayer.id)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Overview View */}
                    {currentView === 'overview' && (
                        <>
                    {/* All-Star Game Preview */}
                    {isNextGameAllStar && !allStarGame?.result && (
                        <div className="bg-gradient-to-r from-blue-900 via-charcoal to-red-900 border-2 border-gold rounded-sm p-6 text-white">
                            <div className="text-xs font-sans font-bold text-gold uppercase tracking-widest mb-4 text-center">
                                Mid-Season All-Star Game
                            </div>
                            <div className="flex items-center justify-center gap-8 mb-4">
                                <div className="text-center">
                                    <div className="text-2xl font-display font-bold text-gold">
                                        Stars
                                    </div>
                                    <div className="text-sm text-white/50 mt-1">Top performers</div>
                                </div>
                                <div className="text-4xl font-display text-gold/50">vs</div>
                                <div className="text-center">
                                    <div className="text-2xl font-display font-bold text-gold">
                                        Legends
                                    </div>
                                    <div className="text-sm text-white/50 mt-1">Top performers</div>
                                </div>
                            </div>
                            <div className="text-center">
                                <button
                                    onClick={handleAllStarGame}
                                    disabled={simulating}
                                    className="px-8 py-3 bg-gold text-charcoal font-display font-bold uppercase tracking-widest rounded-sm hover:bg-gold-light transition-colors shadow-lg"
                                >
                                    {simulating ? 'Simulating...' : 'Play All-Star Game'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* All-Star Game Result */}
                    {allStarResult && allStarRosters && (
                        <div className="bg-gradient-to-r from-blue-900 via-charcoal to-red-900 border-2 border-gold rounded-sm p-6 text-white">
                            <div className="text-xs font-sans font-bold text-gold uppercase tracking-widest mb-4 text-center">
                                All-Star Game Final
                            </div>
                            <div className="flex items-center justify-center gap-8">
                                <div className="text-center">
                                    <div className="text-2xl font-display font-bold text-gold">{allStarRosters.away.squadName}</div>
                                    <div className={`text-4xl font-display font-bold mt-2 ${allStarResult.awayScore > allStarResult.homeScore ? 'text-gold' : 'text-white/50'}`}>
                                        {allStarResult.awayScore}
                                    </div>
                                </div>
                                <div className="text-2xl font-display text-gold/30">-</div>
                                <div className="text-center">
                                    <div className="text-2xl font-display font-bold text-gold">{allStarRosters.home.squadName}</div>
                                    <div className={`text-4xl font-display font-bold mt-2 ${allStarResult.homeScore > allStarResult.awayScore ? 'text-gold' : 'text-white/50'}`}>
                                        {allStarResult.homeScore}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Next Game Preview (regular games) */}
                    {nextGame && !isNextGameAllStar && (
                        <div className="bg-white border-2 border-charcoal/20 rounded-sm p-6">
                            <div className="text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-4">
                                Next Game
                            </div>
                            <div className="flex items-center justify-center gap-8">
                                <div className="text-center">
                                    <div className="text-2xl font-display font-bold text-charcoal">
                                        {currentSession.teams.find(t => t.id === nextGame.awayTeamId)?.name || 'Away'}
                                    </div>
                                    <div className="text-sm text-charcoal/50 mt-1">
                                        {(() => {
                                            const rec = getTeamRecord(schedule.games, nextGame.awayTeamId)
                                            return `${rec.wins}-${rec.losses}`
                                        })()}
                                    </div>
                                </div>
                                <div className="text-4xl font-display text-charcoal/30">@</div>
                                <div className="text-center">
                                    <div className="text-2xl font-display font-bold text-charcoal">
                                        {currentSession.teams.find(t => t.id === nextGame.homeTeamId)?.name || 'Home'}
                                    </div>
                                    <div className="text-sm text-charcoal/50 mt-1">
                                        {(() => {
                                            const rec = getTeamRecord(schedule.games, nextGame.homeTeamId)
                                            return `${rec.wins}-${rec.losses}`
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Games */}
                    <div className="flex-1 bg-white border border-charcoal/10 rounded-sm overflow-hidden flex flex-col">
                        <div className="bg-charcoal/5 p-4 border-b border-charcoal/10">
                            <h3 className="font-display font-bold text-charcoal text-sm uppercase tracking-wide">
                                Recent Results
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {schedule.games
                                .filter((g: ScheduledGame) => g.result)
                                .slice(-10)
                                .reverse()
                                .map((game: ScheduledGame) => {
                                    const isASG = game.isAllStarGame
                                    const homeName = isASG ? 'Stars' : (currentSession.teams.find(t => t.id === game.homeTeamId)?.name || 'Home')
                                    const awayName = isASG ? 'Legends' : (currentSession.teams.find(t => t.id === game.awayTeamId)?.name || 'Away')
                                    const homeWon = game.result!.homeScore > game.result!.awayScore

                                    return (
                                        <div key={game.id} className={`flex items-center py-2 border-b border-charcoal/5 last:border-0 ${isASG ? 'bg-gold/10' : ''}`}>
                                            <div className="flex-1">
                                                <span className={`font-display ${!homeWon ? 'font-bold' : 'text-charcoal/60'} ${isASG ? 'text-burgundy' : ''}`}>
                                                    {awayName}
                                                </span>
                                                {isASG && <span className="ml-2 text-xs font-sans text-gold-dark font-bold uppercase">ASG</span>}
                                            </div>
                                            <div className="w-16 text-center">
                                                <span className={`font-mono text-lg ${!homeWon ? 'text-green-600 font-bold' : 'text-charcoal/60'}`}>
                                                    {game.result!.awayScore}
                                                </span>
                                                <span className="mx-2 text-charcoal/30">-</span>
                                                <span className={`font-mono text-lg ${homeWon ? 'text-green-600 font-bold' : 'text-charcoal/60'}`}>
                                                    {game.result!.homeScore}
                                                </span>
                                            </div>
                                            <div className="flex-1 text-right">
                                                <span className={`font-display ${homeWon ? 'font-bold' : 'text-charcoal/60'} ${isASG ? 'text-burgundy' : ''}`}>
                                                    {homeName}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            {gamesPlayed === 0 && (
                                <div className="text-center text-charcoal/40 font-serif italic py-8">
                                    No games played yet. Click "Sim Next Game" to start!
                                </div>
                            )}
                        </div>
                    </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

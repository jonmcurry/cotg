/**
 * StatMaster Screen
 * Main interface for season simulation and stat tracking
 */

import { useState, useEffect, useRef } from 'react'
import type { DraftSession } from '../../types/draft.types'
import type { PlayerSeason } from '../../utils/cpuDraftLogic'
import { useDraftStore } from '../../stores/draftStore'
import { simulateGames, getTeamRecord, getNextGame } from '../../utils/statMaster'
import { calculateStandings } from '../../utils/scheduleGenerator'
import { transformPlayerSeasonData } from '../../utils/transformPlayerData'
import { selectAllStarRosters, simulateAllStarGame, findAllStarGame } from '../../utils/allStarGame'
import type { AllStarRoster } from '../../utils/allStarGame'
import type { ScheduledGame } from '../../types/schedule.types'

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
    const loadedRef = useRef(false)

    // Use store session to get latest schedule updates
    const currentSession = storeSession || session

    useEffect(() => {
        async function loadPlayers() {
            if (loadedRef.current) return
            loadedRef.current = true

            try {
                const { supabase } = await import('../../lib/supabaseClient')

                const seasonIds = currentSession.teams.flatMap(t =>
                    t.roster
                        .filter(slot => slot.isFilled && slot.playerSeasonId)
                        .map(slot => slot.playerSeasonId!)
                )

                if (seasonIds.length === 0) {
                    setLoading(false)
                    return
                }

                // Batch queries to avoid PostgREST URL length limits
                // With 32 teams × 21 rounds = 672 UUIDs, a single .in() exceeds the ~8KB URL limit
                const BATCH_SIZE = 100
                const allData: any[] = []

                for (let i = 0; i < seasonIds.length; i += BATCH_SIZE) {
                    const batch = seasonIds.slice(i, i + BATCH_SIZE)
                    const { data, error } = await supabase
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
                        .in('id', batch)

                    if (error) {
                        console.error('[StatMaster] Error loading players batch:', error)
                        return
                    }

                    if (data) {
                        allData.push(...data)
                    }
                }

                if (allData.length > 0) {
                    const transformedPlayers = allData.map(transformPlayerSeasonData)
                    setPlayers(transformedPlayers)
                    console.log(`[StatMaster] Loaded ${transformedPlayers.length} players in ${Math.ceil(seasonIds.length / BATCH_SIZE)} batches`)
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

    const updateScheduleInStore = (updatedGames: ScheduledGame[], gamesSimmed: number) => {
        const store = useDraftStore.getState()
        if (store.session && schedule) {
            const updatedSession = {
                ...store.session,
                schedule: {
                    ...schedule,
                    games: updatedGames,
                    currentGameIndex: schedule.currentGameIndex + gamesSimmed
                },
                updatedAt: new Date()
            }
            useDraftStore.setState({ session: updatedSession })
        }
    }

    const handleSimulateGame = async () => {
        if (!schedule || simulating) return
        setSimulating(true)

        const updatedGames = simulateGames(
            schedule.games,
            currentSession.teams,
            players,
            1
        )

        updateScheduleInStore(updatedGames, 1)
        setSimulating(false)
    }

    const handleSimulateWeek = async () => {
        if (!schedule || simulating) return
        setSimulating(true)

        const updatedGames = simulateGames(
            schedule.games,
            currentSession.teams,
            players,
            7
        )

        updateScheduleInStore(updatedGames, 7)
        setSimulating(false)
    }

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

        console.log(`[StatMaster] All-Star Game: ${awaySquad.squadName} ${result.awayScore} @ ${homeSquad.squadName} ${result.homeScore}`)
        setSimulating(false)
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
            <header className="bg-charcoal text-cream py-4 px-6 border-b-4 border-gold shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
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
                            onClick={onExit}
                            className="text-sm font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                        >
                            Exit
                        </button>
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
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-charcoal/5 sticky top-0">
                                <tr>
                                    <th className="text-left p-3 font-display text-charcoal/70">#</th>
                                    <th className="text-left p-3 font-display text-charcoal/70">Team</th>
                                    <th className="text-center p-3 font-display text-charcoal/70">W</th>
                                    <th className="text-center p-3 font-display text-charcoal/70">L</th>
                                    <th className="text-center p-3 font-display text-charcoal/70">PCT</th>
                                    <th className="text-center p-3 font-display text-charcoal/70">GB</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((standing, idx) => (
                                    <tr key={standing.teamId} className="border-b border-charcoal/5 hover:bg-charcoal/5">
                                        <td className="p-3 font-mono text-charcoal/50">{idx + 1}</td>
                                        <td className="p-3 font-display font-bold text-charcoal truncate max-w-[120px]">
                                            {standing.teamName}
                                        </td>
                                        <td className="p-3 text-center font-mono text-green-600">{standing.wins}</td>
                                        <td className="p-3 text-center font-mono text-red-600">{standing.losses}</td>
                                        <td className="p-3 text-center font-mono">
                                            {standing.winPct.toFixed(3).slice(1)}
                                        </td>
                                        <td className="p-3 text-center font-mono text-charcoal/50">
                                            {standing.gamesBack === 0 ? '-' : standing.gamesBack.toFixed(1)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6">
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
                </div>
            </div>
        </div>
    )
}

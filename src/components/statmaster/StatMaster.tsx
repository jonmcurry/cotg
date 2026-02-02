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
                    .in('id', seasonIds)

                if (error) {
                    console.error('[StatMaster] Error loading players:', error)
                    return
                }

                if (data) {
                    const transformedPlayers = data.map((p: any) => ({
                        id: p.id,
                        player_id: p.player_id,
                        year: p.year,
                        team_id: p.team_id,
                        primary_position: p.primary_position,
                        apba_rating: p.apba_rating,
                        war: p.war,
                        at_bats: p.at_bats !== null ? Number(p.at_bats) : null,
                        batting_avg: p.batting_avg,
                        hits: p.hits,
                        home_runs: p.home_runs,
                        rbi: p.rbi,
                        stolen_bases: p.stolen_bases,
                        on_base_pct: p.on_base_pct,
                        slugging_pct: p.slugging_pct,
                        innings_pitched_outs: p.innings_pitched_outs !== null ? Number(p.innings_pitched_outs) : null,
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
                        bats: p.players.bats,
                    }))
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
    const gamesPlayed = schedule?.games.filter((g: ScheduledGame) => g.result).length || 0
    const totalGames = schedule?.games.length || 0

    const handleSimulateGame = async () => {
        if (!schedule || simulating) return

        setSimulating(true)

        // Dynamic import to avoid issues
        const updatedGames = simulateGames(
            schedule.games,
            currentSession.teams,
            players,
            1
        )

        // Update schedule in store
        const store = useDraftStore.getState()
        if (store.session) {
            const updatedSession = {
                ...store.session,
                schedule: {
                    ...schedule,
                    games: updatedGames,
                    currentGameIndex: schedule.currentGameIndex + 1
                },
                updatedAt: new Date()
            }
            useDraftStore.setState({ session: updatedSession })
        }

        setSimulating(false)
    }

    const handleSimulateWeek = async () => {
        if (!schedule || simulating) return

        setSimulating(true)

        const updatedGames = simulateGames(
            schedule.games,
            currentSession.teams,
            players,
            7 // Simulate 7 games
        )

        const store = useDraftStore.getState()
        if (store.session) {
            const updatedSession = {
                ...store.session,
                schedule: {
                    ...schedule,
                    games: updatedGames,
                    currentGameIndex: schedule.currentGameIndex + 7
                },
                updatedAt: new Date()
            }
            useDraftStore.setState({ session: updatedSession })
        }

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
                            disabled={simulating || gamesPlayed >= totalGames}
                            className="btn-primary"
                        >
                            {simulating ? 'Simulating...' : 'Sim Next Game'}
                        </button>
                        <button
                            onClick={handleSimulateWeek}
                            disabled={simulating || gamesPlayed >= totalGames}
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
                    {/* Next Game Preview */}
                    {nextGame && (
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
                                    const homeTeam = currentSession.teams.find(t => t.id === game.homeTeamId)
                                    const awayTeam = currentSession.teams.find(t => t.id === game.awayTeamId)
                                    const homeWon = game.result!.homeScore > game.result!.awayScore

                                    return (
                                        <div key={game.id} className="flex items-center py-2 border-b border-charcoal/5 last:border-0">
                                            <div className="flex-1">
                                                <span className={`font-display ${!homeWon ? 'font-bold' : 'text-charcoal/60'}`}>
                                                    {awayTeam?.name}
                                                </span>
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
                                                <span className={`font-display ${homeWon ? 'font-bold' : 'text-charcoal/60'}`}>
                                                    {homeTeam?.name}
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

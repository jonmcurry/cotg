/**
 * Schedule System Type Definitions
 */

export interface ScheduledGame {
    id: string
    gameNumber: number
    homeTeamId: string
    awayTeamId: string
    date: Date
    seriesId: string
    gameInSeries: number
    isAllStarBreak?: boolean
    isAllStarGame?: boolean
    result?: GameResult
}

export interface GameResult {
    homeScore: number
    awayScore: number
    winningPitcherId?: string
    losingPitcherId?: string
    savePitcherId?: string
    innings?: number
}

export interface SeasonSchedule {
    id: string
    sessionId: string
    games: ScheduledGame[]
    allStarGameDate: Date
    seasonStartDate: Date
    seasonEndDate: Date
    totalGamesPerTeam: number
    currentGameIndex: number // Track which game to sim next
}

export interface TeamStanding {
    teamId: string
    teamName: string
    wins: number
    losses: number
    winPct: number
    gamesBack: number
    runsScored: number
    runsAllowed: number
    runDifferential: number
    homeRecord: { wins: number; losses: number }
    awayRecord: { wins: number; losses: number }
    streak: number
    last10: { wins: number; losses: number }
}

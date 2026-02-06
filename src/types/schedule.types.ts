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
    league?: 'AL' | 'NL'
    division?: 'East' | 'West' | 'North' | 'South'
}

/**
 * Individual player simulation stats (accumulated from simulated games)
 */
export interface PlayerSimulationStats {
    playerSeasonId: string
    displayName: string
    teamId: string
    gamesPlayed: number

    // Batting
    atBats: number
    hits: number
    doubles: number
    triples: number
    homeRuns: number
    rbi: number
    runs: number
    walks: number
    strikeouts: number
    stolenBases: number

    // Pitching
    inningsPitchedOuts: number // in outs (3 per inning)
    earnedRuns: number
    strikeoutsThrown: number
    walksAllowed: number
    hitsAllowed: number
    wins: number
    losses: number
    saves: number

    // Calculated (derived from above)
    battingAvg?: number
    onBasePct?: number
    sluggingPct?: number
    era?: number
    whip?: number
}

/**
 * Session-level simulation stats storage
 */
export interface SessionSimulationStats {
    playerStats: Map<string, PlayerSimulationStats>
    lastUpdated: Date
}

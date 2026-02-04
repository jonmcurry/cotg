/**
 * CPU Draft API Routes
 * Server-side CPU draft logic for calculating and executing CPU picks
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// Types matching frontend
type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'
type TeamControl = 'human' | 'cpu'

interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string
  apba_rating: number | null
  war: number | null
  at_bats: number | null
  batting_avg: number | null
  hits: number | null
  home_runs: number | null
  rbi: number | null
  stolen_bases: number | null
  on_base_pct: number | null
  slugging_pct: number | null
  innings_pitched_outs: number | null
  wins: number | null
  losses: number | null
  era: number | null
  strikeouts_pitched: number | null
  saves: number | null
  shutouts: number | null
  whip: number | null
  display_name?: string
  first_name?: string
  last_name?: string
  bats?: 'L' | 'R' | 'B' | null
}

interface RosterSlot {
  position: PositionCode
  slotNumber: number
  playerSeasonId: string | null
  isFilled: boolean
  playerBats?: 'L' | 'R' | 'B' | null
}

interface DraftTeam {
  id: string
  name: string
  control: TeamControl
  draftPosition: number
  roster: RosterSlot[]
  draftSessionId: string
}

// Roster requirements from SRD 3.5
const ROSTER_REQUIREMENTS: Record<PositionCode, number> = {
  'C': 1, '1B': 1, '2B': 1, 'SS': 1, '3B': 1,
  'OF': 3, 'SP': 4, 'RP': 3, 'CL': 1, 'DH': 1, 'BN': 4,
}

const TOTAL_ROUNDS = 21

// Position eligibility mapping
const POSITION_ELIGIBILITY: Record<PositionCode, string[]> = {
  'C': ['C'],
  '1B': ['1B'],
  '2B': ['2B'],
  'SS': ['SS'],
  '3B': ['3B'],
  'OF': ['OF', 'LF', 'CF', 'RF'],
  'SP': ['P', 'SP'],
  'RP': ['P', 'RP'],
  'CL': ['P', 'RP', 'CL'],
  'DH': ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'P', 'SP', 'RP', 'CL', 'DH'],
  'BN': ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'DH'],
}

// Position scarcity weights
const POSITION_SCARCITY: Record<PositionCode, number> = {
  'C': 1.6, 'SS': 1.5, 'OF': 1.3, '2B': 1.2, '3B': 1.2,
  '1B': 1.1, 'SP': 1.15, 'CL': 0.8, 'DH': 0.7, 'RP': 0.6, 'BN': 0.5,
}

// Create roster slots for a team
function createRosterSlots(): RosterSlot[] {
  const roster: RosterSlot[] = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, count]) => {
    for (let i = 0; i < count; i++) {
      roster.push({
        position: position as PositionCode,
        slotNumber: i + 1,
        playerSeasonId: null,
        isFilled: false,
      })
    }
  })
  return roster
}

// Adjust position scarcity by draft round
function adjustScarcityByRound(baseWeight: number, currentRound: number): number {
  if (currentRound <= 5) return baseWeight * 0.8
  if (currentRound <= 15) return baseWeight
  return baseWeight * 1.2
}

// Round-based position type preference
function getPositionTypeBonus(position: PositionCode, currentRound: number): number {
  const isHitterSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(position)
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(position)

  if (currentRound <= 5) {
    if (isHitterSlot) return 1.25
    if (isPitcherSlot) return 0.75
  }
  if (currentRound <= 10) return 1.0
  if (isPitcherSlot) return 1.15
  if (isHitterSlot) return 0.85
  return 1.0
}

// Calculate volume multiplier based on playing time
function calculateVolumeMultiplier(player: PlayerSeason, position: PositionCode): number {
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(position)

  if (isPitcherSlot) {
    const outs = player.innings_pitched_outs || 0
    if (outs > 600) return 1.15
    if (outs > 450) return 1.1
    if (outs < 180) return 0.8
    return 1.0
  }

  const atBats = player.at_bats || 0
  if (atBats > 450) return 1.15
  return 1.0
}

// Get unfilled positions for a team
function getUnfilledPositions(team: DraftTeam): PositionCode[] {
  const unfilled: PositionCode[] = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, required]) => {
    const posCode = position as PositionCode
    const filled = team.roster.filter(slot => slot.position === posCode && slot.isFilled).length
    if (filled < required) {
      for (let i = 0; i < required - filled; i++) {
        unfilled.push(posCode)
      }
    }
  })
  return unfilled
}

// Check if player qualifies for a position
function playerQualifiesForPosition(playerPosition: string, rosterPosition: PositionCode): boolean {
  const eligiblePositions = POSITION_ELIGIBILITY[rosterPosition] || []
  // Case-insensitive comparison to handle database variations (SS vs ss vs Ss)
  const normalizedPlayerPosition = playerPosition.toUpperCase()
  return eligiblePositions.some(pos => pos.toUpperCase() === normalizedPlayerPosition)
}

// Check playing time requirements
function meetsPlayingTimeRequirements(player: PlayerSeason, rosterPosition: PositionCode): boolean {
  const atBats = player.at_bats || 0
  const inningsPitchedOuts = player.innings_pitched_outs || 0

  const isPositionPlayerSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(rosterPosition)
  if (isPositionPlayerSlot) return atBats >= 200

  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(rosterPosition)
  if (isPitcherSlot) return inningsPitchedOuts >= 90

  if (rosterPosition === 'BN') return atBats >= 200
  return atBats >= 200 || inningsPitchedOuts >= 90
}

// Calculate weighted score for a player
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,
  randomizationFactor: number = 0.1,
  scarcityWeight?: number,
  currentRound: number = 1
): number {
  const rating = player.apba_rating || 0
  const effectiveScarcityWeight = scarcityWeight ?? (POSITION_SCARCITY[position] || 1.0)

  let platoonBonus = 1.0
  if (position !== 'SP' && position !== 'RP' && position !== 'CL') {
    const filledRoster = team.roster.filter(s => s.isFilled)
    const existingLefties = filledRoster.filter(s => s.playerBats === 'L').length
    const existingRighties = filledRoster.filter(s => s.playerBats === 'R').length

    if (player.bats === 'L' && existingLefties < existingRighties) {
      platoonBonus = 1.05
    } else if (player.bats === 'R' && existingRighties < existingLefties) {
      platoonBonus = 1.05
    } else if (player.bats === 'B') {
      platoonBonus = 1.10
    }
  }

  const volumeMultiplier = calculateVolumeMultiplier(player, position)
  const posTypeBonus = getPositionTypeBonus(position, currentRound)
  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  return rating * effectiveScarcityWeight * volumeMultiplier * platoonBonus * posTypeBonus * randomness
}

// Select best available player for CPU team
function selectBestPlayer(
  availablePlayers: PlayerSeason[],
  team: DraftTeam,
  draftedPlayerIds: Set<string>,
  excludePlayerSeasonIds: Set<string> = new Set(),
  currentRound: number = 1
): { player: PlayerSeason; position: PositionCode; slotNumber: number } | null {
  console.log('[selectBestPlayer] Starting selection:', {
    totalPlayers: availablePlayers.length,
    draftedCount: draftedPlayerIds.size,
    excludedCount: excludePlayerSeasonIds.size,
    teamId: team.id,
    round: currentRound
  })

  // FIXED Issue #6: Filter out both drafted players and blacklisted player seasons
  const undraftedPlayers = availablePlayers.filter(p =>
    !draftedPlayerIds.has(p.player_id) &&
    !excludePlayerSeasonIds.has(p.id)
  )

  console.log('[selectBestPlayer] After filtering:', {
    undraftedCount: undraftedPlayers.length
  })

  if (undraftedPlayers.length === 0) {
    console.error('[selectBestPlayer] FAIL: No undrafted players available')
    return null
  }

  const unfilledPositions = getUnfilledPositions(team)
  const uniqueUnfilledPositions = [...new Set(unfilledPositions)]

  console.log('[selectBestPlayer] Unfilled positions:', {
    positions: uniqueUnfilledPositions,
    count: uniqueUnfilledPositions.length
  })

  if (uniqueUnfilledPositions.length === 0) {
    const benchSlotsAvailable = team.roster.filter(slot => slot.position === 'BN' && !slot.isFilled).length
    console.log('[selectBestPlayer] No unfilled positions, checking bench:', {
      benchSlots: benchSlotsAvailable
    })
    if (benchSlotsAvailable > 0) {
      uniqueUnfilledPositions.push('BN')
    } else {
      console.error('[selectBestPlayer] FAIL: No unfilled positions and no bench slots')
      return null
    }
  }

  interface ScoredCandidate {
    player: PlayerSeason
    position: PositionCode
    score: number
  }

  const allScoredCandidates: ScoredCandidate[] = []

  for (const position of uniqueUnfilledPositions) {
    const baseWeight = POSITION_SCARCITY[position] || 1.0
    const adjustedWeight = adjustScarcityByRound(baseWeight, currentRound)

    const eligible = undraftedPlayers.filter(player =>
      playerQualifiesForPosition(player.primary_position, position) &&
      meetsPlayingTimeRequirements(player, position)
    )

    console.log(`[selectBestPlayer] Position ${position}:`, {
      eligibleCount: eligible.length,
      weight: adjustedWeight
    })

    if (eligible.length === 0) continue

    for (const player of eligible) {
      const score = calculateWeightedScore(player, position, team, 0.1, adjustedWeight, currentRound)
      allScoredCandidates.push({ player, position, score })
    }
  }

  console.log('[selectBestPlayer] Total candidates:', {
    candidateCount: allScoredCandidates.length
  })

  if (allScoredCandidates.length === 0) {
    console.log('[selectBestPlayer] No candidates found, trying bench positions')
    if (!uniqueUnfilledPositions.includes('BN')) {
      const benchSlotsAvailable = team.roster.filter(slot => slot.position === 'BN' && !slot.isFilled).length
      console.log('[selectBestPlayer] Bench slots available:', benchSlotsAvailable)
      if (benchSlotsAvailable > 0) {
        const benchWeight = adjustScarcityByRound(POSITION_SCARCITY['BN'] || 0.5, currentRound)
        const benchCandidates = undraftedPlayers.filter(player => meetsPlayingTimeRequirements(player, 'BN'))
        console.log('[selectBestPlayer] Bench candidates after playing time filter:', benchCandidates.length)
        for (const player of benchCandidates) {
          const score = calculateWeightedScore(player, 'BN', team, 0.1, benchWeight, currentRound)
          allScoredCandidates.push({ player, position: 'BN', score })
        }
      }
    }
    if (allScoredCandidates.length === 0) {
      console.error('[selectBestPlayer] FAIL: No candidates found after all filtering')
      return null
    }
  }

  allScoredCandidates.sort((a, b) => b.score - a.score)

  const topCount = Math.min(5, allScoredCandidates.length)
  const topCandidates = allScoredCandidates.slice(0, topCount)
  const selectedIndex = Math.floor(Math.random() * topCandidates.length)
  const selected = topCandidates[selectedIndex]

  if (!selected) return null

  const availableSlot = team.roster.find(slot => slot.position === selected.position && !slot.isFilled)
  if (!availableSlot) {
    console.error(`[CPU API] No available slot found for position: ${selected.position}`)
    return null
  }

  return {
    player: selected.player,
    position: selected.position,
    slotNumber: availableSlot.slotNumber,
  }
}

// Transform database row to PlayerSeason
function transformPlayerRow(row: any): PlayerSeason {
  return {
    id: row.id,
    player_id: row.player_id,
    year: row.year,
    team_id: row.team_id,
    primary_position: row.primary_position,
    apba_rating: row.apba_rating,
    war: row.war,
    at_bats: Number(row.at_bats) || 0,
    batting_avg: row.batting_avg,
    hits: row.hits,
    home_runs: row.home_runs,
    rbi: row.rbi,
    stolen_bases: row.stolen_bases,
    on_base_pct: row.on_base_pct,
    slugging_pct: row.slugging_pct,
    innings_pitched_outs: Number(row.innings_pitched_outs) || 0,
    wins: row.wins,
    losses: row.losses,
    era: row.era,
    strikeouts_pitched: row.strikeouts_pitched,
    saves: row.saves,
    shutouts: row.shutouts,
    whip: row.whip,
    display_name: row.players?.display_name,
    first_name: row.players?.first_name,
    last_name: row.players?.last_name,
    bats: row.players?.bats,
  }
}

/**
 * POST /api/draft/sessions/:sessionId/cpu-pick
 * Calculate and execute a CPU draft pick
 *
 * Request body:
 *   - seasons: number[] (optional, defaults to current year)
 *
 * Returns:
 *   - result: 'success' | 'not_cpu_turn' | 'draft_complete' | 'error'
 *   - pick?: { pickNumber, round, teamId, playerSeasonId, playerId, position, slotNumber, playerName, year }
 *   - session?: { currentPick, currentRound, status }
 */
router.post('/:sessionId/cpu-pick', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    // FIXED Issue #6: Accept excludePlayerSeasonIds to prevent infinite retry loop
    const { seasons, excludePlayerSeasonIds = [] } = req.body

    console.log('[CPU API] Received request:', {
      sessionId,
      seasons,
      seasonsType: typeof seasons,
      seasonsLength: seasons?.length,
      excludedCount: excludePlayerSeasonIds.length
    })

    // Load session
    const { data: session, error: sessionError } = await supabase
      .from('draft_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({ result: 'error', error: `Session not found: ${sessionId}` })
    }

    // Check if draft is in progress
    if (session.status !== 'in_progress') {
      return res.json({ result: 'error', error: `Draft is not in progress (status: ${session.status})` })
    }

    // Load teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('draft_teams')
      .select('*')
      .eq('draft_session_id', sessionId)
      .order('draft_order')

    if (teamsError || !teamsData || teamsData.length === 0) {
      return res.status(500).json({ result: 'error', error: 'Failed to load teams' })
    }

    // Calculate current picking team (snake draft)
    const round = session.current_round
    const pickInRound = ((session.current_pick_number - 1) % session.num_teams) + 1
    const sortedTeams = round % 2 === 0
      ? [...teamsData].sort((a, b) => b.draft_order - a.draft_order)
      : [...teamsData].sort((a, b) => a.draft_order - b.draft_order)

    const currentTeamData = sortedTeams[pickInRound - 1]
    if (!currentTeamData) {
      return res.status(500).json({ result: 'error', error: 'Could not determine current picking team' })
    }

    // Check if it's a CPU team's turn
    if (currentTeamData.control !== 'cpu') {
      return res.json({ result: 'not_cpu_turn', teamId: currentTeamData.id, teamName: currentTeamData.team_name })
    }

    // Load existing picks to build roster and dedup sets
    const { data: picksData, error: picksError } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('draft_session_id', sessionId)

    if (picksError) {
      return res.status(500).json({ result: 'error', error: 'Failed to load picks' })
    }

    // Build team rosters from picks
    const teams: DraftTeam[] = teamsData.map(t => ({
      id: t.id,
      name: t.team_name,
      control: t.control as TeamControl,
      draftPosition: t.draft_order,
      roster: createRosterSlots(),
      draftSessionId: sessionId,
    }))

    // Build deduplication sets and fill rosters
    const draftedPlayerIds = new Set<string>()
    const draftedSeasonIds = new Set<string>()

    for (const pick of (picksData || [])) {
      if (pick.player_season_id) {
        draftedSeasonIds.add(pick.player_season_id)
      }
      if (pick.player_id) {
        draftedPlayerIds.add(pick.player_id)
      }

      // Fill roster slot for the team using position and slot_number
      const team = teams.find(t => t.id === pick.draft_team_id)
      if (team && pick.player_season_id && pick.position && pick.slot_number) {
        const rosterSlot = team.roster.find(
          s => s.position === pick.position && s.slotNumber === pick.slot_number
        )
        if (rosterSlot) {
          rosterSlot.playerSeasonId = pick.player_season_id
          rosterSlot.isFilled = true
        }
      }
    }

    const currentTeam = teams.find(t => t.id === currentTeamData.id)
    if (!currentTeam) {
      return res.status(500).json({ result: 'error', error: 'Could not find current team' })
    }

    // Load available players (top undrafted by APBA rating)
    // Use seasons from request or default to session's year
    const yearList = seasons && seasons.length > 0
      ? seasons
      : [session.season_year || new Date().getFullYear()]

    console.log('[CPU API] Loading player pool:', {
      requestSeasons: seasons,
      sessionSeasonYear: session.season_year,
      sessionSelectedSeasons: session.selected_seasons,
      finalYearList: yearList
    })

    // DIAGNOSTIC: Warn if seasons array is suspicious
    if (!seasons || seasons.length === 0) {
      console.warn('[CPU API] WARNING: No seasons provided in request, falling back to single season!')
      console.warn('[CPU API] This may indicate selectedSeasons not loaded from database correctly')
      console.warn('[CPU API] Session selected_seasons from DB:', session.selected_seasons)
    }

    // FIXED: Remove pool size limits - ONLY change from original
    // Original logic restored: 200 AB for hitters, 90 IP for pitchers
    // CPU can now search ALL available players instead of top 600/400
    const { data: hittersData, error: hittersError } = await supabase
      .from('player_seasons')
      .select(`
        id, player_id, year, team_id, primary_position, apba_rating, war,
        at_bats, batting_avg, hits, home_runs, rbi, stolen_bases,
        on_base_pct, slugging_pct, innings_pitched_outs, wins, losses,
        era, strikeouts_pitched, saves, shutouts, whip,
        players!inner (display_name, first_name, last_name, bats)
      `)
      .in('year', yearList)
      .gte('at_bats', 200)
      .order('apba_rating', { ascending: false, nullsFirst: false })
      // Removed .limit(600) - this is the ONLY change

    const { data: pitchersData, error: pitchersError } = await supabase
      .from('player_seasons')
      .select(`
        id, player_id, year, team_id, primary_position, apba_rating, war,
        at_bats, batting_avg, hits, home_runs, rbi, stolen_bases,
        on_base_pct, slugging_pct, innings_pitched_outs, wins, losses,
        era, strikeouts_pitched, saves, shutouts, whip,
        players!inner (display_name, first_name, last_name, bats)
      `)
      .in('year', yearList)
      .gte('innings_pitched_outs', 90)
      .lt('at_bats', 200)
      .order('apba_rating', { ascending: false, nullsFirst: false })
      // Removed .limit(400) - this is the ONLY change

    if (hittersError || pitchersError) {
      console.error('[CPU API] Error loading players:', hittersError || pitchersError)
      return res.status(500).json({ result: 'error', error: 'Failed to load player pool' })
    }

    const allPlayers = [
      ...(hittersData || []).map(transformPlayerRow),
      ...(pitchersData || []).map(transformPlayerRow),
    ]

    if (allPlayers.length === 0) {
      return res.status(500).json({ result: 'error', error: 'No players available in pool' })
    }

    console.log('[CPU API] Player pool loaded:', {
      totalPlayers: allPlayers.length,
      draftedPlayers: draftedPlayerIds.size,
      excludedPlayers: excludePlayerSeasonIds.length,
      currentTeam: currentTeam.name,
      round,
      pickNumber: session.current_pick_number
    })

    // Run CPU selection algorithm
    // FIXED Issue #6: Pass excludePlayerSeasonIds to prevent duplicate retries
    const excludeSet = new Set<string>(excludePlayerSeasonIds)
    const selection = selectBestPlayer(allPlayers, currentTeam, draftedPlayerIds, excludeSet, round)

    if (!selection) {
      console.error('[CPU API] FAILED TO SELECT PLAYER - Diagnostic info:', {
        playerPoolSize: allPlayers.length,
        draftedCount: draftedPlayerIds.size,
        excludedCount: excludeSet.size,
        availableAfterFilter: allPlayers.filter(p => !draftedPlayerIds.has(p.player_id) && !excludeSet.has(p.id)).length,
        teamRoster: currentTeam.roster.map(s => ({
          position: s.position,
          slotNumber: s.slotNumber,
          filled: s.isFilled,
          playerSeasonId: s.playerSeasonId
        }))
      })
      return res.json({ result: 'error', error: 'CPU could not find a player to draft' })
    }

    // Make the pick (upsert for idempotency)
    const { error: pickError } = await supabase
      .from('draft_picks')
      .upsert({
        draft_session_id: sessionId,
        draft_team_id: currentTeam.id,
        player_id: selection.player.player_id,
        player_season_id: selection.player.id,
        pick_number: session.current_pick_number,
        round: round,
        pick_in_round: pickInRound,
        position: selection.position,
        slot_number: selection.slotNumber,
      }, {
        onConflict: 'draft_session_id,pick_number',
      })

    if (pickError) {
      if (pickError.code === '23505' && pickError.message?.includes('player_season_id')) {
        console.warn('[CPU API] DUPLICATE PLAYER:', selection.player.id)
        return res.status(409).json({
          result: 'duplicate',
          error: 'Player already drafted in this session',
          playerSeasonId: selection.player.id,
        })
      }
      console.error('[CPU API] Error saving pick:', pickError)
      return res.status(500).json({ result: 'error', error: pickError.message })
    }

    // Calculate next pick
    const totalPicks = session.num_teams * TOTAL_ROUNDS
    const nextPickNumber = session.current_pick_number + 1
    const isComplete = nextPickNumber > totalPicks
    const nextRound = isComplete ? round : Math.floor((nextPickNumber - 1) / session.num_teams) + 1
    const newStatus = isComplete ? 'completed' : session.status

    // Update session
    const { error: updateError } = await supabase
      .from('draft_sessions')
      .update({
        current_pick_number: nextPickNumber,
        current_round: nextRound,
        status: newStatus,
      })
      .eq('id', sessionId)

    // FIXED Issue #7: Return error if session update fails after pick saved
    if (updateError) {
      console.error('[CPU API] CRITICAL: Pick saved but session update failed!', {
        sessionId,
        pickNumber: session.current_pick_number,
        updateError,
      })
      return res.status(500).json({
        result: 'error',
        error: 'Pick was saved but draft status could not be updated. Please refresh and verify state.',
      })
    }

    console.log('[CPU API] CPU pick made:', {
      session: sessionId,
      pick: session.current_pick_number,
      team: currentTeam.name,
      player: selection.player.display_name,
      position: selection.position,
    })

    return res.status(201).json({
      result: 'success',
      pick: {
        pickNumber: session.current_pick_number,
        round,
        pickInRound,
        teamId: currentTeam.id,
        playerSeasonId: selection.player.id,
        playerId: selection.player.player_id,
        position: selection.position,
        slotNumber: selection.slotNumber,
        playerName: selection.player.display_name || 'Unknown',
        year: selection.player.year,
        bats: selection.player.bats,
      },
      session: {
        currentPick: nextPickNumber,
        currentRound: nextRound,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('[CPU API] Exception:', err)
    return res.status(500).json({ result: 'error', error: 'Internal server error' })
  }
})

export default router

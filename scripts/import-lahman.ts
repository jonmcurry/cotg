/**
 * Lahman Database Import Script
 *
 * Imports complete Lahman baseball database (1871-2025) into Supabase:
 * - ~20,000 players from People.csv
 * - ~200,000 player-seasons from Batting.csv, Pitching.csv, Fielding.csv
 * - Team history from Teams.csv
 * - Calculates Bill James statistics
 *
 * Usage: npm run import:lahman
 *
 * Performance: Batch imports of 1,000 records at a time
 * Estimated time: 5-10 minutes
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'
import {
  calculateBattingMetrics,
  calculatePitchingMetrics,
  calculateFieldingMetrics,
} from '../src/utils/billJamesFormulas'

// Load environment variables
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const LAHMAN_DIR = join(process.cwd(), 'data_files', 'lahman_1871-2025_csv')
const BATCH_SIZE = 1000

interface ImportStats {
  players: number
  teams: number
  playerSeasons: number
  errors: number
  startTime: number
}

const stats: ImportStats = {
  players: 0,
  teams: 0,
  playerSeasons: 0,
  errors: 0,
  startTime: Date.now(),
}

/**
 * Parse CSV file into array of objects
 */
function parseCSV(filePath: string): any[] {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'))
    const rows: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const row: any = {}

      headers.forEach((header, index) => {
        let value = values[index]?.trim() || null

        // Remove surrounding quotes
        if (value && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1)
        }

        // Convert empty strings to null
        row[header] = value === '' ? null : value
      })

      rows.push(row)
    }

    return rows
  } catch (error: any) {
    console.error(`❌ Error parsing ${filePath}:`, error.message)
    return []
  }
}

/**
 * Import players from People.csv
 */
async function importPlayers(): Promise<Map<string, string>> {
  console.log('\n📄 Importing Players (People.csv)...')

  const filePath = join(LAHMAN_DIR, 'People.csv')
  const peopleData = parseCSV(filePath)

  if (peopleData.length === 0) {
    console.error('❌ No data found in People.csv')
    return new Map()
  }

  console.log(`   Found ${peopleData.length} players`)

  const playerMap = new Map<string, string>() // lahmanID -> uuid

  // Process in batches
  for (let i = 0; i < peopleData.length; i += BATCH_SIZE) {
    const batch = peopleData.slice(i, i + BATCH_SIZE)

    const players = batch.map(row => ({
      lahman_id: row.playerID,
      lahman_numeric_id: row.ID ? parseInt(row.ID) : null,
      bbref_id: row.bbrefID,
      retro_id: row.retroID,

      first_name: row.nameFirst,
      last_name: row.nameLast,
      name_given: row.nameGiven,

      birth_year: row.birthYear ? parseInt(row.birthYear) : null,
      birth_month: row.birthMonth ? parseInt(row.birthMonth) : null,
      birth_day: row.birthDay ? parseInt(row.birthDay) : null,
      birth_city: row.birthCity,
      birth_state: row.birthState,
      birth_country: row.birthCountry,

      death_year: row.deathYear ? parseInt(row.deathYear) : null,
      death_month: row.deathMonth ? parseInt(row.deathMonth) : null,
      death_day: row.deathDay ? parseInt(row.deathDay) : null,
      death_city: row.deathCity,
      death_state: row.deathState,
      death_country: row.deathCountry,

      weight: row.weight ? parseInt(row.weight) : null,
      height: row.height ? parseInt(row.height) : null,
      bats: row.bats,
      throws: row.throws,

      debut_date: row.debut || null,
      final_game_date: row.finalGame || null,
      debut_year: row.debut ? parseInt(row.debut.split('-')[0]) : null,
      final_year: row.finalGame ? parseInt(row.finalGame.split('-')[0]) : null,
    }))

    const { data, error } = await supabase.from('players').insert(players).select('id, lahman_id')

    if (error) {
      console.error(`   ❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message)
      stats.errors++
    } else if (data) {
      stats.players += data.length

      // Build player map (lahmanID -> uuid)
      data.forEach(player => {
        playerMap.set(player.lahman_id, player.id)
      })

      process.stdout.write(`\r   ✅ Imported ${stats.players}/${peopleData.length} players`)
    }
  }

  console.log(`\n   ✅ Players import complete: ${stats.players} records\n`)
  return playerMap
}

/**
 * Import teams from Teams.csv
 */
async function importTeams(): Promise<Map<string, string>> {
  console.log('📄 Importing Teams (Teams.csv)...')

  const filePath = join(LAHMAN_DIR, 'Teams.csv')
  const teamsData = parseCSV(filePath)

  if (teamsData.length === 0) {
    console.error('❌ No data found in Teams.csv')
    return new Map()
  }

  console.log(`   Found ${teamsData.length} team-seasons`)

  const teamMap = new Map<string, string>() // teamID_year -> uuid

  // Process in batches
  for (let i = 0; i < teamsData.length; i += BATCH_SIZE) {
    const batch = teamsData.slice(i, i + BATCH_SIZE)

    const teams = batch.map(row => ({
      team_id: row.teamID,
      year: parseInt(row.yearID),
      league_id: row.lgID,
      franchise_id: row.franchID,
      division: row.divID,
      team_name: row.name,
      park_name: row.park,

      wins: row.W ? parseInt(row.W) : null,
      losses: row.L ? parseInt(row.L) : null,
      rank: row.Rank ? parseInt(row.Rank) : null,
    }))

    const { data, error } = await supabase.from('teams_history').insert(teams).select('id, team_id, year')

    if (error) {
      console.error(`   ❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message)
      stats.errors++
    } else if (data) {
      stats.teams += data.length

      // Build team map (teamID_year -> uuid)
      data.forEach(team => {
        teamMap.set(`${team.team_id}_${team.year}`, team.id)
      })

      process.stdout.write(`\r   ✅ Imported ${stats.teams}/${teamsData.length} team-seasons`)
    }
  }

  console.log(`\n   ✅ Teams import complete: ${stats.teams} records\n`)
  return teamMap
}

/**
 * Import player seasons from Batting.csv, Pitching.csv, Fielding.csv
 */
async function importPlayerSeasons(
  playerMap: Map<string, string>,
  teamMap: Map<string, string>
): Promise<void> {
  console.log('📄 Importing Player Seasons...')

  // Load all three CSV files
  const battingData = parseCSV(join(LAHMAN_DIR, 'Batting.csv'))
  const pitchingData = parseCSV(join(LAHMAN_DIR, 'Pitching.csv'))
  const fieldingData = parseCSV(join(LAHMAN_DIR, 'Fielding.csv'))

  console.log(`   Batting: ${battingData.length} records`)
  console.log(`   Pitching: ${pitchingData.length} records`)
  console.log(`   Fielding: ${fieldingData.length} records`)

  // Group by player-year-stint
  const seasonsMap = new Map<string, any>()

  // Process batting data
  battingData.forEach(row => {
    const key = `${row.playerID}_${row.yearID}_${row.stint || 1}`
    const playerId = playerMap.get(row.playerID)

    if (!playerId) return // Player not found

    const year = parseInt(row.yearID)
    if (year < 1901 || year > 2025) return // Only import 1901-2025

    const teamKey = `${row.teamID}_${row.yearID}`
    const teamHistoryId = teamMap.get(teamKey)

    seasonsMap.set(key, {
      player_id: playerId,
      team_history_id: teamHistoryId || null,
      year,
      stint: parseInt(row.stint || '1'),
      team_id: row.teamID,
      league_id: row.lgID,
      primary_position: null, // Will be filled from fielding

      // Batting stats
      games: parseInt(row.G || '0'),
      at_bats: parseInt(row.AB || '0'),
      runs: parseInt(row.R || '0'),
      hits: parseInt(row.H || '0'),
      doubles: parseInt(row['2B'] || '0'),
      triples: parseInt(row['3B'] || '0'),
      home_runs: parseInt(row.HR || '0'),
      rbi: parseInt(row.RBI || '0'),
      stolen_bases: parseInt(row.SB || '0'),
      caught_stealing: parseInt(row.CS || '0'),
      walks: parseInt(row.BB || '0'),
      strikeouts: parseInt(row.SO || '0'),
      intentional_walks: parseInt(row.IBB || '0'),
      hit_by_pitch: parseInt(row.HBP || '0'),
      sacrifice_hits: parseInt(row.SH || '0'),
      sacrifice_flies: parseInt(row.SF || '0'),
      grounded_into_double_play: parseInt(row.GIDP || '0'),

      // Initialize pitching/fielding to 0
      wins: 0,
      losses: 0,
      games_pitched: 0,
      games_started_pitcher: 0,
      complete_games: 0,
      shutouts: 0,
      saves: 0,
      innings_pitched_outs: 0,
      hits_allowed: 0,
      runs_allowed: 0,
      earned_runs: 0,
      home_runs_allowed: 0,
      walks_allowed: 0,
      strikeouts_pitched: 0,
      intentional_walks_allowed: 0,
      hit_batters: 0,
      wild_pitches: 0,
      balks: 0,
      batters_faced: 0,

      putouts: 0,
      assists: 0,
      errors: 0,
      double_plays: 0,
      passed_balls: 0,
      innings_fielded_outs: null,

      is_primary_season: parseInt(row.stint || '1') === 1,
    })
  })

  // Add pitching data
  pitchingData.forEach(row => {
    const key = `${row.playerID}_${row.yearID}_${row.stint || 1}`
    const year = parseInt(row.yearID)

    if (year < 1901 || year > 2025) return

    const season = seasonsMap.get(key)
    if (season) {
      // Update existing season
      season.wins = parseInt(row.W || '0')
      season.losses = parseInt(row.L || '0')
      season.games_pitched = parseInt(row.G || '0')
      season.games_started_pitcher = parseInt(row.GS || '0')
      season.complete_games = parseInt(row.CG || '0')
      season.shutouts = parseInt(row.SHO || '0')
      season.saves = parseInt(row.SV || '0')
      season.innings_pitched_outs = parseInt(row.IPouts || '0')
      season.hits_allowed = parseInt(row.H || '0')
      season.runs_allowed = parseInt(row.R || '0')
      season.earned_runs = parseInt(row.ER || '0')
      season.home_runs_allowed = parseInt(row.HR || '0')
      season.walks_allowed = parseInt(row.BB || '0')
      season.strikeouts_pitched = parseInt(row.SO || '0')
      season.intentional_walks_allowed = parseInt(row.IBB || '0')
      season.hit_batters = parseInt(row.HBP || '0')
      season.wild_pitches = parseInt(row.WP || '0')
      season.balks = parseInt(row.BK || '0')
      season.batters_faced = parseInt(row.BFP || '0')
    } else {
      // Pitcher-only season
      const playerId = playerMap.get(row.playerID)
      if (!playerId) return

      const teamKey = `${row.teamID}_${row.yearID}`
      const teamHistoryId = teamMap.get(teamKey)

      seasonsMap.set(key, {
        player_id: playerId,
        team_history_id: teamHistoryId || null,
        year,
        stint: parseInt(row.stint || '1'),
        team_id: row.teamID,
        league_id: row.lgID,
        primary_position: 'P',

        games: parseInt(row.G || '0'),
        at_bats: 0,
        runs: 0,
        hits: 0,
        doubles: 0,
        triples: 0,
        home_runs: 0,
        rbi: 0,
        stolen_bases: 0,
        caught_stealing: 0,
        walks: 0,
        strikeouts: 0,
        intentional_walks: 0,
        hit_by_pitch: 0,
        sacrifice_hits: 0,
        sacrifice_flies: 0,
        grounded_into_double_play: 0,

        wins: parseInt(row.W || '0'),
        losses: parseInt(row.L || '0'),
        games_pitched: parseInt(row.G || '0'),
        games_started_pitcher: parseInt(row.GS || '0'),
        complete_games: parseInt(row.CG || '0'),
        shutouts: parseInt(row.SHO || '0'),
        saves: parseInt(row.SV || '0'),
        innings_pitched_outs: parseInt(row.IPouts || '0'),
        hits_allowed: parseInt(row.H || '0'),
        runs_allowed: parseInt(row.R || '0'),
        earned_runs: parseInt(row.ER || '0'),
        home_runs_allowed: parseInt(row.HR || '0'),
        walks_allowed: parseInt(row.BB || '0'),
        strikeouts_pitched: parseInt(row.SO || '0'),
        intentional_walks_allowed: parseInt(row.IBB || '0'),
        hit_batters: parseInt(row.HBP || '0'),
        wild_pitches: parseInt(row.WP || '0'),
        balks: parseInt(row.BK || '0'),
        batters_faced: parseInt(row.BFP || '0'),

        putouts: 0,
        assists: 0,
        errors: 0,
        double_plays: 0,
        passed_balls: 0,
        innings_fielded_outs: null,

        is_primary_season: parseInt(row.stint || '1') === 1,
      })
    }
  })

  // Add fielding data (aggregate from multiple positions)
  fieldingData.forEach(row => {
    const key = `${row.playerID}_${row.yearID}_${row.stint || 1}`
    const year = parseInt(row.yearID)

    if (year < 1901 || year > 2025) return

    const season = seasonsMap.get(key)
    if (season) {
      season.putouts += parseInt(row.PO || '0')
      season.assists += parseInt(row.A || '0')
      season.errors += parseInt(row.E || '0')
      season.double_plays += parseInt(row.DP || '0')

      if (row.POS === 'C') {
        season.passed_balls += parseInt(row.PB || '0')
      }

      // Set primary position (first position encountered)
      if (!season.primary_position) {
        season.primary_position = row.POS
      }

      // Aggregate innings fielded
      const innOuts = parseInt(row.InnOuts || '0')
      if (innOuts > 0) {
        season.innings_fielded_outs = (season.innings_fielded_outs || 0) + innOuts
      }
    }
  })

  // Calculate derived stats and Bill James metrics
  console.log('   📊 Calculating statistics...')

  const seasons = Array.from(seasonsMap.values())

  seasons.forEach(season => {
    // Batting stats
    if (season.at_bats > 0) {
      season.batting_avg = season.hits / season.at_bats
      season.total_bases =
        season.hits +
        season.doubles +
        2 * season.triples +
        3 * season.home_runs
      season.slugging_pct = season.total_bases / season.at_bats

      const obpDenom =
        season.at_bats +
        season.walks +
        season.hit_by_pitch +
        season.sacrifice_flies
      if (obpDenom > 0) {
        season.on_base_pct =
          (season.hits + season.walks + season.hit_by_pitch) / obpDenom
        season.ops = season.on_base_pct + season.slugging_pct
      }

      // Bill James batting metrics
      try {
        const metrics = calculateBattingMetrics({
          H: season.hits,
          BB: season.walks,
          TB: season.total_bases,
          AB: season.at_bats,
          SB: season.stolen_bases,
          CS: season.caught_stealing,
          HBP: season.hit_by_pitch,
          GIDP: season.grounded_into_double_play,
          IBB: season.intentional_walks,
          SH: season.sacrifice_hits,
          SF: season.sacrifice_flies,
          HR: season.home_runs,
        })

        season.runs_created_basic = metrics.runsCreatedBasic
        season.runs_created_advanced = metrics.runsCreatedAdvanced
        season.isolated_power = metrics.isolatedPower
        season.secondary_avg = metrics.secondaryAverage
        season.power_speed_number = metrics.powerSpeedNumber
      } catch (e) {
        // Ignore calculation errors
      }
    }

    // Pitching stats
    if (season.innings_pitched_outs > 0) {
      season.innings_pitched = season.innings_pitched_outs / 3

      // ERA
      if (season.innings_pitched > 0) {
        season.era = (9 * season.earned_runs) / season.innings_pitched
        season.whip =
          (season.hits_allowed + season.walks_allowed) / season.innings_pitched
        season.k_per_9 = (9 * season.strikeouts_pitched) / season.innings_pitched
        season.bb_per_9 = (9 * season.walks_allowed) / season.innings_pitched

        if (season.walks_allowed > 0) {
          season.k_bb_ratio = season.strikeouts_pitched / season.walks_allowed
        }
      }

      if (season.batters_faced > 0) {
        season.opponent_batting_avg = season.hits_allowed / season.batters_faced
      }

      // Bill James pitching metrics
      try {
        const metrics = calculatePitchingMetrics({
          IP: season.innings_pitched,
          H: season.hits_allowed,
          ER: season.earned_runs,
          R: season.runs_allowed,
          BB: season.walks_allowed,
          SO: season.strikeouts_pitched,
          HR: season.home_runs_allowed,
        })

        season.component_era = metrics.componentERA
        season.game_score = metrics.gameScore
      } catch (e) {
        // Ignore calculation errors
      }
    }

    // Fielding stats
    if (season.putouts > 0 || season.assists > 0) {
      const totalChances = season.putouts + season.assists + season.errors
      if (totalChances > 0) {
        season.fielding_pct = (season.putouts + season.assists) / totalChances
      }

      if (season.innings_fielded_outs) {
        try {
          const metrics = calculateFieldingMetrics({
            PO: season.putouts,
            A: season.assists,
            G: season.games,
            InnOuts: season.innings_fielded_outs,
          })

          season.range_factor = metrics.rangeFactor
        } catch (e) {
          // Ignore calculation errors
        }
      }
    }
  })

  // Insert in batches
  console.log(`   📦 Inserting ${seasons.length} player-seasons in batches...`)

  for (let i = 0; i < seasons.length; i += BATCH_SIZE) {
    const batch = seasons.slice(i, i + BATCH_SIZE)

    const { error } = await supabase.from('player_seasons').insert(batch)

    if (error) {
      console.error(`   ❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message)
      stats.errors++
    } else {
      stats.playerSeasons += batch.length
      process.stdout.write(`\r   ✅ Imported ${stats.playerSeasons}/${seasons.length} player-seasons`)
    }
  }

  console.log(`\n   ✅ Player seasons import complete: ${stats.playerSeasons} records\n`)
}

/**
 * Main import function
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('Lahman Database Import')
  console.log('Century of the Game - Phase 1.5')
  console.log('='.repeat(60) + '\n')

  console.log(`📍 Supabase: ${SUPABASE_URL}`)
  console.log(`📁 Data directory: ${LAHMAN_DIR}`)
  console.log(`📦 Batch size: ${BATCH_SIZE} records\n`)

  try {
    // Step 1: Import players
    const playerMap = await importPlayers()

    // Step 2: Import teams
    const teamMap = await importTeams()

    // Step 3: Import player seasons
    await importPlayerSeasons(playerMap, teamMap)

    // Summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1)

    console.log('\n' + '='.repeat(60))
    console.log('Import Summary')
    console.log('='.repeat(60) + '\n')

    console.log(`✅ Players:        ${stats.players.toLocaleString()}`)
    console.log(`✅ Team-Seasons:   ${stats.teams.toLocaleString()}`)
    console.log(`✅ Player-Seasons: ${stats.playerSeasons.toLocaleString()}`)
    console.log(`❌ Errors:         ${stats.errors}`)
    console.log(`⏱️  Duration:       ${duration}s\n`)

    console.log('='.repeat(60) + '\n')

    if (stats.errors > 0) {
      console.log('⚠️  Some errors occurred during import. Check logs above.')
    } else {
      console.log('🎉 All data imported successfully!\n')
      console.log('Next steps:')
      console.log('  1. Verify data in Supabase dashboard')
      console.log('  2. Run: npm run generate:apba-cards\n')
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run import
main()

/**
 * Calculate and update APBA ratings for all player_seasons
 *
 * This script:
 * 1. Fetches all player_seasons from Supabase
 * 2. Calculates APBA rating using apbaRating.ts utility
 * 3. Updates database with calculated ratings in batches
 * 4. Logs progress and shows sample top players
 *
 * Run after applying migration: 20260127_add_apba_rating.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { calculatePlayerRating, getRatingDescription } from '../src/utils/apbaRating.js'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Use service role key for admin operations (bypasses RLS, allows batch upsert)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PlayerSeasonRow {
  id: string
  year: number
  primary_position: string
  at_bats: number | null
  batting_avg: number | null
  on_base_pct: number | null
  slugging_pct: number | null
  ops: number | null
  home_runs: number | null
  stolen_bases: number | null
  runs_created_advanced: number | null
  isolated_power: number | null
  secondary_avg: number | null
  fielding_pct: number | null
  range_factor: number | null
  errors: number | null
  wins: number | null
  losses: number | null
  saves: number | null
  era: number | null
  whip: number | null
  k_bb_ratio: number | null
  strikeouts_pitched: number | null
  walks_allowed: number | null
  innings_pitched_outs: number | null
  players?: {
    display_name: string
  }
}

async function calculateAndUpdateRatings() {
  console.log('=' + '='.repeat(79))
  console.log('APBA Rating Calculation Script')
  console.log('=' + '='.repeat(79))
  console.log()

  let offset = 0
  const batchSize = 500
  let totalProcessed = 0
  let totalUpdated = 0
  const topPlayers: Array<{ name: string, year: number, rating: number, position: string }> = []

  console.log('Starting batch processing...\n')

  while (true) {
    console.log(`Fetching batch ${Math.floor(offset / batchSize) + 1} (offset ${offset})...`)

    // Fetch batch of players with all required stats
    const { data: players, error } = await supabase
      .from('player_seasons')
      .select(`
        id,
        year,
        primary_position,
        at_bats,
        batting_avg,
        on_base_pct,
        slugging_pct,
        ops,
        home_runs,
        stolen_bases,
        runs_created_advanced,
        isolated_power,
        secondary_avg,
        fielding_pct,
        range_factor,
        errors,
        wins,
        losses,
        saves,
        era,
        whip,
        k_bb_ratio,
        strikeouts_pitched,
        walks_allowed,
        innings_pitched_outs,
        players!inner(display_name)
      `)
      .range(offset, offset + batchSize - 1)

    if (error) {
      console.error('Error fetching players:', error)
      break
    }

    if (!players || players.length === 0) {
      console.log('No more players to process.')
      break
    }

    console.log(`  Fetched ${players.length} players`)
    console.log('  Calculating ratings...')

    // Calculate ratings for this batch
    const updates: Array<{ id: string, rating: number }> = []

    for (const player of players as PlayerSeasonRow[]) {
      const rating = calculatePlayerRating(player)
      updates.push({ id: player.id, rating })

      // Track top players for summary
      if (topPlayers.length < 20 || rating > topPlayers[topPlayers.length - 1].rating) {
        const playerName = (player.players as any)?.display_name || 'Unknown'
        topPlayers.push({
          name: playerName,
          year: player.year,
          rating,
          position: player.primary_position
        })
        topPlayers.sort((a, b) => b.rating - a.rating)
        if (topPlayers.length > 20) {
          topPlayers.pop()
        }
      }
    }

    console.log('  Updating database...')

    // Use batch upsert (service role key bypasses RLS, allows this operation)
    // Retry up to 3 times on transient errors (Cloudflare 500, network issues)
    let batchUpdated = 0
    let success = false
    let lastError: any = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: upsertError } = await supabase
        .from('player_seasons')
        .upsert(
          updates.map(u => ({ id: u.id, apba_rating: u.rating })),
          { onConflict: 'id' }
        )

      if (!upsertError) {
        success = true
        batchUpdated = updates.length
        break
      }

      lastError = upsertError

      if (attempt < 3) {
        console.log(`  Retry attempt ${attempt + 1} after error: ${upsertError.message}`)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000)) // 1s, 2s delays
      }
    }

    if (!success && lastError) {
      console.error(`  ✗ Failed to update batch after 3 attempts: ${lastError.message}`)
      console.error(`  Skipping ${updates.length} players in this batch`)
    }

    totalProcessed += players.length
    totalUpdated += batchUpdated
    console.log(`  ✓ Updated ${batchUpdated}/${players.length} players in this batch`)
    console.log(`  Total progress: ${totalUpdated}/${totalProcessed} players\n`)

    // Stop if we got fewer players than batch size (last batch)
    if (players.length < batchSize) {
      break
    }

    offset += batchSize
  }

  console.log('=' + '='.repeat(79))
  console.log('COMPLETE!')
  console.log('=' + '='.repeat(79))
  console.log(`Total players processed: ${totalProcessed}`)
  console.log(`Total players updated: ${totalUpdated}`)
  console.log()

  if (topPlayers.length > 0) {
    console.log('Top 20 Players by APBA Rating:')
    console.log('-'.repeat(80))
    console.log('Rank  Rating  Pos  Year  Player Name')
    console.log('-'.repeat(80))
    topPlayers.forEach((player, index) => {
      const rank = (index + 1).toString().padStart(4, ' ')
      const rating = player.rating.toFixed(1).padStart(6, ' ')
      const pos = player.position.padEnd(4, ' ')
      const year = player.year.toString()
      const desc = getRatingDescription(player.rating).padEnd(15, ' ')
      console.log(`${rank}  ${rating}  ${pos} ${year}  ${player.name} (${desc})`)
    })
    console.log('-'.repeat(80))
  }

  console.log('\nDone! Ratings have been calculated and saved to the database.')
}

calculateAndUpdateRatings().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

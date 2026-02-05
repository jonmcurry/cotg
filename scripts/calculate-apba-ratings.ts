/**
 * Calculate and update APBA ratings for all player_seasons
 *
 * This script:
 * 1. Fetches all player_seasons from Neon PostgreSQL
 * 2. Calculates APBA rating using apbaRating.ts utility
 * 3. Updates database with calculated ratings in batches
 * 4. Logs progress and shows sample top players
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import { calculatePlayerRating, getRatingDescription } from '../src/utils/apbaRating.js'

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('Missing DATABASE_URL in .env file')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

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
  display_name?: string
}

async function calculateAndUpdateRatings() {
  console.log('=' + '='.repeat(79))
  console.log('APBA Rating Calculation Script (Neon PostgreSQL)')
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
    const result = await pool.query(`
      SELECT
        ps.id, ps.year, ps.primary_position, ps.at_bats, ps.batting_avg,
        ps.on_base_pct, ps.slugging_pct, ps.ops, ps.home_runs, ps.stolen_bases,
        ps.runs_created_advanced, ps.isolated_power, ps.secondary_avg,
        ps.fielding_pct, ps.range_factor, ps.errors,
        ps.wins, ps.losses, ps.saves, ps.era, ps.whip, ps.k_bb_ratio,
        ps.strikeouts_pitched, ps.walks_allowed, ps.innings_pitched_outs,
        p.display_name
      FROM player_seasons ps
      INNER JOIN players p ON ps.player_id = p.id
      ORDER BY ps.id
      LIMIT $1 OFFSET $2
    `, [batchSize, offset])

    const players = result.rows as PlayerSeasonRow[]

    if (!players || players.length === 0) {
      console.log('No more players to process.')
      break
    }

    console.log(`  Fetched ${players.length} players`)
    console.log('  Calculating ratings...')

    // Calculate ratings for this batch
    const updates: Array<{ id: string, rating: number }> = []

    for (const player of players) {
      const rating = calculatePlayerRating(player)
      updates.push({ id: player.id, rating })

      // Track top players for summary
      if (topPlayers.length < 20 || rating > topPlayers[topPlayers.length - 1].rating) {
        const playerName = player.display_name || 'Unknown'
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

    // Update in chunks of 50 to avoid overwhelming the connection
    const chunkSize = 50
    let batchUpdated = 0
    const failedUpdates: string[] = []

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize)

      const results = await Promise.all(
        chunk.map(async (update) => {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await pool.query(
                'UPDATE player_seasons SET apba_rating = $1 WHERE id = $2',
                [update.rating, update.id]
              )
              return { success: true, id: update.id }
            } catch (error: any) {
              if (attempt === 3) {
                return { success: false, id: update.id, error: error.message }
              }
              await new Promise(resolve => setTimeout(resolve, attempt * 100))
            }
          }
          return { success: false, id: update.id, error: 'Unknown error' }
        })
      )

      results.forEach(result => {
        if (result.success) {
          batchUpdated++
        } else {
          failedUpdates.push(`${result.id}: ${result.error}`)
        }
      })
    }

    if (failedUpdates.length > 0) {
      console.error(`  Failed to update ${failedUpdates.length} players:`)
      failedUpdates.slice(0, 3).forEach(err => console.error(`    ${err}`))
      if (failedUpdates.length > 3) {
        console.error(`    ... and ${failedUpdates.length - 3} more`)
      }
    }

    totalProcessed += players.length
    totalUpdated += batchUpdated
    console.log(`  Updated ${batchUpdated}/${players.length} players in this batch`)
    console.log(`  Total progress: ${totalUpdated}/${totalProcessed} players\n`)

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
      const desc = (getRatingDescription(player.rating) || 'Unknown').padEnd(15, ' ')
      console.log(`${rank}  ${rating}  ${pos} ${year}  ${player.name} (${desc})`)
    })
    console.log('-'.repeat(80))
  }

  console.log('\nDone! Ratings have been calculated and saved to the database.')

  await pool.end()
}

calculateAndUpdateRatings().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

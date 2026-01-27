/**
 * Generate APBA Cards
 *
 * Converts player-season statistics from Lahman database into APBA-style
 * player cards with dice outcome arrays for game simulation.
 *
 * Algorithm:
 * 1. Query player_seasons with minimum thresholds (300 AB or 50 IP)
 * 2. Calculate fielding grade based on fielding percentage and range factor
 * 3. Generate dice outcomes array (36 outcomes) based on actual stats
 * 4. Calculate speed rating from stolen base stats
 * 5. For pitchers: assign grade (A-E) based on ERA and calculate control
 *
 * Usage: npm run generate:apba-cards
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// APBA outcome codes (simplified - expand later)
const OUTCOMES = {
  // Outs (0-15)
  GROUNDOUT: 1,
  FLYOUT: 2,
  LINEOUT: 3,
  POPOUT: 4,

  // Hits (16-47)
  SINGLE: 16,
  SINGLE_PLUS: 17, // Advance extra base
  DOUBLE: 32,
  TRIPLE: 40,
  HOME_RUN: 44,

  // Other outcomes (48+)
  WALK: 50,
  STRIKEOUT: 60,
  HIT_BY_PITCH: 55,
}

interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string

  // Batting
  at_bats: number
  hits: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  strikeouts: number
  stolen_bases: number
  caught_stealing: number
  batting_avg: number

  // Pitching
  innings_pitched_outs: number
  wins: number
  losses: number
  era: number
  whip: number
  strikeouts_pitched: number
  walks_allowed: number

  // Fielding
  fielding_pct: number
  range_factor: number
  errors: number
}

/**
 * Calculate fielding grade (1-9) based on fielding percentage and range factor
 */
function calculateFieldingGrade(
  position: string,
  fieldingPct: number | null,
  rangeFactor: number | null
): number {
  // Default to average (5) if no data
  if (!fieldingPct) return 5

  // Position-specific thresholds
  const thresholds: Record<string, { elite: number, good: number, avg: number, poor: number }> = {
    'C': { elite: 0.995, good: 0.990, avg: 0.985, poor: 0.975 },
    '1B': { elite: 0.997, good: 0.994, avg: 0.991, poor: 0.985 },
    '2B': { elite: 0.990, good: 0.985, avg: 0.980, poor: 0.970 },
    'SS': { elite: 0.985, good: 0.975, avg: 0.970, poor: 0.960 },
    '3B': { elite: 0.975, good: 0.965, avg: 0.955, poor: 0.945 },
    'OF': { elite: 0.995, good: 0.990, avg: 0.985, poor: 0.975 },
    'P': { elite: 0.990, good: 0.975, avg: 0.960, poor: 0.940 },
  }

  const threshold = thresholds[position] || thresholds['OF']

  // Assign grade based on fielding percentage
  if (fieldingPct >= threshold.elite) return Math.floor(Math.random() * 2) + 1 // 1-2
  if (fieldingPct >= threshold.good) return Math.floor(Math.random() * 2) + 2 // 2-3
  if (fieldingPct >= threshold.avg) return Math.floor(Math.random() * 2) + 4 // 4-5
  if (fieldingPct >= threshold.poor) return Math.floor(Math.random() * 2) + 6 // 6-7
  return Math.floor(Math.random() * 2) + 8 // 8-9
}

/**
 * Calculate speed rating (1-20) based on stolen base stats
 */
function calculateSpeedRating(sb: number, cs: number, atBats: number): number {
  if (atBats === 0) return 10 // Default average speed

  const sbRate = (sb + cs) / (atBats / 150) // SB attempts per 150 AB
  const successRate = cs === 0 ? 1.0 : sb / (sb + cs)

  // Combine attempt rate and success rate
  const speedScore = sbRate * successRate

  // Map to 1-20 scale
  if (speedScore >= 30) return 20 // Elite (Lou Brock, Rickey Henderson)
  if (speedScore >= 20) return 18
  if (speedScore >= 15) return 16
  if (speedScore >= 10) return 14
  if (speedScore >= 7) return 12
  if (speedScore >= 5) return 10
  if (speedScore >= 3) return 8
  if (speedScore >= 1) return 6
  return 4 // Slow (catchers, power hitters)
}

/**
 * Calculate pitcher grade (A-E) based on ERA
 */
function calculatePitcherGrade(era: number | null, whip: number | null): string {
  if (!era) return 'E'

  // Historical ERA benchmarks
  if (era <= 2.50) return 'A' // Ace
  if (era <= 3.50) return 'B' // Good starter
  if (era <= 4.25) return 'C' // Average starter
  if (era <= 5.00) return 'D' // Below average
  return 'E' // Replacement level
}

/**
 * Generate dice outcomes array (36 outcomes) based on actual stats
 *
 * The array has 36 slots representing all possible 2d6 outcomes:
 * - Index 0 = roll 2 (probability 1/36)
 * - Index 1-2 = roll 3 (probability 2/36)
 * - Index 3-5 = roll 4 (probability 3/36)
 * - ...
 * - Index 35 = roll 12 (probability 1/36)
 */
function generateDiceOutcomes(season: PlayerSeason): number[] {
  const outcomes: number[] = new Array(36)

  // Calculate rates per at-bat
  const paRate = (ab: number) => ab / season.at_bats
  const singles = season.hits - season.doubles - season.triples - season.home_runs

  const homeRunRate = paRate(season.home_runs)
  const tripleRate = paRate(season.triples)
  const doubleRate = paRate(season.doubles)
  const singleRate = paRate(singles)
  const walkRate = (season.walks) / (season.at_bats + season.walks)
  const strikeoutRate = paRate(season.strikeouts)

  // Allocate outcomes based on weighted probabilities
  let idx = 0

  // Slot probabilities (how many slots each roll gets)
  const slotCounts = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1] // For rolls 2-12

  // Distribute extra base hits (rarest outcomes)
  const hrSlots = Math.round(homeRunRate * 36)
  const tripleSlots = Math.round(tripleRate * 36)
  const doubleSlots = Math.round(doubleRate * 36)
  const singleSlots = Math.round(singleRate * 36)
  const walkSlots = Math.round(walkRate * 36)
  const soSlots = Math.round(strikeoutRate * 36)

  // Fill array strategically
  // Home runs on rolls 2 (rare) and 3
  for (let i = 0; i < Math.min(hrSlots, 3); i++) {
    outcomes[i] = OUTCOMES.HOME_RUN
  }

  // Triples on rolls 3-4
  for (let i = 0; i < Math.min(tripleSlots, 3); i++) {
    outcomes[i + 1] = OUTCOMES.TRIPLE
  }

  // Doubles on rolls 4-5
  for (let i = 0; i < Math.min(doubleSlots, 7); i++) {
    outcomes[i + 3] = OUTCOMES.DOUBLE
  }

  // Singles on middle rolls (6-8, most common)
  for (let i = 0; i < Math.min(singleSlots, 15); i++) {
    outcomes[i + 10] = OUTCOMES.SINGLE
  }

  // Walks on rolls 8-9
  for (let i = 0; i < Math.min(walkSlots, 7); i++) {
    outcomes[i + 25] = OUTCOMES.WALK
  }

  // Strikeouts on rolls 10-12 (high rolls)
  for (let i = 0; i < Math.min(soSlots, 6); i++) {
    outcomes[i + 30] = OUTCOMES.STRIKEOUT
  }

  // Fill remaining slots with outs
  for (let i = 0; i < 36; i++) {
    if (!outcomes[i]) {
      // Vary the type of out
      if (i < 15) outcomes[i] = OUTCOMES.GROUNDOUT
      else if (i < 28) outcomes[i] = OUTCOMES.FLYOUT
      else outcomes[i] = OUTCOMES.STRIKEOUT
    }
  }

  return outcomes
}

/**
 * Generate pitcher dice outcomes
 */
function generatePitcherDiceOutcomes(season: PlayerSeason): number[] {
  const outcomes: number[] = new Array(36)

  // For pitchers, we invert the logic - lower rolls are better for pitcher (outs)
  // Higher rolls favor the batter

  const inningsPitched = season.innings_pitched_outs / 3
  if (inningsPitched === 0) {
    return outcomes.fill(OUTCOMES.FLYOUT) // Default
  }

  // Calculate rates per batter faced (estimate: IP * 4.3)
  const battersFaced = inningsPitched * 4.3
  const hitRate = (season.at_bats || 0) / battersFaced
  const walkRate = season.walks_allowed / battersFaced
  const soRate = season.strikeouts_pitched / battersFaced

  // Map to 36 outcomes
  const hitSlots = Math.round(hitRate * 36)
  const walkSlots = Math.round(walkRate * 36)
  const soSlots = Math.round(soRate * 36)

  // Strikeouts on low rolls (good for pitcher)
  for (let i = 0; i < Math.min(soSlots, 10); i++) {
    outcomes[i] = OUTCOMES.STRIKEOUT
  }

  // Walks on high rolls (bad for pitcher)
  for (let i = 0; i < Math.min(walkSlots, 6); i++) {
    outcomes[35 - i] = OUTCOMES.WALK
  }

  // Hits on mid-high rolls
  for (let i = 0; i < Math.min(hitSlots, 12); i++) {
    outcomes[20 + i] = OUTCOMES.SINGLE
  }

  // Fill rest with outs
  for (let i = 0; i < 36; i++) {
    if (!outcomes[i]) {
      outcomes[i] = OUTCOMES.FLYOUT
    }
  }

  return outcomes
}

/**
 * Generate a single APBA card from player season stats
 */
async function generateCard(season: PlayerSeason): Promise<any> {
  const isBatter = season.at_bats >= 50
  const isPitcher = season.innings_pitched_outs >= 150 // 50+ IP

  if (!isBatter && !isPitcher) {
    return null // Skip players with insufficient stats
  }

  const cardType = isBatter ? 'batter' : 'pitcher'

  // Base card data
  const card: any = {
    player_id: season.player_id,
    player_season_id: season.id,
    season: season.year,
    card_type: cardType,
    generation_algorithm_version: '1.0',
  }

  // Batting card data
  if (isBatter) {
    card.dice_outcomes = generateDiceOutcomes(season)
    card.fielding_grade = calculateFieldingGrade(
      season.primary_position,
      season.fielding_pct,
      season.range_factor
    )
    card.speed_rating = calculateSpeedRating(
      season.stolen_bases,
      season.caught_stealing,
      season.at_bats
    )
  }

  // Pitching card data
  if (isPitcher) {
    card.pitcher_grade = calculatePitcherGrade(season.era, season.whip)
    card.pitcher_dice_outcomes = generatePitcherDiceOutcomes(season)

    // Control rating (1-10) based on BB/9
    const bbPer9 = (season.walks_allowed / (season.innings_pitched_outs / 3)) * 9
    if (bbPer9 <= 1.5) card.control_rating = 10 // Elite
    else if (bbPer9 <= 2.0) card.control_rating = 9
    else if (bbPer9 <= 2.5) card.control_rating = 8
    else if (bbPer9 <= 3.0) card.control_rating = 7
    else if (bbPer9 <= 3.5) card.control_rating = 6
    else if (bbPer9 <= 4.0) card.control_rating = 5
    else if (bbPer9 <= 4.5) card.control_rating = 4
    else if (bbPer9 <= 5.0) card.control_rating = 3
    else if (bbPer9 <= 6.0) card.control_rating = 2
    else card.control_rating = 1 // Wild

    // Endurance based on games started and complete games
    card.endurance = 5 // Default to average (implement more logic later)
  }

  return card
}

/**
 * Main generation process
 */
async function generateAPBACards(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('APBA Card Generation')
  console.log('Century of the Game - Phase 1.6')
  console.log('='.repeat(60) + '\n')

  console.log(`📍 Supabase: ${SUPABASE_URL}`)
  console.log(`📦 Batch size: 1000 cards\n`)

  // Query player seasons with minimum thresholds
  // Supabase has a 1000 row limit, so we need to paginate
  console.log('📊 Querying player seasons...')

  let seasons: any[] = []
  let page = 0
  const PAGE_SIZE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('player_seasons')
      .select('*')
      .or('at_bats.gte.100,innings_pitched_outs.gte.60') // 100 AB or 20 IP
      .order('year', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error('❌ Error querying player seasons:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break

    seasons = seasons.concat(data)
    process.stdout.write(`\r   Fetched ${seasons.length} player-seasons...`)

    if (data.length < PAGE_SIZE) break
    page++
  }

  console.log(`\n   Found ${seasons.length} qualified player-seasons\n`)

  // Generate cards in batches
  const BATCH_SIZE = 1000
  let totalGenerated = 0
  let totalErrors = 0

  for (let i = 0; i < seasons.length; i += BATCH_SIZE) {
    const batch = seasons.slice(i, i + BATCH_SIZE)
    const cards: any[] = []

    for (const season of batch) {
      const card = await generateCard(season)
      if (card) {
        cards.push(card)
      }
    }

    // Insert batch into database
    if (cards.length > 0) {
      const { error: insertError } = await supabase
        .from('apba_cards')
        .insert(cards)

      if (insertError) {
        console.error(`   ❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError.message)
        totalErrors++
      } else {
        totalGenerated += cards.length
        process.stdout.write(`\r   ✅ Generated ${totalGenerated}/${seasons.length} cards`)
      }
    }
  }

  console.log('\n')

  // Summary
  console.log('='.repeat(60))
  console.log('Generation Summary')
  console.log('='.repeat(60) + '\n')

  console.log(`✅ Total cards generated: ${totalGenerated.toLocaleString()}`)
  console.log(`❌ Errors: ${totalErrors}`)
  console.log('='.repeat(60) + '\n')

  if (totalErrors > 0) {
    console.log('⚠️  Some errors occurred during generation.')
  } else {
    console.log('🎉 All cards generated successfully!\n')
  }
}

// Run generation
generateAPBACards().catch(error => {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
})

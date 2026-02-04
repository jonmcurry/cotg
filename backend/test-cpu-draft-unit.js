/**
 * Unit Test: CPU Draft Player Selection Bug (No Database Required)
 *
 * This test reproduces the bug using mock data to test the filtering logic
 * without requiring database access.
 */

// Constants from cpu.ts
const ROSTER_REQUIREMENTS = {
  'C': 1, '1B': 1, '2B': 1, 'SS': 1, '3B': 1,
  'OF': 3, 'SP': 4, 'RP': 3, 'CL': 1, 'DH': 1, 'BN': 4,
}

const POSITION_ELIGIBILITY = {
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

// Helper functions from cpu.ts
function createRosterSlots() {
  const roster = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, count]) => {
    for (let i = 0; i < count; i++) {
      roster.push({
        position,
        slotNumber: i + 1,
        playerSeasonId: null,
        isFilled: false,
      })
    }
  })
  return roster
}

function getUnfilledPositions(team) {
  const unfilled = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, required]) => {
    const filled = team.roster.filter(slot => slot.position === position && slot.isFilled).length
    if (filled < required) {
      for (let i = 0; i < required - filled; i++) {
        unfilled.push(position)
      }
    }
  })
  return unfilled
}

function playerQualifiesForPosition(playerPosition, rosterPosition) {
  const eligiblePositions = POSITION_ELIGIBILITY[rosterPosition] || []
  const qualifies = eligiblePositions.includes(playerPosition)
  return qualifies
}

function meetsPlayingTimeRequirements(player, rosterPosition) {
  const atBats = player.at_bats || 0
  const inningsPitchedOuts = player.innings_pitched_outs || 0

  const isPositionPlayerSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(rosterPosition)
  if (isPositionPlayerSlot) return atBats >= 200

  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(rosterPosition)
  if (isPitcherSlot) return inningsPitchedOuts >= 90

  if (rosterPosition === 'BN') return atBats >= 200
  return atBats >= 200 || inningsPitchedOuts >= 90
}

function runTest() {
  console.log('\n=== CPU DRAFT BUG UNIT TEST (Mock Data) ===\n')

  // Create mock shortstop players with various characteristics
  const mockShortstops = [
    {
      id: 'player-1',
      player_id: 'honus-wagner',
      primary_position: 'SS',
      display_name: 'Honus Wagner',
      at_bats: 500,
      apba_rating: 95,
      year: 1908,
      innings_pitched_outs: 0
    },
    {
      id: 'player-2',
      player_id: 'ozzie-smith',
      primary_position: 'SS',
      display_name: 'Ozzie Smith',
      at_bats: 450,
      apba_rating: 88,
      year: 1985,
      innings_pitched_outs: 0
    },
    {
      id: 'player-3',
      player_id: 'cal-ripken',
      primary_position: 'SS',
      display_name: 'Cal Ripken Jr.',
      at_bats: 600,
      apba_rating: 92,
      year: 1991,
      innings_pitched_outs: 0
    },
    // Test edge case: SS with exactly 200 at-bats
    {
      id: 'player-4',
      player_id: 'edge-case-ss',
      primary_position: 'SS',
      display_name: 'Edge Case SS',
      at_bats: 200,
      apba_rating: 75,
      year: 2000,
      innings_pitched_outs: 0
    },
    // Test edge case: SS with 199 at-bats (should be filtered out)
    {
      id: 'player-5',
      player_id: 'low-ab-ss',
      primary_position: 'SS',
      display_name: 'Low AB SS',
      at_bats: 199,
      apba_rating: 80,
      year: 2010,
      innings_pitched_outs: 0
    },
    // Test edge case: lowercase 'ss' position
    {
      id: 'player-6',
      player_id: 'lowercase-ss',
      primary_position: 'ss',
      display_name: 'Lowercase SS',
      at_bats: 400,
      apba_rating: 85,
      year: 2015,
      innings_pitched_outs: 0
    },
  ]

  console.log(`STEP 1: Created ${mockShortstops.length} mock shortstop players`)
  mockShortstops.forEach(p => {
    console.log(`  - ${p.display_name}: position="${p.primary_position}", AB=${p.at_bats}`)
  })

  // Create test team needing SS
  console.log('\nSTEP 2: Creating test team with missing SS position...')
  const testTeam = {
    id: 'test-team-1',
    name: 'Test Team',
    control: 'cpu',
    draftPosition: 1,
    roster: createRosterSlots(),
    draftSessionId: 'test-session'
  }

  // Fill all positions except SS
  testTeam.roster.forEach(slot => {
    if (slot.position !== 'SS') {
      slot.isFilled = true
      slot.playerSeasonId = 'dummy-player'
    }
  })

  const unfilledPositions = getUnfilledPositions(testTeam)
  console.log(`Team needs: ${unfilledPositions.join(', ')}`)

  // Test filtering logic
  console.log('\nSTEP 3: Testing filtering logic...')

  const draftedPlayerIds = new Set()
  const excludePlayerSeasonIds = new Set()

  // Filter undrafted
  const undrafted = mockShortstops.filter(p =>
    !draftedPlayerIds.has(p.player_id) &&
    !excludePlayerSeasonIds.has(p.id)
  )
  console.log(`  - After draft filter: ${undrafted.length} players`)

  // Filter for SS position eligibility
  console.log('\n  Testing position eligibility...')
  console.log(`  - Required positions for SS slot: [${POSITION_ELIGIBILITY['SS'].join(', ')}]`)

  const positionEligible = []
  const positionIneligible = []

  undrafted.forEach(player => {
    const qualifies = playerQualifiesForPosition(player.primary_position, 'SS')
    if (qualifies) {
      positionEligible.push(player)
    } else {
      positionIneligible.push(player)
    }
  })

  console.log(`  - Position eligible: ${positionEligible.length} players`)
  if (positionIneligible.length > 0) {
    console.log(`  - Position INELIGIBLE: ${positionIneligible.length} players`)
    positionIneligible.forEach(p => {
      console.log(`      ❌ ${p.display_name}: position="${p.primary_position}" does NOT match [${POSITION_ELIGIBILITY['SS'].join(', ')}]`)
    })
  }

  // Filter for playing time
  console.log('\n  Testing playing time requirements...')
  console.log(`  - SS position requires: at_bats >= 200`)

  const playingTimeEligible = []
  const playingTimeIneligible = []

  positionEligible.forEach(player => {
    const meets = meetsPlayingTimeRequirements(player, 'SS')
    if (meets) {
      playingTimeEligible.push(player)
    } else {
      playingTimeIneligible.push(player)
    }
  })

  console.log(`  - Playing time eligible: ${playingTimeEligible.length} players`)
  if (playingTimeIneligible.length > 0) {
    console.log(`  - Playing time INELIGIBLE: ${playingTimeIneligible.length} players`)
    playingTimeIneligible.forEach(p => {
      console.log(`      ❌ ${p.display_name}: at_bats=${p.at_bats} (requires >= 200)`)
    })
  }

  // Final result
  console.log('\n=== TEST RESULT ===\n')

  if (playingTimeEligible.length > 0) {
    console.log(`✅ TEST PASSED: Found ${playingTimeEligible.length} eligible shortstops`)
    console.log('\nEligible players:')
    playingTimeEligible.forEach(p => {
      console.log(`  ✓ ${p.display_name}: position="${p.primary_position}", AB=${p.at_bats}`)
    })
    console.log('\nThe filtering logic is working as designed.')
    console.log('If the bug still occurs, it must be in:')
    console.log('  1. The player pool query (not loading all available players)')
    console.log('  2. The position eligibility constants (POSITION_ELIGIBILITY)')
    console.log('  3. Case sensitivity issues with primary_position values')
    process.exit(0)
  } else {
    console.log('❌ TEST FAILED: No eligible shortstops found')
    console.log('\nBUG CONFIRMED: Filtering logic is too restrictive!')
    console.log('\nFunnel breakdown:')
    console.log(`  ${mockShortstops.length} → ${undrafted.length} → ${positionEligible.length} → ${playingTimeEligible.length}`)
    console.log(`  Total    Undrafted   PosEligible   FinalEligible`)

    if (positionIneligible.length > 0) {
      console.log('\n🔍 ROOT CAUSE: Position eligibility filter is rejecting valid players')
      console.log('   This is likely a CASE SENSITIVITY issue!')
      console.log(`   Database has: "${positionIneligible[0].primary_position}"`)
      console.log(`   Code expects: "${POSITION_ELIGIBILITY['SS'][0]}"`)
    } else if (playingTimeIneligible.length > 0) {
      console.log('\n🔍 ROOT CAUSE: Playing time requirements are rejecting valid players')
    }

    process.exit(1)
  }
}

// Run the test
runTest()

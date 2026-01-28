import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testJoinIssue() {
  console.log('='.repeat(80));
  console.log('TESTING IF players!inner JOIN IS CAUSING ISSUES');
  console.log('='.repeat(80));

  const testSeasons = [1928, 1929, 1930, 1999];

  // Test WITHOUT join
  console.log('\n1. Query WITHOUT players join:');
  console.log('-'.repeat(80));

  const { count: countNoJoin, error: errorNoJoin } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30');

  if (errorNoJoin) {
    console.error('❌ ERROR:', errorNoJoin);
  } else {
    console.log(`✓ Count without join: ${countNoJoin}`);
  }

  // Test WITH inner join (like DraftBoard does)
  console.log('\n2. Query WITH players!inner join:');
  console.log('-'.repeat(80));

  const { data: dataWithJoin, error: errorWithJoin } = await supabase
    .from('player_seasons')
    .select(`
      id,
      player_id,
      year,
      primary_position,
      apba_rating,
      players!inner (
        display_name,
        first_name,
        last_name
      )
    `)
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .limit(5);

  if (errorWithJoin) {
    console.error('❌ ERROR:', errorWithJoin);
    console.error('Error details:', JSON.stringify(errorWithJoin, null, 2));
  } else {
    console.log(`✓ Returned ${dataWithJoin?.length || 0} players with join`);
    if (dataWithJoin && dataWithJoin.length > 0) {
      console.log('Sample:');
      dataWithJoin.forEach((p: any) => {
        console.log(`  - ${p.year} ${p.players?.display_name || p.players?.first_name + ' ' + p.players?.last_name}`);
      });
    }
  }

  // Check for player_seasons with missing player_id references
  console.log('\n3. Checking for orphaned player_seasons (no matching player):');
  console.log('-'.repeat(80));

  const { data: orphaned } = await supabase
    .from('player_seasons')
    .select('id, player_id, year')
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .is('player_id', null)
    .limit(5);

  if (orphaned && orphaned.length > 0) {
    console.log(`❌ Found ${orphaned.length} player_seasons with NULL player_id`);
    orphaned.forEach((p: any) => {
      console.log(`  - ID: ${p.id}, Year: ${p.year}, player_id: ${p.player_id}`);
    });
  } else {
    console.log('✓ No orphaned records found');
  }

  // Try to find player_seasons where player doesn't exist
  console.log('\n4. Checking for broken foreign key references:');
  console.log('-'.repeat(80));

  const { data: brokenRefs } = await supabase
    .from('player_seasons')
    .select(`
      id,
      player_id,
      year,
      players (
        id,
        display_name
      )
    `)
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .limit(10);

  if (brokenRefs) {
    const broken = brokenRefs.filter((ps: any) => !ps.players || ps.players === null);
    if (broken.length > 0) {
      console.log(`❌ Found ${broken.length} player_seasons with missing player records`);
      broken.forEach((p: any) => {
        console.log(`  - player_seasons.id: ${p.id}, player_id: ${p.player_id}, year: ${p.year}`);
      });
    } else {
      console.log('✓ All player_seasons have valid player references');
    }
  }
}

testJoinIssue().catch(console.error);

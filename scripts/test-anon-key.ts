import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Use ANON key like the browser does
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('Testing with ANON KEY (like browser does)...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonKey() {
  console.log('='.repeat(80));
  console.log('TESTING PLAYER QUERY WITH ANON KEY');
  console.log('='.repeat(80));

  // Test with a few seasons
  const testSeasons = [1928, 1929, 1930, 1999];

  console.log(`\nTesting query for seasons: ${testSeasons.join(', ')}`);
  console.log('-'.repeat(80));

  const startTime = Date.now();

  // Get count - exact query from DraftBoard.tsx
  const { count, error: countError } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30');

  const elapsed = Date.now() - startTime;

  if (countError) {
    console.error('❌ ERROR getting count:', countError);
    console.error('Error details:', JSON.stringify(countError, null, 2));
  } else {
    console.log(`✓ Total players matching criteria: ${count}`);
    console.log(`✓ Query completed in ${elapsed}ms`);
  }

  // Try to get first 10 players
  console.log('\nGetting first 10 players...');
  const startTime2 = Date.now();

  const { data, error: dataError } = await supabase
    .from('player_seasons')
    .select(`
      id,
      player_id,
      year,
      primary_position,
      apba_rating,
      at_bats,
      innings_pitched_outs,
      players!inner (
        display_name,
        first_name,
        last_name
      )
    `)
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .order('apba_rating', { ascending: false, nullsFirst: false })
    .limit(10);

  const elapsed2 = Date.now() - startTime2;

  if (dataError) {
    console.error('❌ ERROR getting data:', dataError);
    console.error('Error details:', JSON.stringify(dataError, null, 2));
  } else {
    console.log(`✓ Query completed in ${elapsed2}ms`);
    console.log(`✓ Returned ${data?.length || 0} players`);

    if (data && data.length > 0) {
      console.log('\nFirst 10 players:');
      console.log('Year  Name                Pos  AB   IP   Rating');
      console.log('-'.repeat(80));
      data.forEach((p: any) => {
        const name = (p.players?.display_name || `${p.players?.first_name} ${p.players?.last_name}`).padEnd(18).substring(0, 18);
        const pos = (p.primary_position || '').padEnd(3);
        const ab = String(p.at_bats || 0).padStart(3);
        const ip = String(p.innings_pitched_outs || 0).padStart(3);
        const rating = p.apba_rating !== null ? String(p.apba_rating.toFixed(1)).padStart(6) : '  null';
        console.log(`${p.year}  ${name}  ${pos}  ${ab}  ${ip}  ${rating}`);
      });
    } else {
      console.log('❌ NO PLAYERS RETURNED!');
    }
  }

  // Now test with ALL seasons like the user has selected
  console.log('\n' + '='.repeat(80));
  console.log('TESTING WITH ALL 125 SEASONS (1901-2025)');
  console.log('='.repeat(80));

  const allSeasons = Array.from({ length: 125 }, (_, i) => 1901 + i);

  const { count: allCount, error: allCountError } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', allSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30');

  if (allCountError) {
    console.error('❌ ERROR:', allCountError);
  } else {
    console.log(`✓ Total players for all 125 seasons: ${allCount}`);
  }
}

testAnonKey().catch(console.error);

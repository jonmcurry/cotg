import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseAllSeasons() {
  console.log('='.repeat(80));
  console.log('TESTING WITH ALL SEASONS (1901-2025)');
  console.log('='.repeat(80));

  // Generate all seasons from 1901 to 2025
  const allSeasons = Array.from({ length: 125 }, (_, i) => 1901 + i);

  console.log(`Testing with ${allSeasons.length} seasons: ${allSeasons[0]}-${allSeasons[allSeasons.length - 1]}`);
  console.log('-'.repeat(80));

  const startTime = Date.now();

  // Get count with the exact query from DraftBoard.tsx
  const { count: totalCount, error: countError } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', allSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30');

  const elapsed = Date.now() - startTime;

  if (countError) {
    console.error('ERROR getting count:', countError);
    console.error('Error details:', JSON.stringify(countError, null, 2));
  } else {
    console.log(`✓ Total players matching criteria: ${totalCount}`);
    console.log(`✓ Query completed in ${elapsed}ms`);
  }

  // Try to get first batch of data
  console.log('\nTrying to fetch first batch of 10 players...');
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
    .in('year', allSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .order('apba_rating', { ascending: false, nullsFirst: false })
    .limit(10);

  const elapsed2 = Date.now() - startTime2;

  if (dataError) {
    console.error('ERROR getting data:', dataError);
    console.error('Error details:', JSON.stringify(dataError, null, 2));
  } else {
    console.log(`✓ Query completed in ${elapsed2}ms`);
    console.log(`✓ Returned ${data?.length || 0} players`);

    if (data && data.length > 0) {
      console.log('\nTop 10 players:');
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
    }
  }

  // Check if the .in() filter with 125 values is the problem
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING IF .in() WITH 125 VALUES IS THE ISSUE');
  console.log('='.repeat(80));

  console.log('PostgREST .in() operator should support large arrays...');
  console.log(`Array length: ${allSeasons.length} values`);
  console.log(`First 10: [${allSeasons.slice(0, 10).join(', ')}, ...]`);
  console.log(`Last 10: [..., ${allSeasons.slice(-10).join(', ')}]`);
}

diagnoseAllSeasons().catch(console.error);

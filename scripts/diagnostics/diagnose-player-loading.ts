import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnosePlayerLoading() {
  console.log('='.repeat(80));
  console.log('DIAGNOSING PLAYER LOADING ISSUE');
  console.log('='.repeat(80));

  // Test the exact query from DraftBoard.tsx for a few sample seasons
  const testSeasons = [1928, 1929, 1930, 1999];

  console.log(`\nTesting query for seasons: ${testSeasons.join(', ')}`);
  console.log('-'.repeat(80));

  // Get count with the exact query
  const { count: totalCount, error: countError } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30');

  if (countError) {
    console.error('ERROR getting count:', countError);
  } else {
    console.log(`Total players matching criteria: ${totalCount}`);
  }

  // Get sample data with the exact query
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

  if (dataError) {
    console.error('ERROR getting data:', dataError);
  } else {
    console.log(`\nSample players (top 10 by rating):`);
    console.log('Year  Name                Pos  AB   IP   Rating');
    console.log('-'.repeat(80));
    data?.forEach((p: any) => {
      const name = (p.players?.display_name || `${p.players?.first_name} ${p.players?.last_name}`).padEnd(18).substring(0, 18);
      const pos = (p.primary_position || '').padEnd(3);
      const ab = String(p.at_bats || 0).padStart(3);
      const ip = String(p.innings_pitched_outs || 0).padStart(3);
      const rating = p.apba_rating !== null ? String(p.apba_rating.toFixed(1)).padStart(6) : '  null';
      console.log(`${p.year}  ${name}  ${pos}  ${ab}  ${ip}  ${rating}`);
    });
  }

  // Check breakdown by season
  console.log('\n' + '='.repeat(80));
  console.log('BREAKDOWN BY SEASON');
  console.log('='.repeat(80));

  for (const year of testSeasons) {
    const { count } = await supabase
      .from('player_seasons')
      .select('id', { count: 'exact', head: true })
      .eq('year', year)
      .or('at_bats.gte.200,innings_pitched_outs.gte.30');

    console.log(`${year}: ${count} players`);
  }

  // Check if there are ANY players in those seasons at all
  console.log('\n' + '='.repeat(80));
  console.log('TOTAL PLAYERS PER SEASON (no filters)');
  console.log('='.repeat(80));

  for (const year of testSeasons) {
    const { count } = await supabase
      .from('player_seasons')
      .select('id', { count: 'exact', head: true })
      .eq('year', year);

    console.log(`${year}: ${count} total player_seasons records`);
  }

  // Check for players with null ratings
  console.log('\n' + '='.repeat(80));
  console.log('RATING DISTRIBUTION');
  console.log('='.repeat(80));

  const { count: nullRatings } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .is('apba_rating', null);

  const { count: zeroRatings } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .eq('apba_rating', 0);

  const { count: validRatings } = await supabase
    .from('player_seasons')
    .select('id', { count: 'exact', head: true })
    .in('year', testSeasons)
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .gt('apba_rating', 0);

  console.log(`Players with null rating: ${nullRatings}`);
  console.log(`Players with 0 rating: ${zeroRatings}`);
  console.log(`Players with rating > 0: ${validRatings}`);
}

diagnosePlayerLoading().catch(console.error);

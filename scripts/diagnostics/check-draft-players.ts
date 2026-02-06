import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDraftPlayers() {
  // Check players that would be available for draft (200+ AB or 30+ IP)
  const { data, error } = await supabase
    .from('player_seasons')
    .select('id, year, primary_position, at_bats, apba_rating, players!inner(first_name, last_name)')
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .gte('apba_rating', 1)
    .order('apba_rating', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Top 20 rated players available for draft (rating >= 1):');
  console.log('Year  Name                Pos  AB   Rating');
  console.log('----  ------------------  ---  ---  ------');

  if (data && data.length > 0) {
    data.forEach((p: any) => {
      const firstName = p.players?.first_name || '';
      const lastName = p.players?.last_name || '';
      const name = `${firstName} ${lastName}`.padEnd(18);
      const pos = (p.primary_position || '').padEnd(3);
      const ab = String(p.at_bats || 0).padStart(3);
      const rating = String(p.apba_rating?.toFixed(1) || '0').padStart(6);
      console.log(`${p.year}  ${name}  ${pos}  ${ab}  ${rating}`);
    });
  } else {
    console.log('NO PLAYERS FOUND WITH RATING >= 1');
  }

  // Check total count with ratings > 0
  const { count: goodCount } = await supabase
    .from('player_seasons')
    .select('*', { count: 'exact', head: true })
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .gt('apba_rating', 0);

  console.log(`\nTotal draft-eligible players with rating > 0: ${goodCount}`);

  // Check total count with rating = 0 or null
  const { count: zeroCount } = await supabase
    .from('player_seasons')
    .select('*', { count: 'exact', head: true })
    .or('at_bats.gte.200,innings_pitched_outs.gte.30')
    .or('apba_rating.eq.0,apba_rating.is.null');

  console.log(`Total draft-eligible players with rating = 0 or null: ${zeroCount}`);
}

checkDraftPlayers().catch(console.error);

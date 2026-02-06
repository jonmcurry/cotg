import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPlayers() {
  // Check total count
  const { count } = await supabase
    .from('player_seasons')
    .select('*', { count: 'exact', head: true });

  console.log('Total player_seasons:', count);

  // Get sample rows to debug
  const { data: sampleData, error: sampleError } = await supabase
    .from('player_seasons')
    .select('year, primary_position, at_bats, apba_rating, players(full_name, first_name, last_name)')
    .gte('apba_rating', 80)
    .limit(10);

  if (sampleError) {
    console.error('Sample error:', sampleError);
  } else {
    console.log('\nSample high-rated players (rating >= 80):');
    console.log(JSON.stringify(sampleData, null, 2));
  }

  // Check Babe Ruth (best seasons)
  const { data: babe } = await supabase
    .from('player_seasons')
    .select('year, primary_position, at_bats, apba_rating, ops, isolated_power, runs_created_advanced, players!inner(first_name, last_name)')
    .eq('players.last_name', 'Ruth')
    .gte('at_bats', 400)
    .order('apba_rating', { ascending: false })
    .limit(5);

  console.log('\nBabe Ruth Top Seasons (400+ AB):');
  console.log('Year  Name                Pos  AB   Rating  OPS    ISO    RC');
  console.log('----  ------------------  ---  ---  ------  -----  -----  ---');
  babe?.forEach((p: any) => {
    const firstName = p.players?.first_name || '';
    const lastName = p.players?.last_name || '';
    const name = `${firstName} ${lastName}`.padEnd(18);
    const pos = (p.primary_position || '').padEnd(3);
    const ab = String(p.at_bats || 0).padStart(3);
    const rating = String(p.apba_rating?.toFixed(1) || '0').padStart(6);
    const ops = String(p.ops?.toFixed(3) || '0').padStart(5);
    const iso = String(p.isolated_power?.toFixed(3) || '0').padStart(5);
    const rc = String(Math.round(p.runs_created_advanced || 0)).padStart(3);
    console.log(`${p.year}  ${name}  ${pos}  ${ab}  ${rating}  ${ops}  ${iso}  ${rc}`);
  });

  // Check Gary Sanchez
  const { data: gary } = await supabase
    .from('player_seasons')
    .select('year, primary_position, at_bats, apba_rating, ops, isolated_power, runs_created_advanced, players!inner(first_name, last_name)')
    .eq('players.last_name', 'Sanchez')
    .eq('players.first_name', 'Gary')
    .gte('at_bats', 200)
    .order('apba_rating', { ascending: false })
    .limit(5);

  console.log('\nGary Sanchez Top Seasons (200+ AB):');
  console.log('Year  Name                Pos  AB   Rating  OPS    ISO    RC');
  console.log('----  ------------------  ---  ---  ------  -----  -----  ---');
  gary?.forEach((p: any) => {
    const firstName = p.players?.first_name || '';
    const lastName = p.players?.last_name || '';
    const name = `${firstName} ${lastName}`.padEnd(18);
    const pos = (p.primary_position || '').padEnd(3);
    const ab = String(p.at_bats || 0).padStart(3);
    const rating = String(p.apba_rating?.toFixed(1) || '0').padStart(6);
    const ops = String(p.ops?.toFixed(3) || '0').padStart(5);
    const iso = String(p.isolated_power?.toFixed(3) || '0').padStart(5);
    const rc = String(Math.round(p.runs_created_advanced || 0)).padStart(3);
    console.log(`${p.year}  ${name}  ${pos}  ${ab}  ${rating}  ${ops}  ${iso}  ${rc}`);
  });

  // Get highest rated players with significant playing time
  const { data: topRated } = await supabase
    .from('player_seasons')
    .select('year, primary_position, at_bats, apba_rating, ops, isolated_power, runs_created_advanced, players!inner(first_name, last_name)')
    .gte('at_bats', 400)
    .order('apba_rating', { ascending: false })
    .limit(15);

  console.log('\nTop 15 Rated Players (400+ AB):');
  console.log('Year  Name                Pos  AB   Rating  OPS    ISO    RC');
  console.log('----  ------------------  ---  ---  ------  -----  -----  ---');
  if (topRated && topRated.length > 0) {
    topRated.forEach((p: any) => {
      const firstName = p.players?.first_name || '';
      const lastName = p.players?.last_name || '';
      const name = `${firstName} ${lastName}`.padEnd(18);
      const pos = (p.primary_position || '').padEnd(3);
      const ab = String(p.at_bats || 0).padStart(3);
      const rating = String(p.apba_rating?.toFixed(1) || '0').padStart(6);
      const ops = String(p.ops?.toFixed(3) || '0').padStart(5);
      const iso = String(p.isolated_power?.toFixed(3) || '0').padStart(5);
      const rc = String(Math.round(p.runs_created_advanced || 0)).padStart(3);
      console.log(`${p.year}  ${name}  ${pos}  ${ab}  ${rating}  ${ops}  ${iso}  ${rc}`);
    });
  } else {
    console.log('(None found)');
  }
}

checkPlayers().catch(console.error);

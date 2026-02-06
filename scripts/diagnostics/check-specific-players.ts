import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSpecificPlayers() {
  console.log('='.repeat(80));
  console.log('CHECKING SPECIFIC PLAYER RATINGS');
  console.log('='.repeat(80));

  // Check Mike Lieberthal 1999
  const { data: lieberthal } = await supabase
    .from('player_seasons')
    .select('id, year, primary_position, at_bats, apba_rating, ops, isolated_power, runs_created_advanced, batting_avg, home_runs, rbi, players!inner(first_name, last_name)')
    .eq('players.last_name', 'Lieberthal')
    .eq('players.first_name', 'Mike')
    .eq('year', 1999)
    .single();

  // Check Lou Gehrig 1930
  const { data: gehrig } = await supabase
    .from('player_seasons')
    .select('id, year, primary_position, at_bats, apba_rating, ops, isolated_power, runs_created_advanced, batting_avg, home_runs, rbi, players!inner(first_name, last_name)')
    .eq('players.last_name', 'Gehrig')
    .eq('players.first_name', 'Lou')
    .eq('year', 1930)
    .single();

  // Check Babe Ruth 1928
  const { data: ruth } = await supabase
    .from('player_seasons')
    .select('id, year, primary_position, at_bats, apba_rating, ops, isolated_power, runs_created_advanced, batting_avg, home_runs, rbi, players!inner(first_name, last_name)')
    .eq('players.last_name', 'Ruth')
    .eq('players.first_name', 'Babe')
    .eq('year', 1928)
    .single();

  function displayPlayer(player: any, name: string) {
    console.log(`\n${name}:`);
    console.log(`  Year: ${player.year}`);
    console.log(`  Position: ${player.primary_position}`);
    console.log(`  At Bats: ${player.at_bats}`);
    console.log(`  Batting Avg: ${player.batting_avg?.toFixed(3) || 'null'}`);
    console.log(`  Home Runs: ${player.home_runs}`);
    console.log(`  RBI: ${player.rbi}`);
    console.log(`  ---`);
    console.log(`  OPS: ${player.ops?.toFixed(3) || 'null'}`);
    console.log(`  ISO: ${player.isolated_power?.toFixed(3) || 'null'}`);
    console.log(`  RC (Advanced): ${player.runs_created_advanced?.toFixed(1) || 'null'}`);
    console.log(`  ---`);
    console.log(`  APBA Rating (DB): ${player.apba_rating?.toFixed(1) || 'null'}`);

    // Calculate what the rating SHOULD be
    const components: number[] = [];
    if (player.ops !== null) components.push(player.ops * 100);
    if (player.runs_created_advanced !== null) components.push(player.runs_created_advanced / 5);
    if (player.isolated_power !== null) components.push(player.isolated_power * 100);

    const calculatedRating = components.length > 0
      ? components.reduce((sum, val) => sum + val, 0) / components.length
      : 0;

    console.log(`  CALCULATED Rating: ${calculatedRating.toFixed(1)}`);
    console.log(`  Component 1 (OPS × 100): ${player.ops !== null ? (player.ops * 100).toFixed(1) : 'null'}`);
    console.log(`  Component 2 (RC / 5): ${player.runs_created_advanced !== null ? (player.runs_created_advanced / 5).toFixed(1) : 'null'}`);
    console.log(`  Component 3 (ISO × 100): ${player.isolated_power !== null ? (player.isolated_power * 100).toFixed(1) : 'null'}`);

    if (player.apba_rating !== null && Math.abs(player.apba_rating - calculatedRating) > 0.1) {
      console.log(`  ⚠️  MISMATCH! DB rating (${player.apba_rating.toFixed(1)}) != calculated (${calculatedRating.toFixed(1)})`);
    }
  }

  if (lieberthal) displayPlayer(lieberthal, 'Mike Lieberthal 1999 PHI');
  if (gehrig) displayPlayer(gehrig, 'Lou Gehrig 1930 NYA');
  if (ruth) displayPlayer(ruth, 'Babe Ruth 1928 NYA');

  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON');
  console.log('='.repeat(80));
  console.log('Player                 OPS      ISO      RC     Rating(DB)  Rating(Calc)');
  console.log('-'.repeat(80));
  if (lieberthal) {
    const calc = ((lieberthal.ops || 0) * 100 + (lieberthal.runs_created_advanced || 0) / 5 + (lieberthal.isolated_power || 0) * 100) / 3;
    console.log(`Lieberthal 1999       ${(lieberthal.ops || 0).toFixed(3)}  ${(lieberthal.isolated_power || 0).toFixed(3)}  ${(lieberthal.runs_created_advanced || 0).toFixed(1).padStart(5)}  ${(lieberthal.apba_rating || 0).toFixed(1).padStart(10)}  ${calc.toFixed(1).padStart(12)}`);
  }
  if (gehrig) {
    const calc = ((gehrig.ops || 0) * 100 + (gehrig.runs_created_advanced || 0) / 5 + (gehrig.isolated_power || 0) * 100) / 3;
    console.log(`Gehrig 1930           ${(gehrig.ops || 0).toFixed(3)}  ${(gehrig.isolated_power || 0).toFixed(3)}  ${(gehrig.runs_created_advanced || 0).toFixed(1).padStart(5)}  ${(gehrig.apba_rating || 0).toFixed(1).padStart(10)}  ${calc.toFixed(1).padStart(12)}`);
  }
  if (ruth) {
    const calc = ((ruth.ops || 0) * 100 + (ruth.runs_created_advanced || 0) / 5 + (ruth.isolated_power || 0) * 100) / 3;
    console.log(`Ruth 1928             ${(ruth.ops || 0).toFixed(3)}  ${(ruth.isolated_power || 0).toFixed(3)}  ${(ruth.runs_created_advanced || 0).toFixed(1).padStart(5)}  ${(ruth.apba_rating || 0).toFixed(1).padStart(10)}  ${calc.toFixed(1).padStart(12)}`);
  }
}

checkSpecificPlayers().catch(console.error);

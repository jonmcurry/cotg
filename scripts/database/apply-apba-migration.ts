/**
 * Apply APBA rating migration to Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function applyMigration() {
  console.log('Applying APBA rating migration...\n')

  // Read migration SQL file
  const migrationSQL = fs.readFileSync(
    'c:\\Users\\jonmc\\dev\\cotg\\database\\migrations\\20260127_add_apba_rating.sql',
    'utf-8'
  )

  // We can't run DDL with the anon key, so we'll use the client to check if column exists
  // and if not, inform the user to run it manually via Supabase dashboard

  console.log('Checking if apba_rating column exists...')

  // Try to select apba_rating column
  const { data, error } = await supabase
    .from('player_seasons')
    .select('apba_rating')
    .limit(1)

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n⚠️  Column apba_rating does not exist yet.')
      console.log('\nTo apply the migration, you have two options:')
      console.log('\n1. Via Supabase Dashboard SQL Editor:')
      console.log('   - Go to https://supabase.com/dashboard')
      console.log('   - Select your project')
      console.log('   - Go to SQL Editor')
      console.log('   - Paste the contents of: database/migrations/20260127_add_apba_rating.sql')
      console.log('   - Click "Run"')
      console.log('\n2. Via psql (if you have service_role key):')
      console.log('   - Use the service_role connection string from Supabase dashboard')
      console.log('   - Run: psql [connection_string] < database/migrations/20260127_add_apba_rating.sql')
      console.log('\nMigration SQL:')
      console.log('=' * 80)
      console.log(migrationSQL)
      process.exit(1)
    } else {
      console.error('Error checking for apba_rating column:', error)
      process.exit(1)
    }
  }

  console.log('✓ Column apba_rating already exists!')
  console.log('\nMigration complete.')
}

applyMigration()

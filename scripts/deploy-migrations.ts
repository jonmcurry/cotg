/**
 * Deploy Supabase Migrations
 *
 * Deploys all SQL migration files to Supabase in order.
 * Uses service role key for full database access.
 *
 * Usage: npm run deploy:migrations
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file')
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface MigrationResult {
  file: string
  success: boolean
  error?: string
  duration: number
}

async function executeSQLFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = readFileSync(filePath, 'utf-8')

    // Remove comments and split by statement
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')

    // Execute the entire migration file as one transaction
    const { error } = await supabase.rpc('exec_sql', { sql_query: statements })

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      // This is a fallback - we'll execute directly via REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      })

      if (!response.ok) {
        // Final fallback: use pg connection string if available
        // For now, we'll use the SQL Editor API endpoint
        const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.pgrst.object+json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'return=representation',
          },
          body: sql,
        })

        if (!sqlResponse.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: Unable to execute migration. Please run manually in Supabase SQL Editor.`,
          }
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
    }
  }
}

async function deployMigrations(): Promise<void> {
  console.log('\n🚀 Deploying Supabase Migrations\n')
  console.log(`📍 Target: ${SUPABASE_URL}`)
  console.log(`🔑 Using service role key\n`)

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations')

  // Get all .sql files in order
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration files:\n`)

  const results: MigrationResult[] = []

  for (const file of files) {
    const filePath = join(migrationsDir, file)
    console.log(`📄 Executing: ${file}`)

    const startTime = Date.now()
    const result = await executeSQLFile(filePath)
    const duration = Date.now() - startTime

    results.push({
      file,
      success: result.success,
      error: result.error,
      duration,
    })

    if (result.success) {
      console.log(`   ✅ Success (${duration}ms)\n`)
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`)
      console.log(`\n⚠️  Migration failed. Please run remaining migrations manually.\n`)
      console.log(`To run manually:`)
      console.log(`1. Go to https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/sql`)
      console.log(`2. Copy the SQL from: ${filePath}`)
      console.log(`3. Paste and run in SQL Editor\n`)
      break
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary')
  console.log('='.repeat(60) + '\n')

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  results.forEach(r => {
    const status = r.success ? '✅' : '❌'
    const time = `${r.duration}ms`
    console.log(`${status} ${r.file.padEnd(40)} ${time}`)
  })

  console.log(`\n📊 Total: ${successful}/${files.length} successful, ${failed} failed`)
  console.log('='.repeat(60) + '\n')

  if (failed > 0) {
    console.log('⚠️  Some migrations failed. Please run them manually in Supabase SQL Editor.')
    console.log(`   URL: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/sql\n`)
    process.exit(1)
  } else {
    console.log('🎉 All migrations deployed successfully!\n')
    console.log('Next steps:')
    console.log('  1. Verify tables: npm run db:verify')
    console.log('  2. Import Lahman data: npm run import:lahman\n')
  }
}

// Run migrations
deployMigrations().catch(error => {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
})

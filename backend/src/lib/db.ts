/**
 * Neon PostgreSQL Database Client
 * Uses pg Pool for connection pooling
 */

import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable')
}

// Create connection pool with Neon serverless-optimized settings
// Neon can have cold starts that take 5-15s, so we need longer timeouts
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  },
  max: 10, // Reduced pool size - Neon serverless has connection limits
  idleTimeoutMillis: 120000, // Keep idle connections longer (2 min) to avoid cold starts
  connectionTimeoutMillis: 30000, // Increased for Neon cold starts (30s)
  // Keep-alive settings to prevent connection drops
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
})

// Log pool errors
pool.on('error', (err: Error) => {
  console.error('[DB] Unexpected pool error:', err)
})

// Helper function for queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start

  // Log slow queries (>1 second)
  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100))
  }

  return result.rows as T[]
}

// Helper for single row queries
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

// Helper for count queries
export async function queryCount(text: string, params?: any[]): Promise<number> {
  const result = await pool.query(text, params)
  return parseInt(result.rows[0]?.count || '0', 10)
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    console.log('[DB] Connection successful')
    return true
  } catch (error) {
    console.error('[DB] Connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end()
  console.log('[DB] Pool closed')
}

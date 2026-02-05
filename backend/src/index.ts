/**
 * COTG API Server
 * Express backend for Century of the Game
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool } from './lib/db'

// Route imports
import leaguesRouter from './routes/leagues'
import draftRouter from './routes/draft'
import picksRouter from './routes/picks'
import playersRouter from './routes/players'
import cpuRouter from './routes/cpu'
import lineupRouter from './routes/lineup'
import scheduleRouter from './routes/schedule'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration - handle multiple origins for dev/prod
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CORS_ORIGIN
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`)
      callback(null, true) // Still allow for debugging - remove in production
    }
  },
  credentials: true
}))
app.use(express.json())

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    // Verify database connection
    await pool.query('SELECT 1')

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (err) {
    console.error('[Health] Database check failed:', err)
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }
})

// Route handlers
app.use('/api/leagues', leaguesRouter)
app.use('/api/draft/sessions', draftRouter)
app.use('/api/draft/sessions', picksRouter)
app.use('/api/draft/sessions', cpuRouter)
app.use('/api/draft/sessions', scheduleRouter)
app.use('/api/players', playersRouter)
app.use('/api/teams', lineupRouter)

// Global error handler - ensures CORS headers are always sent
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err.message)
  console.error(err.stack)

  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`COTG API server running on port ${PORT}`)
})

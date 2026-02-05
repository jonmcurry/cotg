/**
 * COTG API Server
 * Express backend for Century of the Game
 */

import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
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

// Request timeout: 55 seconds (Render free tier has ~60s limit)
// This returns an error BEFORE Render's proxy timeout to ensure CORS headers are sent
const REQUEST_TIMEOUT_MS = 55000

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

// Request timeout middleware - ensures CORS headers are sent even on slow requests
// Prevents 520 errors from Render's proxy which bypass CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[Timeout] Request timeout after ${REQUEST_TIMEOUT_MS}ms: ${req.method} ${req.path}`)
      res.status(504).json({
        result: 'error',
        error: 'Request timeout - database may be warming up. Please try again.',
        path: req.path,
        timeoutMs: REQUEST_TIMEOUT_MS
      })
    }
  }, REQUEST_TIMEOUT_MS)

  res.on('finish', () => clearTimeout(timeout))
  res.on('close', () => clearTimeout(timeout))
  next()
})

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

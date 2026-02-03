/**
 * COTG API Server
 * Express backend for Century of the Game
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase } from './lib/supabase'

// Route imports
import leaguesRouter from './routes/leagues'
import draftRouter from './routes/draft'
import picksRouter from './routes/picks'
import playersRouter from './routes/players'
import cpuRouter from './routes/cpu'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    // Verify Supabase connection
    const { error } = await supabase.from('players').select('id').limit(1)
    if (error) throw error

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
app.use('/api/players', playersRouter)

// Start server
app.listen(PORT, () => {
  console.log(`COTG API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

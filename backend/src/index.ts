/**
 * COTG API Server
 * Express backend for Century of the Game
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase } from './lib/supabase'

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

// Placeholder routes - to be implemented
app.get('/api/leagues', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('[Leagues] Error:', err)
    res.status(500).json({ error: 'Failed to fetch leagues' })
  }
})

app.get('/api/players/pool', async (req, res) => {
  try {
    const { seasons, limit = 1000 } = req.query

    let query = supabase
      .from('player_seasons')
      .select(`
        id,
        player_id,
        year,
        team_id,
        primary_position,
        apba_rating,
        war,
        at_bats,
        batting_avg,
        hits,
        home_runs,
        rbi,
        stolen_bases,
        on_base_pct,
        slugging_pct,
        innings_pitched_outs,
        wins,
        losses,
        era,
        strikeouts_pitched,
        saves,
        shutouts,
        whip,
        players!inner (
          id,
          display_name,
          first_name,
          last_name,
          bats
        )
      `)
      .order('apba_rating', { ascending: false })
      .limit(Number(limit))

    if (seasons) {
      const yearList = String(seasons).split(',').map(Number)
      query = query.in('year', yearList)
    }

    const { data, error } = await query
    if (error) throw error

    res.json(data)
  } catch (err) {
    console.error('[Players Pool] Error:', err)
    res.status(500).json({ error: 'Failed to fetch player pool' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`COTG API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

/**
 * Lineup Editor Component
 * Allows users to set lineups for vs RHP and vs LHP
 * Interaction: Click available player -> Click slot to assign
 * Supports DH: Slot 9 defaults to DH, any slot can be toggled to DH
 */

import { useState, useEffect } from 'react'
import type { DraftTeam, LineupSlot, TeamDepthChart, PositionCode } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'
import { useDraftStore } from '../../stores/draftStore'

// Standard defensive positions for a 9-man lineup (AL rules with DH)
const DEFAULT_DEFENSIVE_POSITIONS: PositionCode[] = ['C', '1B', '2B', 'SS', '3B', 'OF', 'OF', 'OF', 'DH']

interface Props {
    team: DraftTeam
    players: PlayerSeason[]
}

export default function LineupEditor({ team, players }: Props) {
    const { updateTeamDepthChart } = useDraftStore()
    const [activeTab, setActiveTab] = useState<'vsRHP' | 'vsLHP'>('vsRHP')
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

    // Initialize depth chart if missing - with proper defensive positions
    useEffect(() => {
        if (!team.depthChart) {
            const initialLineup: LineupSlot[] = Array.from({ length: 9 }, (_, i) => ({
                slotNumber: i + 1,
                playerSeasonId: null,
                position: DEFAULT_DEFENSIVE_POSITIONS[i], // Proper defensive positions
            }))

            const newDepthChart: TeamDepthChart = {
                lineupVS_RHP: [...initialLineup],
                lineupVS_LHP: initialLineup.map(s => ({ ...s })), // Clone for LHP
                rotation: [],
                bullpen: {
                    closer: null,
                    setup: []
                }
            }
            updateTeamDepthChart(team.id, newDepthChart)
        }
    }, [team.id, team.depthChart, updateTeamDepthChart])

    if (!team.depthChart) return null

    const currentLineup = activeTab === 'vsRHP' ? team.depthChart.lineupVS_RHP : team.depthChart.lineupVS_LHP

    // Filter for batters only (exclude pitchers)
    const availableBatters = team.roster
        .filter(slot => slot.isFilled && slot.playerSeasonId && !['SP', 'RP', 'CL'].includes(slot.position))
        .map(slot => players.find(p => p.id === slot.playerSeasonId))
        .filter((p): p is PlayerSeason => !!p)

    const handlePlayerClick = (playerId: string) => {
        setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId)
    }

    const handleSlotClick = (slotIndex: number) => {
        if (!team.depthChart) return

        const newDepthChart = { ...team.depthChart }
        const targetLineup = activeTab === 'vsRHP' ? [...newDepthChart.lineupVS_RHP] : [...newDepthChart.lineupVS_LHP]
        const newLineup = [...targetLineup]

        if (selectedPlayerId) {
            // ASSIGN MODE: Place selected player in slot
            const player = players.find(p => p.id === selectedPlayerId)

            // Check if player is already in lineup, remove if so
            const existingIndex = newLineup.findIndex(s => s.playerSeasonId === selectedPlayerId)
            if (existingIndex !== -1) {
                newLineup[existingIndex] = { ...newLineup[existingIndex], playerSeasonId: null }
            }

            // Assign to new slot - keep the slot's defensive position (don't overwrite with player's primary)
            // This allows a 1B to play DH if the slot is designated as DH
            newLineup[slotIndex] = {
                ...newLineup[slotIndex],
                playerSeasonId: selectedPlayerId,
                // Keep existing position if it's DH or if slot was already set, otherwise use player's position
                position: newLineup[slotIndex].position === 'DH'
                    ? 'DH'
                    : (player?.primary_position as PositionCode || newLineup[slotIndex].position)
            }
            setSelectedPlayerId(null) // Clear selection
        } else {
            // CLEAR MODE: If slot is filled, clear it
            if (newLineup[slotIndex].playerSeasonId) {
                newLineup[slotIndex] = { ...newLineup[slotIndex], playerSeasonId: null }
            }
        }

        // Update state
        if (activeTab === 'vsRHP') {
            newDepthChart.lineupVS_RHP = newLineup
        } else {
            newDepthChart.lineupVS_LHP = newLineup
        }

        updateTeamDepthChart(team.id, newDepthChart)
    }

    // Toggle a slot to/from DH
    const handleToggleDH = (slotIndex: number, e: React.MouseEvent) => {
        e.stopPropagation() // Don't trigger slot click
        if (!team.depthChart) return

        const newDepthChart = { ...team.depthChart }
        const targetLineup = activeTab === 'vsRHP' ? [...newDepthChart.lineupVS_RHP] : [...newDepthChart.lineupVS_LHP]
        const newLineup = [...targetLineup]
        const currentSlot = newLineup[slotIndex]

        // Toggle between DH and player's natural position (or default position)
        const player = currentSlot.playerSeasonId
            ? players.find(p => p.id === currentSlot.playerSeasonId)
            : null

        if (currentSlot.position === 'DH') {
            // Switching FROM DH - use player's natural position or default
            newLineup[slotIndex] = {
                ...currentSlot,
                position: (player?.primary_position as PositionCode) || DEFAULT_DEFENSIVE_POSITIONS[slotIndex]
            }
        } else {
            // Switching TO DH
            newLineup[slotIndex] = {
                ...currentSlot,
                position: 'DH'
            }
        }

        if (activeTab === 'vsRHP') {
            newDepthChart.lineupVS_RHP = newLineup
        } else {
            newDepthChart.lineupVS_LHP = newLineup
        }

        updateTeamDepthChart(team.id, newDepthChart)
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex gap-4 mb-4">
                <button
                    onClick={() => setActiveTab('vsRHP')}
                    className={`flex-1 py-3 font-display font-bold text-lg uppercase tracking-wider border-2 transition-all ${activeTab === 'vsRHP'
                            ? 'bg-charcoal text-white border-charcoal'
                            : 'bg-transparent text-charcoal/50 border-charcoal/10 hover:border-charcoal/30'
                        }`}
                >
                    vs RHP
                </button>
                <button
                    onClick={() => setActiveTab('vsLHP')}
                    className={`flex-1 py-3 font-display font-bold text-lg uppercase tracking-wider border-2 transition-all ${activeTab === 'vsLHP'
                            ? 'bg-charcoal text-white border-charcoal'
                            : 'bg-transparent text-charcoal/50 border-charcoal/10 hover:border-charcoal/30'
                        }`}
                >
                    vs LHP
                </button>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Available Batters */}
                <div className="col-span-5 flex flex-col bg-white border border-charcoal/10 rounded-sm overflow-hidden">
                    <div className="bg-charcoal/5 p-3 border-b border-charcoal/10">
                        <h3 className="font-display font-bold text-charcoal text-sm uppercase tracking-wide">Available Batters</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {availableBatters.map(player => {
                            const isInLineup = currentLineup.some(s => s.playerSeasonId === player.id)
                            const isSelected = selectedPlayerId === player.id

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => handlePlayerClick(player.id)}
                                    className={`w-full text-left p-2 rounded flex items-center justify-between border transition-all ${isSelected
                                            ? 'bg-gold text-charcoal border-gold shadow-md ring-2 ring-gold/50'
                                            : isInLineup
                                                ? 'bg-charcoal/5 text-charcoal/40 border-transparent grayscale'
                                                : 'bg-white text-charcoal border-charcoal/10 hover:border-burgundy/30'
                                        }`}
                                >
                                    <div className="flex-1 truncate">
                                        <span className="font-bold text-sm">{player.last_name}, {player.first_name}</span>
                                        <span className="ml-2 text-xs opacity-70">{player.primary_position}</span>
                                    </div>
                                    <div className="text-xs font-mono bg-black/5 px-1 rounded">
                                        .{player.batting_avg?.toFixed(3).slice(2) || '---'}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Batting Order */}
                <div className="col-span-7 flex flex-col bg-cream-light border-2 border-charcoal/20 rounded-sm overflow-hidden relative">
                    <div className="bg-charcoal p-4 text-center">
                        <h3 className="font-display font-bold text-gold text-xl uppercase tracking-widest">
                            {activeTab === 'vsRHP' ? 'Lineup vs RHP' : 'Lineup vs LHP'}
                        </h3>
                        <p className="text-cream/50 text-xs mt-1">Click position badge to toggle DH</p>
                    </div>

                    <div className="flex-1 p-6 space-y-3 overflow-y-auto">
                        {currentLineup.map((slot, idx) => {
                            const player = slot.playerSeasonId ? players.find(p => p.id === slot.playerSeasonId) ?? null : null
                            const isDH = slot.position === 'DH'

                            return (
                                <div key={idx} className="flex items-center gap-4">
                                    {/* Batting Order Number */}
                                    <div className="w-8 h-8 flex items-center justify-center bg-charcoal text-gold font-display font-bold rounded-full shadow-sm">
                                        {slot.slotNumber}
                                    </div>

                                    {/* Defensive Position Badge - Clickable to toggle DH */}
                                    <button
                                        onClick={(e) => handleToggleDH(idx, e)}
                                        className={`w-10 h-10 flex items-center justify-center font-display font-bold text-sm rounded transition-all ${
                                            isDH
                                                ? 'bg-burgundy text-white hover:bg-burgundy/80'
                                                : 'bg-charcoal/10 text-charcoal hover:bg-charcoal/20'
                                        }`}
                                        title={isDH ? 'Click to assign field position' : 'Click to make DH'}
                                    >
                                        {slot.position}
                                    </button>

                                    {/* Player Slot */}
                                    <button
                                        onClick={() => handleSlotClick(idx)}
                                        className={`flex-1 h-14 rounded border-2 flex items-center px-4 transition-all ${player
                                                ? 'bg-white border-charcoal/10 hover:border-red-500/50 group relative overflow-hidden'
                                                : 'bg-charcoal/5 border-dashed border-charcoal/20 hover:bg-charcoal/10'
                                            } ${selectedPlayerId && !player ? 'ring-2 ring-gold animate-pulse' : ''}`}
                                    >
                                        {player ? (
                                            <>
                                                <div className="flex-1 text-left flex items-baseline gap-2">
                                                    <span className="font-display font-bold text-lg text-charcoal">{player.last_name}</span>
                                                    <span className="font-serif italic text-charcoal/60">{player.first_name}</span>
                                                    {/* Show natural position if different from slot position */}
                                                    {player.primary_position !== slot.position && (
                                                        <span className="text-xs text-charcoal/40">
                                                            (natural: {player.primary_position})
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Hover 'Remove' indicator */}
                                                <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <span className="text-red-600 font-bold uppercase tracking-widest text-xs">Remove / Swap</span>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-charcoal/30 font-serif italic text-sm w-full text-center">
                                                {selectedPlayerId ? 'Click to Assign Selected Player' : 'Empty Slot'}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Rotation Editor Component
 * Allows users to set starting rotation (SP1-SP5), closer, and setup men
 * Interaction: Click available pitcher -> Click slot to assign
 */

import { useState, useEffect } from 'react'
import type { DraftTeam, RotationSlot, TeamDepthChart, PositionCode } from '../../types/draft.types'
import type { PlayerSeason } from '../../types/player'
import { useDraftStore } from '../../stores/draftStore'

interface Props {
    team: DraftTeam
    players: PlayerSeason[]
}

export default function RotationEditor({ team, players }: Props) {
    const { updateTeamDepthChart } = useDraftStore()
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

    // Initialize rotation if missing
    useEffect(() => {
        if (team.depthChart && (team.depthChart.rotation?.length ?? 0) === 0) {
            const initialRotation: RotationSlot[] = Array.from({ length: 5 }, (_, i) => ({
                slotNumber: i + 1,
                playerSeasonId: null,
            }))

            const newDepthChart: TeamDepthChart = {
                ...team.depthChart,
                rotation: initialRotation,
                bullpen: {
                    closer: null,
                    setup: []
                }
            }
            updateTeamDepthChart(team.id, newDepthChart)
        }
    }, [team.id, team.depthChart, updateTeamDepthChart])

    if (!team.depthChart) return null

    const { rotation, bullpen } = team.depthChart

    // Filter for pitchers only
    const availablePitchers = team.roster
        .filter(slot => slot.isFilled && slot.playerSeasonId && ['SP', 'RP', 'CL'].includes(slot.position))
        .map(slot => ({
            player: players.find(p => p.id === slot.playerSeasonId),
            rosterPosition: slot.position
        }))
        .filter((p): p is { player: PlayerSeason; rosterPosition: PositionCode } => !!p.player)

    // Check if player is already assigned
    const isPlayerAssigned = (playerId: string) => {
        return rotation.some(s => s.playerSeasonId === playerId) ||
            bullpen.closer === playerId ||
            bullpen.setup.includes(playerId)
    }

    const handlePlayerClick = (playerId: string) => {
        setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId)
    }

    const handleRotationSlotClick = (slotIndex: number) => {
        if (!team.depthChart || !selectedPlayerId) return

        const newRotation = [...team.depthChart.rotation]

        // Remove player from existing rotation slot if present
        const existingIndex = newRotation.findIndex(s => s.playerSeasonId === selectedPlayerId)
        if (existingIndex !== -1) {
            newRotation[existingIndex] = { ...newRotation[existingIndex], playerSeasonId: null }
        }

        // Also check bullpen and remove
        let newBullpen = { ...team.depthChart.bullpen }
        if (newBullpen.closer === selectedPlayerId) {
            newBullpen.closer = null
        }
        newBullpen.setup = newBullpen.setup.filter(id => id !== selectedPlayerId)

        // Assign to rotation slot
        newRotation[slotIndex] = { ...newRotation[slotIndex], playerSeasonId: selectedPlayerId }

        updateTeamDepthChart(team.id, {
            ...team.depthChart,
            rotation: newRotation,
            bullpen: newBullpen
        })
        setSelectedPlayerId(null)
    }

    const handleCloserClick = () => {
        if (!team.depthChart || !selectedPlayerId) return

        // Remove from rotation if present
        const newRotation = team.depthChart.rotation.map(s =>
            s.playerSeasonId === selectedPlayerId ? { ...s, playerSeasonId: null } : s
        )

        // Remove from setup if present
        const newSetup = team.depthChart.bullpen.setup.filter(id => id !== selectedPlayerId)

        updateTeamDepthChart(team.id, {
            ...team.depthChart,
            rotation: newRotation,
            bullpen: {
                closer: selectedPlayerId,
                setup: newSetup
            }
        })
        setSelectedPlayerId(null)
    }

    const MAX_SETUP_MEN = 4

    const handleSetupClick = () => {
        if (!team.depthChart || !selectedPlayerId) return

        // Enforce setup men cap (unless player is already in setup - just a no-op)
        if (!team.depthChart.bullpen.setup.includes(selectedPlayerId) && team.depthChart.bullpen.setup.length >= MAX_SETUP_MEN) {
            console.warn(`[RotationEditor] Cannot add more than ${MAX_SETUP_MEN} setup men`)
            return
        }

        // Remove from rotation if present
        const newRotation = team.depthChart.rotation.map(s =>
            s.playerSeasonId === selectedPlayerId ? { ...s, playerSeasonId: null } : s
        )

        // Remove from closer if present
        let newCloser = team.depthChart.bullpen.closer
        if (newCloser === selectedPlayerId) {
            newCloser = null
        }

        // Add to setup if not already there
        const newSetup = team.depthChart.bullpen.setup.includes(selectedPlayerId)
            ? team.depthChart.bullpen.setup
            : [...team.depthChart.bullpen.setup, selectedPlayerId]

        updateTeamDepthChart(team.id, {
            ...team.depthChart,
            rotation: newRotation,
            bullpen: {
                closer: newCloser,
                setup: newSetup
            }
        })
        setSelectedPlayerId(null)
    }

    const handleClearSlot = (type: 'rotation' | 'closer' | 'setup', index?: number) => {
        if (!team.depthChart) return

        if (type === 'rotation' && index !== undefined) {
            const newRotation = [...team.depthChart.rotation]
            newRotation[index] = { ...newRotation[index], playerSeasonId: null }
            updateTeamDepthChart(team.id, { ...team.depthChart, rotation: newRotation })
        } else if (type === 'closer') {
            updateTeamDepthChart(team.id, {
                ...team.depthChart,
                bullpen: { ...team.depthChart.bullpen, closer: null }
            })
        } else if (type === 'setup' && index !== undefined) {
            const newSetup = [...team.depthChart.bullpen.setup]
            newSetup.splice(index, 1)
            updateTeamDepthChart(team.id, {
                ...team.depthChart,
                bullpen: { ...team.depthChart.bullpen, setup: newSetup }
            })
        }
    }

    const getPlayer = (playerId: string | null) => {
        if (!playerId) return null
        return players.find(p => p.id === playerId) || null
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Available Pitchers */}
                <div className="col-span-5 flex flex-col bg-white border border-charcoal/10 rounded-sm overflow-hidden">
                    <div className="bg-charcoal/5 p-3 border-b border-charcoal/10">
                        <h3 className="font-display font-bold text-charcoal text-sm uppercase tracking-wide">Available Pitchers</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {availablePitchers.map(({ player, rosterPosition }) => {
                            const isAssigned = isPlayerAssigned(player.id)
                            const isSelected = selectedPlayerId === player.id

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => handlePlayerClick(player.id)}
                                    className={`w-full text-left p-2 rounded flex items-center justify-between border transition-all ${isSelected
                                            ? 'bg-gold text-charcoal border-gold shadow-md ring-2 ring-gold/50'
                                            : isAssigned
                                                ? 'bg-charcoal/5 text-charcoal/40 border-transparent grayscale'
                                                : 'bg-white text-charcoal border-charcoal/10 hover:border-burgundy/30'
                                        }`}
                                >
                                    <div className="flex-1 truncate">
                                        <span className="font-bold text-sm">{player.last_name}, {player.first_name}</span>
                                        <span className={`ml-2 text-xs px-1 rounded ${rosterPosition === 'SP' ? 'bg-blue-100 text-blue-700' :
                                                rosterPosition === 'CL' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>{rosterPosition}</span>
                                    </div>
                                    <div className="text-xs font-mono bg-black/5 px-1 rounded">
                                        {player.era?.toFixed(2)} ERA
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Pitching Staff */}
                <div className="col-span-7 flex flex-col gap-6 overflow-y-auto">
                    {/* Starting Rotation */}
                    <div className="bg-cream-light border-2 border-charcoal/20 rounded-sm overflow-hidden">
                        <div className="bg-charcoal p-3 text-center">
                            <h3 className="font-display font-bold text-gold text-lg uppercase tracking-widest">Starting Rotation</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {rotation.map((slot, idx) => {
                                const player = getPlayer(slot.playerSeasonId)
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white font-display font-bold rounded shadow-sm">
                                            SP{slot.slotNumber}
                                        </div>
                                        <button
                                            onClick={() => player ? handleClearSlot('rotation', idx) : handleRotationSlotClick(idx)}
                                            className={`flex-1 h-12 rounded border-2 flex items-center px-3 transition-all ${player
                                                    ? 'bg-white border-charcoal/10 hover:border-red-500/50 group relative'
                                                    : 'bg-charcoal/5 border-dashed border-charcoal/20 hover:bg-charcoal/10'
                                                } ${selectedPlayerId && !player ? 'ring-2 ring-gold animate-pulse' : ''}`}
                                        >
                                            {player ? (
                                                <>
                                                    <span className="font-display font-bold text-charcoal">{player.last_name}</span>
                                                    <span className="ml-2 font-serif italic text-charcoal/60">{player.first_name}</span>
                                                    <span className="ml-auto text-xs font-mono text-charcoal/50">{player.era?.toFixed(2)} ERA</span>
                                                </>
                                            ) : (
                                                <span className="text-charcoal/30 font-serif italic text-sm w-full text-center">
                                                    {selectedPlayerId ? 'Click to Assign' : 'Empty'}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Bullpen */}
                    <div className="bg-cream-light border-2 border-charcoal/20 rounded-sm overflow-hidden">
                        <div className="bg-burgundy p-3 text-center">
                            <h3 className="font-display font-bold text-white text-lg uppercase tracking-widest">Bullpen</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Closer */}
                            <div>
                                <div className="text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">Closer</div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex items-center justify-center bg-red-600 text-white font-display font-bold rounded shadow-sm">
                                        CL
                                    </div>
                                    <button
                                        onClick={() => bullpen.closer ? handleClearSlot('closer') : handleCloserClick()}
                                        className={`flex-1 h-12 rounded border-2 flex items-center px-3 transition-all ${bullpen.closer
                                                ? 'bg-white border-charcoal/10 hover:border-red-500/50'
                                                : 'bg-charcoal/5 border-dashed border-charcoal/20 hover:bg-charcoal/10'
                                            } ${selectedPlayerId && !bullpen.closer ? 'ring-2 ring-gold animate-pulse' : ''}`}
                                    >
                                        {bullpen.closer ? (
                                            <>
                                                {(() => {
                                                    const player = getPlayer(bullpen.closer)
                                                    return player ? (
                                                        <>
                                                            <span className="font-display font-bold text-charcoal">{player.last_name}</span>
                                                            <span className="ml-2 font-serif italic text-charcoal/60">{player.first_name}</span>
                                                            <span className="ml-auto text-xs font-mono text-charcoal/50">{player.saves} SV</span>
                                                        </>
                                                    ) : null
                                                })()}
                                            </>
                                        ) : (
                                            <span className="text-charcoal/30 font-serif italic text-sm w-full text-center">
                                                {selectedPlayerId ? 'Click to Assign' : 'No Closer'}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Setup Men */}
                            <div>
                                <div className="text-xs font-sans font-bold text-charcoal/50 uppercase tracking-widest mb-2">Setup Men</div>
                                <div className="space-y-2">
                                    {bullpen.setup.map((playerId, idx) => {
                                        const player = getPlayer(playerId)
                                        return (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white font-display font-bold rounded shadow-sm text-sm">
                                                    SU
                                                </div>
                                                <button
                                                    onClick={() => handleClearSlot('setup', idx)}
                                                    className="flex-1 h-10 rounded border bg-white border-charcoal/10 hover:border-red-500/50 flex items-center px-3"
                                                >
                                                    {player && (
                                                        <>
                                                            <span className="font-display font-bold text-charcoal text-sm">{player.last_name}</span>
                                                            <span className="ml-2 font-serif italic text-charcoal/60 text-sm">{player.first_name}</span>
                                                            <span className="ml-auto text-xs font-mono text-charcoal/50">{player.era?.toFixed(2)} ERA</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )
                                    })}
                                    {/* Add Setup Slot (max 4) */}
                                    {bullpen.setup.length < MAX_SETUP_MEN && (
                                        <button
                                            onClick={handleSetupClick}
                                            className={`w-full h-10 rounded border-2 border-dashed border-charcoal/20 flex items-center justify-center transition-all hover:bg-charcoal/5 ${selectedPlayerId ? 'ring-2 ring-gold animate-pulse' : ''
                                                }`}
                                        >
                                            <span className="text-charcoal/30 font-serif italic text-sm">
                                                {selectedPlayerId ? 'Click to Add Setup Man' : `+ Add Setup Man (${bullpen.setup.length}/${MAX_SETUP_MEN})`}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

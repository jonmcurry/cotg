/**
 * Team Selector Modal
 * Premium modal for selecting teams in the Clubhouse
 * Vintage baseball aesthetic with grid layout
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { DraftTeam } from '../../types/draft.types'

interface Props {
    teams: DraftTeam[]
    selectedTeamId: string
    onSelectTeam: (teamId: string) => void
    onClose: () => void
    isOpen: boolean
}

export default function TeamSelectorModal({ teams, selectedTeamId, onSelectTeam, onClose, isOpen }: Props) {
    const modalRef = useRef<HTMLDivElement>(null)

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Focus trap and prevent body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            modalRef.current?.focus()
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const handleTeamSelect = (teamId: string) => {
        onSelectTeam(teamId)
        onClose()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-selector-title"
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-4xl bg-cream border-2 border-charcoal/20 rounded-sm shadow-2xl animate-slideUp"
                tabIndex={-1}
            >
                {/* Modal Header */}
                <div className="bg-charcoal px-6 py-4 flex items-center justify-between">
                    <h2
                        id="team-selector-title"
                        className="font-display font-bold text-xl tracking-widest uppercase text-gold"
                    >
                        Select Team
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-white/60 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Decorative border */}
                <div className="h-1 bg-gradient-to-r from-burgundy via-gold to-burgundy"></div>

                {/* Team Grid */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {teams.map((team, index) => {
                            const isSelected = team.id === selectedTeamId
                            // Alternate subtle background for visual interest
                            const isEvenRow = Math.floor(index / 4) % 2 === 0

                            return (
                                <button
                                    key={team.id}
                                    onClick={() => handleTeamSelect(team.id)}
                                    className={`
                                        group relative p-4 text-left rounded-sm border-2 transition-all duration-200
                                        ${isSelected
                                            ? 'bg-burgundy text-white border-burgundy shadow-lg scale-[1.02]'
                                            : `bg-white border-charcoal/10 hover:border-burgundy hover:bg-burgundy hover:text-white hover:shadow-md ${isEvenRow ? '' : 'bg-cream-light'}`
                                        }
                                    `}
                                >
                                    {/* Team Name */}
                                    <div className="font-display font-bold text-sm truncate pr-2">
                                        {team.name}
                                    </div>

                                    {/* Division Badge */}
                                    {team.league && team.division && (
                                        <div className={`
                                            mt-1 text-xs font-sans tracking-wide
                                            ${isSelected ? 'text-white/70' : 'text-charcoal/50 group-hover:text-white/70'}
                                        `}>
                                            {team.league} {team.division}
                                        </div>
                                    )}

                                    {/* Control Type */}
                                    <div className={`
                                        mt-1 text-xs uppercase tracking-widest font-semibold
                                        ${isSelected
                                            ? 'text-gold'
                                            : team.control === 'human'
                                                ? 'text-burgundy group-hover:text-gold'
                                                : 'text-charcoal/40 group-hover:text-white/60'
                                        }
                                    `}>
                                        {team.control}
                                    </div>

                                    {/* Selected Indicator */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 bg-charcoal/5 border-t border-charcoal/10 flex justify-between items-center">
                    <span className="text-xs font-serif italic text-charcoal/50">
                        {teams.length} teams in league
                    </span>
                    <button
                        onClick={onClose}
                        className="text-xs font-display font-bold uppercase tracking-widest text-charcoal/60 hover:text-burgundy transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

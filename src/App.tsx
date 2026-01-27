import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-charcoal text-cream py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-display font-bold text-gold">
            Century of the Game
          </h1>
          <p className="text-cream-dark mt-2 font-serif italic">
            A Baseball Fantasy Draft & Simulation System
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="card max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-display text-burgundy mb-4">
            Development Environment Ready
          </h2>

          <p className="text-lg mb-6 font-serif">
            Phase 1.3 Complete: React + TypeScript + Vite + Tailwind CSS
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setCount((count) => count + 1)}
              className="btn-primary"
            >
              Count is {count}
            </button>

            <p className="text-charcoal/70">
              Edit <code className="bg-charcoal/10 px-2 py-1 rounded">src/App.tsx</code> to get started
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-charcoal/10">
            <h3 className="text-xl font-display text-burgundy mb-3">Status</h3>
            <div className="text-left space-y-2 font-sans text-sm">
              <p className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Phase 1.1: APBA Reverse Engineering Complete
              </p>
              <p className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Phase 1.2: Bill James Analysis Complete
              </p>
              <p className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Phase 1.3: React + TypeScript Setup Complete
              </p>
              <p className="flex items-center">
                <span className="text-blue-600 mr-2">→</span>
                Next: Phase 1.4 - Supabase Database Schema
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-charcoal text-cream-dark py-6 mt-12">
        <div className="container mx-auto px-4 text-center font-serif text-sm">
          <p>&copy; 2026 Century of the Game. A tribute to baseball history.</p>
        </div>
      </footer>
    </div>
  )
}

export default App

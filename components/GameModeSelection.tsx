
import React from 'react';
import packageJson from '../package.json';

interface GameModeSelectionProps {
  onSelectRacing: () => void;
  onSelectElimination: () => void;
  onSelectDriftAttack: () => void;
}

const GameModeSelection: React.FC<GameModeSelectionProps> = ({
  onSelectRacing,
  onSelectElimination,
  onSelectDriftAttack
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20">
      {/* Version Badge & Credit - Top Right */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-20">
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-lg hover:border-cyan-400/50 transition-all duration-300">
            <span className="text-[10px] text-cyan-400/60 font-mono tracking-wider uppercase">Version</span>
            <span className="text-sm text-cyan-300 font-mono font-bold tracking-wide">{packageJson.version}</span>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative px-4 py-2 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-purple-500/30 backdrop-blur-md shadow-lg hover:border-purple-400/50 transition-all duration-300">
            <span className="text-xs text-white/60 font-mono">by <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-bold">jack</span></span>
          </div>
        </div>
      </div>

      {/* Enhanced Title */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl"></div>
        <h1 className="relative text-6xl md:text-8xl font-black mb-2 tracking-tight drop-shadow-2xl text-center select-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 animate-pulse">AUTOMATION</span>
          <br/>
          <span className="text-white">RACER</span>
        </h1>
      </div>

      <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-cyan-500/30 backdrop-blur-sm mb-12">
        <p className="text-cyan-300 text-lg font-bold tracking-wide">SELECT YOUR GAME MODE</p>
      </div>

      {/* Game Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">
        {/* Racing Mode */}
        <button
          onClick={onSelectRacing}
          className="group relative p-6 rounded-2xl border-2 border-cyan-500/30 bg-slate-800/50 backdrop-blur-md hover:border-cyan-400 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="text-center">
            <div className="text-5xl mb-3">🏎️</div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
              RACING
            </h2>
            <p className="text-white/70 text-xs mb-4 leading-relaxed">
              High-speed endless runner through neon streets. Dodge obstacles, collect coins, unlock themes.
            </p>
            <div className="space-y-1 text-[10px] text-white/50">
              <div>✓ 3 Themed Tracks</div>
              <div>✓ Power-ups & Combos</div>
              <div>✓ Global Leaderboard</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>

        {/* Drift Attack Mode */}
        <button
          onClick={onSelectDriftAttack}
          className="group relative p-6 rounded-2xl border-2 border-orange-500/30 bg-slate-800/50 backdrop-blur-md hover:border-orange-400 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="text-center">
            <div className="text-5xl mb-3">💨</div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400 mb-2">
              DRIFT ATTACK
            </h2>
            <p className="text-white/70 text-xs mb-4 leading-relaxed">
              Time attack racing with drift mechanics. Master perfect timing, chase ghost records, dominate the lap times.
            </p>
            <div className="space-y-1 text-[10px] text-white/50">
              <div>✓ 3 Circuit Tracks</div>
              <div>✓ Drift & Boost System</div>
              <div>✓ Ghost Racing</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>

        {/* Elimination Mode */}
        <button
          onClick={onSelectElimination}
          className="group relative p-6 rounded-2xl border-2 border-purple-500/30 bg-slate-800/50 backdrop-blur-md hover:border-purple-400 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="text-center">
            <div className="text-5xl mb-3">⚔️</div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-400 mb-2">
              AI ELIMINATION
            </h2>
            <p className="text-white/70 text-xs mb-4 leading-relaxed">
              Battle royale where AI fighters collide. Each collision costs lives. Last one standing wins.
            </p>
            <div className="space-y-1 text-[10px] text-white/50">
              <div>✓ 22 Unique Fighters</div>
              <div>✓ Physics Combat</div>
              <div>✓ Progressive Unlocks</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
      </div>

      <div className="mt-12 text-center">
        <div className="text-white/40 text-xs font-mono mb-2">Choose your game mode to begin</div>
        <div className="flex items-center justify-center gap-6 text-white/20 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-400/40 rounded-full"></span>
            <span>Online Multiplayer</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-purple-400/40 rounded-full"></span>
            <span>AI Powered</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-400/40 rounded-full"></span>
            <span>Real-time Leaderboards</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelection;


import React from 'react';

interface GameModeSelectionProps {
  onSelectRacing: () => void;
  onSelectElimination: () => void;
}

const GameModeSelection: React.FC<GameModeSelectionProps> = ({
  onSelectRacing,
  onSelectElimination
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Title */}
      <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-lg text-center select-none">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">AUTOMATION</span>
        <br/>RACER
      </h1>

      <p className="text-white/60 text-lg mb-12 text-center">SELECT YOUR GAME MODE</p>

      {/* Game Mode Cards */}
      <div className="flex gap-8 max-w-5xl">
        {/* Racing Mode */}
        <button
          onClick={onSelectRacing}
          className="group relative flex-1 p-8 rounded-2xl border-2 border-cyan-500/30 bg-slate-800/50 backdrop-blur-md hover:border-cyan-400 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🏎️</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-3">
              RACING
            </h2>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              High-speed endless runner through neon-lit streets. Dodge obstacles, collect coins, and unlock themes as you race to the top of the leaderboard.
            </p>
            <div className="space-y-2 text-xs text-white/50">
              <div>✓ 3 Themed Tracks</div>
              <div>✓ Power-ups & Combos</div>
              <div>✓ Global Leaderboard</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>

        {/* Elimination Mode */}
        <button
          onClick={onSelectElimination}
          className="group relative flex-1 p-8 rounded-2xl border-2 border-purple-500/30 bg-slate-800/50 backdrop-blur-md hover:border-purple-400 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-400 mb-3">
              AI ELIMINATION
            </h2>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Battle royale showdown where AI fighters collide in an arena. Each collision costs lives. Last one standing wins. Unlock new fighters with each victory.
            </p>
            <div className="space-y-2 text-xs text-white/50">
              <div>✓ 22 Unique Fighters</div>
              <div>✓ Physics-Based Combat</div>
              <div>✓ Progressive Unlocks</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
      </div>

      <div className="mt-12 text-white/30 text-xs font-mono">
        Choose your game mode to begin
      </div>
    </div>
  );
};

export default GameModeSelection;

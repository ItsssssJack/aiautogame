import React from 'react';
import { Track, TRACKS, getUnlockedTracks } from '../lib/tracks';

interface TrackSelectionProps {
  onSelectTrack: (track: Track) => void;
  onBack: () => void;
  playerHighScore: number;
}

const TrackSelection: React.FC<TrackSelectionProps> = ({
  onSelectTrack,
  onBack,
  playerHighScore,
}) => {
  const unlockedTracks = getUnlockedTracks(playerHighScore);
  const unlockedTrackIds = new Set(unlockedTracks.map(t => t.id));

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'from-green-500 to-cyan-500';
      case 'intermediate': return 'from-orange-500 to-yellow-500';
      case 'expert': return 'from-red-500 to-purple-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '🌟';
      case 'intermediate': return '⚡';
      case 'expert': return '💀';
      default: return '🏁';
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-900/20">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 px-4 py-2 rounded-full bg-slate-800/80 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all backdrop-blur-md"
      >
        ← BACK
      </button>

      {/* Title */}
      <div className="relative mb-8">
        <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tight drop-shadow-2xl text-center select-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-yellow-400 to-orange-300">
            SELECT TRACK
          </span>
        </h1>
        <p className="text-white/60 text-center text-sm">Choose your circuit and chase the fastest time</p>
      </div>

      {/* Track Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">
        {TRACKS.map((track) => {
          const isUnlocked = unlockedTrackIds.has(track.id);
          const gradientClass = getDifficultyColor(track.difficulty);

          return (
            <button
              key={track.id}
              onClick={() => isUnlocked && onSelectTrack(track)}
              disabled={!isUnlocked}
              className={`group relative p-6 rounded-2xl border-2 bg-slate-800/50 backdrop-blur-md transition-all duration-300 ${
                isUnlocked
                  ? `border-${track.colors.primary}/30 hover:border-${track.colors.primary}/60 hover:bg-slate-700/50 hover:scale-105 active:scale-95 cursor-pointer`
                  : 'border-white/10 opacity-50 cursor-not-allowed'
              }`}
              style={{
                borderColor: isUnlocked ? `${track.colors.primary}50` : undefined,
              }}
            >
              {/* Locked Overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 rounded-2xl backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <div className="text-sm font-bold text-white">LOCKED</div>
                    <div className="text-xs text-white/60 mt-1">
                      Unlock at {track.unlockScore.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              )}

              {/* Track Info */}
              <div className="text-center">
                {/* Difficulty Badge */}
                <div className="flex justify-center mb-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${gradientClass} text-white text-xs font-bold uppercase`}>
                    <span>{getDifficultyIcon(track.difficulty)}</span>
                    <span>{track.difficulty}</span>
                  </div>
                </div>

                {/* Track Name */}
                <h2
                  className="text-2xl font-black mb-2"
                  style={{
                    color: isUnlocked ? track.colors.primary : '#666',
                  }}
                >
                  {track.name}
                </h2>

                {/* Description */}
                <p className="text-white/70 text-xs mb-4 leading-relaxed">
                  {track.description}
                </p>

                {/* Track Stats */}
                <div className="space-y-1 text-[10px] text-white/50">
                  <div>🏁 {track.laps} Laps</div>
                  <div>📍 {track.checkpoints.length} Checkpoints</div>
                  <div>⚠️ {track.hazards.length} Hazards</div>
                  <div>🏆 WR: {track.worldRecord.toFixed(2)}s</div>
                </div>
              </div>

              {/* Hover Glow Effect */}
              {isUnlocked && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${track.colors.primary}20, ${track.colors.accent}20)`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-8 text-center">
        <div className="text-white/40 text-xs font-mono mb-2">
          Unlocked Tracks: {unlockedTracks.length}/{TRACKS.length}
        </div>
        <div className="text-white/30 text-[10px] font-mono">
          Earn points in Racing mode to unlock more tracks
        </div>
      </div>
    </div>
  );
};

export default TrackSelection;

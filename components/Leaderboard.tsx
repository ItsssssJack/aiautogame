import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { fetchRacingLeaderboard } from '../lib/supabase';
import { getRankLevel } from '../utils/rankingSystem';

interface LeaderboardProps {
  scores: LeaderboardEntry[];
  onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ scores: localScores, onBack }) => {
  const [scores, setScores] = useState<LeaderboardEntry[]>(localScores);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const data = await fetchRacingLeaderboard();

        if (data && data.length > 0) {
          // Convert Supabase data to LeaderboardEntry format
          const entries: LeaderboardEntry[] = data.map((item: any) => ({
            name: item.name,
            score: item.score,
            date: item.date || item.created_at,
            rankTitle: item.rank_title,
            aiComment: item.ai_comment
          }));
          setScores(entries);
        } else {
          // Fallback to local scores if no data
          setScores(localScores);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError(true);
        // Fallback to local scores on error
        setScores(localScores);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const sortedScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="absolute inset-0 flex flex-col items-center bg-slate-900 z-30 overflow-y-auto py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-display font-bold text-cyan-400">GLOBAL RANKING</h2>
            {loading && (
              <p className="text-slate-500 text-sm mt-1">Loading global scores...</p>
            )}
            {error && (
              <p className="text-yellow-500 text-sm mt-1">Using local scores (offline)</p>
            )}
          </div>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white font-bold uppercase tracking-wider text-sm border border-slate-600 px-4 py-2 rounded hover:bg-slate-800 transition-colors"
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-20 font-mono">
            <div className="animate-pulse">LOADING...</div>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center text-slate-500 py-20 font-mono">
            NO DATA FOUND. BE THE FIRST.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedScores.map((entry, index) => {
              const rank = getRankLevel(entry.score);
              return (
                <div
                  key={index}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Placement Badge */}
                    <div className={`
                      w-10 h-10 flex items-center justify-center rounded-full font-display font-bold text-xl shrink-0 transition-transform group-hover:scale-110
                      ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900 shadow-lg shadow-yellow-500/50 animate-pulse' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 shadow-lg shadow-slate-300/30' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-slate-900 shadow-lg shadow-amber-600/30' :
                        'bg-slate-700 text-slate-400'}
                    `}>
                      {index + 1}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl font-mono font-bold text-white">{entry.name}</span>

                        {/* Rank Level Badge - Visually Gorgeous */}
                        <div className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm
                          bg-gradient-to-r ${rank.gradient}
                          shadow-lg transform transition-all duration-300
                          border-2 border-white/20
                          group-hover:scale-105
                        `}
                        style={{
                          boxShadow: `0 4px 20px ${rank.color}40, inset 0 1px 2px rgba(255,255,255,0.3)`
                        }}>
                          <span className="text-xl drop-shadow-md">{rank.emoji}</span>
                          <span className="text-white drop-shadow-md tracking-wide">{rank.title}</span>
                        </div>
                      </div>

                      {entry.aiComment && !entry.aiComment.toLowerCase().includes('api') && (
                        <p className="text-slate-400 text-sm italic mt-1">"{entry.aiComment}"</p>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="text-2xl font-mono text-cyan-400 font-bold block group-hover:text-cyan-300 transition-colors">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">points</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { fetchRacingLeaderboard } from '../lib/supabase';

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
            {sortedScores.map((entry, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-10 h-10 flex items-center justify-center rounded-full font-display font-bold text-xl
                    ${index === 0 ? 'bg-yellow-500 text-slate-900' :
                      index === 1 ? 'bg-slate-300 text-slate-900' :
                      index === 2 ? 'bg-amber-700 text-slate-900' : 'bg-slate-700 text-slate-400'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-mono font-bold text-white">{entry.name}</span>
                      {entry.rankTitle && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-cyan-300 border border-cyan-900">
                          {entry.rankTitle}
                        </span>
                      )}
                    </div>
                    {entry.aiComment && (
                      <p className="text-slate-400 text-sm italic">"{entry.aiComment}"</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono text-cyan-400 block">{entry.score.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

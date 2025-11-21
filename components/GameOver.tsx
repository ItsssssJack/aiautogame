
import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { getScoreCommentary } from '../services/geminiService';
import { saveRacingScore } from '../lib/supabase';

interface GameOverProps {
  score: number;
  time: number;
  onRetry: () => void;
  onMenu: () => void;
  onSubmitScore: (entry: LeaderboardEntry) => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, time, onRetry, onMenu, onSubmitScore }) => {
  const [name, setName] = useState('');
  const [commentary, setCommentary] = useState<{title: string, text: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCommentary = async () => {
      try {
        const result = await getScoreCommentary(score, time);
        if (isMounted) {
          setCommentary({ title: result.rankTitle, text: result.comment });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCommentary();
    return () => { isMounted = false; };
  }, [score, time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);

    const entry: LeaderboardEntry = {
      name: name.toUpperCase().slice(0, 5),
      score,
      date: new Date().toISOString(),
      aiComment: commentary?.text,
      rankTitle: commentary?.title
    };

    try {
      // Save to Supabase
      await saveRacingScore({
        name: entry.name,
        score: entry.score,
        rank_title: entry.rankTitle,
        ai_comment: entry.aiComment
      });
      console.log('Score saved to Supabase!');
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
      // Continue anyway - will save locally
    }

    // Save locally
    onSubmitScore(entry);
    setSubmitted(true);
    setSaving(false);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md z-20 p-6 text-center">
      <h2 className="text-5xl font-display font-bold text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
        SYSTEM CRASH
      </h2>

      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 w-full max-w-md mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-slate-400 text-sm uppercase">Score</p>
            <p className="text-3xl font-mono text-cyan-400">{score.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm uppercase">Time</p>
            <p className="text-3xl font-mono text-cyan-400">{time.toFixed(1)}s</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse text-yellow-500 font-mono text-sm border-t border-slate-700 pt-4">
            [ANALYZING PERFORMANCE DATA...]
          </div>
        ) : commentary ? (
          <div className="border-t border-slate-700 pt-4">
            <p className="text-yellow-400 font-bold font-display text-lg mb-1">{commentary.title}</p>
            <p className="text-slate-300 italic">"{commentary.text}"</p>
          </div>
        ) : null}
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="w-full max-w-xs mb-8 animate-fade-in-up">
          <label className="block text-sm text-slate-400 mb-2">ENTER INITIALS (MAX 5)</label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={5}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-slate-800 border-2 border-cyan-600 rounded p-3 text-center font-mono text-2xl uppercase tracking-widest focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50"
              placeholder="NAME"
              autoFocus
            />
            <button
              type="submit"
              disabled={name.length < 1 || saving}
              className="bg-cyan-600 text-white px-6 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors"
            >
              {saving ? '...' : 'GO'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 text-green-400 font-mono">
          [ SCORE UPLOADED TO GLOBAL LEADERBOARD ]
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onRetry}
          className="bg-white text-slate-900 px-8 py-3 rounded font-bold hover:bg-slate-200 transition-transform hover:scale-105"
        >
          RETRY
        </button>
        <button
          onClick={onMenu}
          className="bg-transparent border border-slate-500 text-slate-300 px-8 py-3 rounded font-bold hover:bg-slate-800 transition-colors"
        >
          MENU
        </button>
      </div>
    </div>
  );
};

export default GameOver;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Character } from '../constants';
import { saveFlappyBirdScore, fetchFlappyBirdLeaderboard } from '../lib/supabase';

interface FlappyBirdGameProps {
  selectedCharacter: Character;
  onBack: () => void;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  character_used?: string;
  created_at: string;
}

interface Pipe {
  x: number;
  gapY: number; // Center of gap
  passed: boolean;
}

const FlappyBirdGame: React.FC<FlappyBirdGameProps> = ({
  selectedCharacter,
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);

  // Bird state
  const birdRef = useRef({
    y: 250,
    velocity: 0,
    rotation: 0,
  });

  // Pipes state
  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeSpawn = useRef(0);

  // Constants
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const BIRD_SIZE = 40;
  const BIRD_X = 80;
  const GRAVITY = 0.6;
  const FLAP_STRENGTH = -10;
  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150;
  const PIPE_SPEED = 3;
  const PIPE_SPAWN_INTERVAL = 1800; // ms

  // Load best score and leaderboard
  useEffect(() => {
    const saved = localStorage.getItem('flappy_bird_best_score');
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }

    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await fetchFlappyBirdLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const submitScore = async () => {
    if (!playerName.trim() || submittingScore) return;

    setSubmittingScore(true);
    try {
      await saveFlappyBirdScore({
        name: playerName.trim(),
        score,
        character_used: selectedCharacter.name,
      });

      await loadLeaderboard();
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Failed to submit score:', error);
      alert('Failed to submit score. Please try again.');
    } finally {
      setSubmittingScore(false);
    }
  };

  // Input handling
  useEffect(() => {
    const handleInput = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          flap();
        }
      }
    };

    const handleClick = () => {
      flap();
    };

    window.addEventListener('keydown', handleInput);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('click', handleClick);
    };
  }, [gameStarted, gameOver]);

  const flap = () => {
    if (!gameStarted) {
      setGameStarted(true);
      pipesRef.current = [];
      lastPipeSpawn.current = Date.now();
    }

    if (gameOver) {
      // Restart
      birdRef.current = { y: 250, velocity: 0, rotation: 0 };
      pipesRef.current = [];
      setScore(0);
      setGameOver(false);
      setGameStarted(false);
      setShowLeaderboard(false);
      setPlayerName('');
      return;
    }

    birdRef.current.velocity = FLAP_STRENGTH;
  };

  // Game loop
  const updateGame = useCallback(() => {
    if (!gameStarted || gameOver) return;

    const bird = birdRef.current;

    // Apply gravity
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;

    // Update rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90);

    // Check ceiling/floor collision
    if (bird.y < 0 || bird.y > CANVAS_HEIGHT - BIRD_SIZE) {
      endGame();
      return;
    }

    // Spawn pipes
    const now = Date.now();
    if (now - lastPipeSpawn.current > PIPE_SPAWN_INTERVAL) {
      const minGapY = PIPE_GAP / 2 + 50;
      const maxGapY = CANVAS_HEIGHT - PIPE_GAP / 2 - 50;
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);

      pipesRef.current.push({
        x: CANVAS_WIDTH,
        gapY,
        passed: false,
      });

      lastPipeSpawn.current = now;
    }

    // Update pipes
    pipesRef.current = pipesRef.current.filter(pipe => {
      pipe.x -= PIPE_SPEED;

      // Check if bird passed pipe
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.passed = true;
        setScore(prev => {
          const newScore = prev + 1;
          if (newScore > bestScore) {
            setBestScore(newScore);
            localStorage.setItem('flappy_bird_best_score', newScore.toString());
          }
          return newScore;
        });
      }

      // Check collision
      if (
        pipe.x < BIRD_X + BIRD_SIZE &&
        pipe.x + PIPE_WIDTH > BIRD_X
      ) {
        const topPipeBottom = pipe.gapY - PIPE_GAP / 2;
        const bottomPipeTop = pipe.gapY + PIPE_GAP / 2;

        if (bird.y < topPipeBottom || bird.y + BIRD_SIZE > bottomPipeTop) {
          endGame();
        }
      }

      // Remove off-screen pipes
      return pipe.x > -PIPE_WIDTH;
    });
  }, [gameStarted, gameOver, bestScore]);

  const endGame = () => {
    setGameOver(true);
    // TODO: Submit to Supabase leaderboard
  };

  // Render game
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas - sky background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pipes
    pipesRef.current.forEach(pipe => {
      // Top pipe
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(
        pipe.x,
        0,
        PIPE_WIDTH,
        pipe.gapY - PIPE_GAP / 2
      );

      // Pipe border
      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        pipe.x,
        0,
        PIPE_WIDTH,
        pipe.gapY - PIPE_GAP / 2
      );

      // Pipe cap (top)
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(
        pipe.x - 5,
        pipe.gapY - PIPE_GAP / 2 - 20,
        PIPE_WIDTH + 10,
        20
      );

      // Bottom pipe
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(
        pipe.x,
        pipe.gapY + PIPE_GAP / 2,
        PIPE_WIDTH,
        CANVAS_HEIGHT - (pipe.gapY + PIPE_GAP / 2)
      );

      ctx.strokeStyle = '#27ae60';
      ctx.strokeRect(
        pipe.x,
        pipe.gapY + PIPE_GAP / 2,
        PIPE_WIDTH,
        CANVAS_HEIGHT - (pipe.gapY + PIPE_GAP / 2)
      );

      // Pipe cap (bottom)
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(
        pipe.x - 5,
        pipe.gapY + PIPE_GAP / 2,
        PIPE_WIDTH + 10,
        20
      );
    });

    // Draw bird
    const bird = birdRef.current;
    ctx.save();
    ctx.translate(BIRD_X + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);
    ctx.rotate((bird.rotation * Math.PI) / 180);

    // Bird body (circle)
    ctx.fillStyle = selectedCharacter.color;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Bird border
    ctx.strokeStyle = selectedCharacter.accentColor || '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw character avatar if available
    if (selectedCharacter.avatarUrl) {
      const img = new Image();
      img.src = selectedCharacter.avatarUrl;
      ctx.drawImage(img, -BIRD_SIZE / 3, -BIRD_SIZE / 3, BIRD_SIZE * 0.66, BIRD_SIZE * 0.66);
    }

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(BIRD_SIZE / 2 - 5, 0);
    ctx.lineTo(BIRD_SIZE / 2 + 8, -3);
    ctx.lineTo(BIRD_SIZE / 2 + 8, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Ground
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, CANVAS_HEIGHT - 80, CANVAS_WIDTH, 80);

    // Grass on ground
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, CANVAS_HEIGHT - 80, CANVAS_WIDTH, 10);
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      updateGame();
      renderGame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateGame]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-cyan-200 to-blue-300 overflow-hidden flex items-center justify-center">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 px-4 py-2 rounded-full bg-slate-800/80 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all backdrop-blur-md"
      >
        ← BACK
      </button>

      {/* Score Display */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="text-center">
          <div className="text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
            {score}
          </div>
          <div className="text-sm text-white/80 font-bold">BEST: {bestScore}</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-slate-800 rounded-lg shadow-2xl"
        />

        {/* Start Screen */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
            <div className="text-white text-center p-8">
              <div className="text-6xl mb-4">🐦</div>
              <h2 className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                FLAPPY BIRD
              </h2>
              <p className="text-lg mb-6 text-white/90">
                Click or press SPACE to flap
              </p>
              <div className="text-sm text-white/70">
                Avoid the pipes and survive as long as you can!
              </div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && !showLeaderboard && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg p-4">
            <div className="bg-slate-800 rounded-2xl p-8 border-2 border-red-500/50 text-center max-w-md w-full">
              <h2 className="text-4xl font-black text-red-400 mb-4">GAME OVER</h2>
              <div className="mb-6">
                <div className="text-white/60 text-sm mb-1">SCORE</div>
                <div className="text-5xl font-black text-white mb-3">{score}</div>
                {score === bestScore && score > 0 && (
                  <div className="text-yellow-400 text-sm font-bold">🏆 NEW BEST!</div>
                )}
              </div>

              {/* Name submission */}
              <div className="mb-6">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitScore()}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 mb-3"
                />
                <button
                  onClick={submitScore}
                  disabled={!playerName.trim() || submittingScore}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                >
                  {submittingScore ? 'SUBMITTING...' : 'SUBMIT TO LEADERBOARD'}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={flap}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95"
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95"
                >
                  LEADERBOARD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Screen */}
        {showLeaderboard && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg p-4 overflow-auto">
            <div className="bg-slate-800 rounded-2xl p-6 border-2 border-cyan-500/50 max-w-lg w-full max-h-[90%] overflow-auto">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-6 text-center">
                🏆 LEADERBOARD
              </h2>

              <div className="space-y-2 mb-6">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border border-yellow-500/50'
                        : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="text-2xl font-black text-white/40 w-8">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold">{entry.name}</div>
                      {entry.character_used && (
                        <div className="text-xs text-white/40">{entry.character_used}</div>
                      )}
                    </div>
                    <div className="text-xl font-black text-cyan-400">
                      {entry.score}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95"
                >
                  BACK
                </button>
                <button
                  onClick={flap}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-6 py-3 border border-white/10">
          <div className="text-white/80 text-xs text-center">
            SPACE / CLICK / TAP to Flap
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlappyBirdGame;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Character } from '../types';
import { CHARACTERS } from '../constants';
import { saveFlappyBirdScore, fetchFlappyBirdLeaderboard } from '../lib/supabase';

interface FlappyBirdGameProps {
  selectedCharacter: Character;
  onBack: () => void;
  allCharacters?: Character[];
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
  selectedCharacter: initialCharacter,
  onBack,
  allCharacters = CHARACTERS,
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

  // Character selection
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(initialCharacter);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  // Countdown
  const [countdown, setCountdown] = useState<number | null>(null);

  // Constants - fixed game dimensions that scale to fit
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const BIRD_SIZE = 40;
  const BIRD_X = 200;
  const GRAVITY = 0.5;
  const FLAP_STRENGTH = -9;
  const PIPE_WIDTH = 80;
  const PIPE_GAP = 200;
  const PIPE_SPEED = 3;
  const PIPE_SPAWN_INTERVAL = 1800; // ms

  // Bird state
  const birdRef = useRef({
    y: CANVAS_HEIGHT / 2,
    velocity: 0,
    rotation: 0,
  });

  // Game state refs (for animation loop)
  const gameStartedRef = useRef(false);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);

  // Game start grace period
  const gameStartTimeRef = useRef<number>(0);

  // Pipes state
  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeSpawn = useRef(0);

  // Load best score and leaderboard
  useEffect(() => {
    const saved = localStorage.getItem('flappy_bird_best_score');
    if (saved) {
      const score = parseInt(saved, 10);
      setBestScore(score);
      bestScoreRef.current = score;
    }

    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await fetchFlappyBirdLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      // Set empty leaderboard on error so game still works
      setLeaderboard([]);
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
    // Don't allow flapping during countdown
    if (countdown !== null) return;

    if (!gameStartedRef.current) {
      // Start countdown
      setCountdown(3);
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) {
          clearInterval(countdownInterval);
          setCountdown(null);
          setGameStarted(true);
          gameStartedRef.current = true;
          gameStartTimeRef.current = Date.now();
          pipesRef.current = [];
          lastPipeSpawn.current = Date.now();
          // Give initial upward velocity
          birdRef.current.velocity = FLAP_STRENGTH * 0.5;
        }
      }, 1000);
      return;
    }

    if (gameOverRef.current) {
      // Restart
      birdRef.current = { y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 };
      pipesRef.current = [];
      scoreRef.current = 0;
      setScore(0);
      gameOverRef.current = false;
      setGameOver(false);
      gameStartedRef.current = false;
      setGameStarted(false);
      setShowLeaderboard(false);
      setPlayerName('');
      return;
    }

    birdRef.current.velocity = FLAP_STRENGTH;
  };

  // Game loop
  const updateGame = () => {
    if (!gameStartedRef.current || gameOverRef.current) return;

    const bird = birdRef.current;

    // Apply gravity with grace period at start
    const timeSinceStart = Date.now() - gameStartTimeRef.current;
    const gracePeriod = 800; // 800ms grace period
    const gravityMultiplier = timeSinceStart < gracePeriod ? 0.3 : 1.0;

    bird.velocity += GRAVITY * gravityMultiplier;
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
        const newScore = scoreRef.current + 1;
        scoreRef.current = newScore;
        setScore(newScore);

        if (newScore > bestScoreRef.current) {
          bestScoreRef.current = newScore;
          setBestScore(newScore);
          localStorage.setItem('flappy_bird_best_score', newScore.toString());
        }
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
  };

  const endGame = () => {
    gameOverRef.current = true;
    setGameOver(true);
  };

  // Render game
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas ref not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Canvas context not found');
      return;
    }

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

  // Animation loop - runs once on mount, never restarts
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      {/* Left Sidebar - Fixed 180px width */}
      <div className="w-[180px] h-full flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col p-4 gap-4">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-700 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all font-bold text-sm"
        >
          ← BACK
        </button>

        {/* Character Selection */}
        <div className="flex-1 bg-slate-700/50 border border-white/10 rounded-xl p-3 overflow-y-auto">
          <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-3 text-center">
            Robo Birds
          </div>
          <div className="space-y-2">
            {allCharacters.slice(0, 8).map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                className={`w-full p-2 rounded-lg border-2 transition-all ${
                  char.id === selectedCharacter.id
                    ? 'border-yellow-400 bg-yellow-400/20'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto border-2 border-white flex items-center justify-center"
                  style={{ backgroundColor: char.color }}
                >
                  {char.avatarUrl && (
                    <img src={char.avatarUrl} alt={char.name} className="w-9 h-9 rounded-full" />
                  )}
                </div>
              </button>
            ))}
            {allCharacters.length > 8 && (
              <button
                onClick={() => setShowCharacterSelect(true)}
                className="w-full p-2 rounded-lg border-2 border-white/20 hover:border-white/40 text-white/60 text-xs"
              >
                +{allCharacters.length - 8} More
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Game Area - Fills remaining space */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {/* Game Canvas - base layer */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0
          }}
        />

        {/* Score Display */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="text-center bg-black/30 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
            <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Score</div>
            <div className="text-6xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
              {score}
            </div>
            <div className="text-sm text-yellow-400 font-bold mt-1">BEST: {bestScore}</div>
          </div>
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm">
            <div className="text-9xl font-black text-white animate-pulse drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
              {countdown}
            </div>
          </div>
        )}

        {/* Start Screen */}
        {!gameStarted && !gameOver && countdown === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10">
            <div className="text-white text-center p-8">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                ROBO BIRD
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 z-10">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-auto z-10">
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

        {/* Instructions */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md rounded-xl px-6 py-3 border border-white/10">
            <div className="text-white/80 text-xs text-center">
              SPACE / CLICK / TAP to Flap
            </div>
          </div>
        </div>
      </div>

      {/* Character Selection Modal - Full screen overlay */}
      {showCharacterSelect && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-6 border-2 border-yellow-500/50 max-w-2xl w-full max-h-[80%] overflow-auto mx-4">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-6 text-center">
              🤖 CHOOSE YOUR ROBO BIRD
            </h2>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {allCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedCharacter(char);
                    setShowCharacterSelect(false);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    char.id === selectedCharacter.id
                      ? 'border-yellow-400 bg-yellow-400/20 scale-105'
                      : 'border-white/20 bg-slate-700/50 hover:border-white/40 hover:scale-105'
                  }`}
                >
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-white flex items-center justify-center"
                    style={{ backgroundColor: char.color }}
                  >
                    {char.avatarUrl && (
                      <img src={char.avatarUrl} alt={char.name} className="w-12 h-12 rounded-full" />
                    )}
                  </div>
                  <div className="text-white text-xs font-bold text-center truncate">
                    {char.name}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCharacterSelect(false)}
              className="w-full px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlappyBirdGame;

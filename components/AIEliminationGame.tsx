
import React, { useRef, useEffect, useState } from 'react';
import { Character } from '../types';
import { CHARACTERS } from '../constants';
import { saveEliminationScore } from '../lib/supabase';

interface AIEliminationGameProps {
  onBack: () => void;
  onWin: () => void;
  selectedCharacterId: string;
  eliminationWins: number;
}

interface Combatant {
  id: string;
  character: Character;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lives: number;
  eliminated: boolean;
  flashTime: number;
  radius: number;
  eliminationOrder?: number;
}

const BASE_ARENA_SIZE = 600;
const AVATAR_RADIUS = 30;
const INITIAL_SPEED = 0.5; // Start even slower
const LIVES = 3;
const COLLISION_FLASH_DURATION = 10;
const SPEED_INCREASE_INTERVAL = 8 * 60; // Increase speed every 8 seconds (slower ramp up)
const TARGET_GAME_DURATION = 60; // Target 60 seconds (1 minute)
const WINNER_CELEBRATION_FRAMES = 180; // 3 seconds at 60fps to show winner before overlay

const AIEliminationGame: React.FC<AIEliminationGameProps> = ({
  onBack,
  onWin,
  selectedCharacterId: initialSelectedCharacterId,
  eliminationWins
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const combatantsRef = useRef<Combatant[]>([]);
  const speedMultiplierRef = useRef(1);
  const frameCountRef = useRef(0);
  const avatarImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const eliminationOrderRef = useRef(0);
  const playerEliminatedRef = useRef(false);
  const winnerCelebrationFramesRef = useRef(0);

  const [winner, setWinner] = useState<Character | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(true);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialSelectedCharacterId);
  const [fighterCount, setFighterCount] = useState(8);
  const [score, setScore] = useState(0);
  const [placement, setPlacement] = useState(0);
  const [unlockedTop5, setUnlockedTop5] = useState(false);

  // Calculate arena size based on fighter count
  const arenaSize = Math.min(BASE_ARENA_SIZE + (fighterCount - 8) * 30, 900); // Max 900px

  // Preload avatar images
  useEffect(() => {
    CHARACTERS.forEach(char => {
      const img = new Image();
      img.src = char.avatarUrl;
      avatarImagesRef.current.set(char.id, img);
    });
  }, []);

  // Calculate score based on placement, eliminations, and survival time
  const calculateScore = (finalPlacement: number, totalFighters: number, survivedSeconds: number): number => {
    const placementPoints = (totalFighters - finalPlacement + 1) * 100;
    const survivalPoints = Math.floor(survivedSeconds * 10);
    const winBonus = finalPlacement === 1 ? 500 : 0;
    return placementPoints + survivalPoints + winBonus;
  };

  // Initialize combatants
  const initializeCombatants = () => {
    const activeCombatants: Combatant[] = [];
    speedMultiplierRef.current = 1;
    frameCountRef.current = 0;
    eliminationOrderRef.current = 0;
    playerEliminatedRef.current = false;
    winnerCelebrationFramesRef.current = 0;
    setScore(0);
    setPlacement(0);

    // Use ALL characters for the battle
    const selectedFighters = CHARACTERS.slice(0, fighterCount);

    selectedFighters.forEach((char, index) => {
      const angle = (index / selectedFighters.length) * Math.PI * 2;
      const startRadius = arenaSize * 0.3;

      activeCombatants.push({
        id: char.id,
        character: char,
        x: arenaSize / 2 + Math.cos(angle) * startRadius,
        y: arenaSize / 2 + Math.sin(angle) * startRadius,
        vx: (Math.random() - 0.5) * INITIAL_SPEED * 2,
        vy: (Math.random() - 0.5) * INITIAL_SPEED * 2,
        lives: LIVES,
        eliminated: false,
        flashTime: 0,
        radius: AVATAR_RADIUS
      });
    });

    combatantsRef.current = activeCombatants;
  };

  // Draw avatar with image
  const drawAvatar = (
    ctx: CanvasRenderingContext2D,
    combatant: Combatant,
    isFlashing: boolean
  ) => {
    const { x, y, character, radius, lives } = combatant;

    ctx.save();

    // Flash effect on collision
    if (isFlashing) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
    }

    // Draw avatar image or fallback circle
    const avatarImg = avatarImagesRef.current.get(character.id);
    if (avatarImg && avatarImg.complete && avatarImg.naturalHeight !== 0) {
      // Clip to circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image
      ctx.drawImage(avatarImg, x - radius, y - radius, radius * 2, radius * 2);

      // Draw border
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isFlashing ? '#ff0000' : character.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // Fallback: colored circle with initials
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = character.color;
      ctx.fill();
      ctx.strokeStyle = isFlashing ? '#ff0000' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(character.name.substring(0, 2), x, y);
    }

    ctx.restore();

    // Draw lives below avatar
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = lives === 3 ? '#22c55e' : lives === 2 ? '#f59e0b' : '#ef4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`♥ ${lives}`, x, y + radius + 5);
  };

  // Game loop
  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Increment frame counter
    frameCountRef.current++;

    // Increase speed every 8 seconds - gradual ramp up to finish in ~1 minute
    if (frameCountRef.current % SPEED_INCREASE_INTERVAL === 0) {
      speedMultiplierRef.current += 0.4; // Gradual speed increase
    }

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, arenaSize, arenaSize);

    // Draw arena border
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, arenaSize - 4, arenaSize - 4);

    const combatants = combatantsRef.current;
    const activeCombatants = combatants.filter(c => !c.eliminated);

    // Update positions and handle wall collisions
    activeCombatants.forEach(combatant => {
      // Update position with speed multiplier
      combatant.x += combatant.vx * speedMultiplierRef.current;
      combatant.y += combatant.vy * speedMultiplierRef.current;

      // Wall collision
      if (combatant.x - combatant.radius < 0) {
        combatant.x = combatant.radius;
        combatant.vx = Math.abs(combatant.vx);
      } else if (combatant.x + combatant.radius > arenaSize) {
        combatant.x = arenaSize - combatant.radius;
        combatant.vx = -Math.abs(combatant.vx);
      }

      if (combatant.y - combatant.radius < 0) {
        combatant.y = combatant.radius;
        combatant.vy = Math.abs(combatant.vy);
      } else if (combatant.y + combatant.radius > arenaSize) {
        combatant.y = arenaSize - combatant.radius;
        combatant.vy = -Math.abs(combatant.vy);
      }

      // Decrease flash time
      if (combatant.flashTime > 0) {
        combatant.flashTime--;
      }
    });

    // Handle combatant collisions
    for (let i = 0; i < activeCombatants.length; i++) {
      for (let j = i + 1; j < activeCombatants.length; j++) {
        const c1 = activeCombatants[i];
        const c2 = activeCombatants[j];

        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = c1.radius + c2.radius;

        if (distance < minDistance) {
          // Collision detected!
          c1.flashTime = COLLISION_FLASH_DURATION;
          c2.flashTime = COLLISION_FLASH_DURATION;

          // Reduce lives
          c1.lives--;
          c2.lives--;

          // Check for elimination and assign order
          if (c1.lives <= 0 && !c1.eliminated) {
            c1.eliminated = true;
            eliminationOrderRef.current++;
            c1.eliminationOrder = eliminationOrderRef.current;
          }
          if (c2.lives <= 0 && !c2.eliminated) {
            c2.eliminated = true;
            eliminationOrderRef.current++;
            c2.eliminationOrder = eliminationOrderRef.current;
          }

          // Separate the combatants
          const overlap = minDistance - distance;
          const separationX = (dx / distance) * overlap / 2;
          const separationY = (dy / distance) * overlap / 2;

          c1.x -= separationX;
          c1.y -= separationY;
          c2.x += separationX;
          c2.y += separationY;

          // Elastic collision - exchange velocities
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);

          const v1x = c1.vx * cos + c1.vy * sin;
          const v1y = c1.vy * cos - c1.vx * sin;
          const v2x = c2.vx * cos + c2.vy * sin;
          const v2y = c2.vy * cos - c2.vx * sin;

          const temp = v1x;
          const newV1x = v2x;
          const newV2x = temp;

          c1.vx = newV1x * cos - v1y * sin;
          c1.vy = v1y * cos + newV1x * sin;
          c2.vx = newV2x * cos - v2y * sin;
          c2.vy = v2y * cos + newV2x * sin;
        }
      }
    }

    // Draw all combatants
    activeCombatants.forEach(combatant => {
      drawAvatar(ctx, combatant, combatant.flashTime > 0);
    });

    // Draw eliminated count
    const eliminatedCount = combatants.filter(c => c.eliminated).length;
    if (eliminatedCount > 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`💀 ELIMINATED: ${eliminatedCount}`, arenaSize - 10, 30);
    }

    // Draw speed multiplier indicator
    if (speedMultiplierRef.current > 1) {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.9)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`⚡ SPEED: ${speedMultiplierRef.current.toFixed(1)}x`, 10, 30);
    }

    // Draw score in top center
    const survivedSeconds = Math.floor(frameCountRef.current / 60);
    const playerCombatant = combatants.find(c => c.character.id === selectedCharacterId);
    const currentPlacement = playerCombatant?.eliminated
      ? combatants.length - (playerCombatant.eliminationOrder || 0) + 1
      : activeCombatants.length;
    const currentScore = calculateScore(currentPlacement, combatants.length, survivedSeconds);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SCORE: ${currentScore}`, arenaSize / 2, 30);

    // Show "SPECTATING" if player is eliminated
    if (playerEliminatedRef.current) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('👁️ SPECTATING', arenaSize / 2, 50);
    }

    // Check if player just got eliminated (only set once)
    if (!playerEliminatedRef.current && playerCombatant?.eliminated) {
      playerEliminatedRef.current = true;
      const finalPlacement = combatants.length - (playerCombatant.eliminationOrder || 0) + 1;
      const finalScore = calculateScore(finalPlacement, combatants.length, survivedSeconds);
      setScore(finalScore);
      setPlacement(finalPlacement);
    }

    // Check for winner
    if (activeCombatants.length === 1) {
      const finalWinner = activeCombatants[0];

      // If we just detected the winner, start the celebration countdown
      if (winnerCelebrationFramesRef.current === 0) {
        const finalPlacement = finalWinner.character.id === selectedCharacterId ? 1 : (playerCombatant?.eliminated ? combatants.length - (playerCombatant.eliminationOrder || 0) + 1 : combatants.length);
        const finalScore = calculateScore(finalPlacement, combatants.length, survivedSeconds);

        if (!playerEliminatedRef.current) {
          setScore(finalScore);
          setPlacement(finalPlacement);
        }
      }

      winnerCelebrationFramesRef.current++;

      // Show celebration message on the arena
      ctx.save();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.95)';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 WINNER 🏆', arenaSize / 2, arenaSize / 2 - 20);
      ctx.font = 'bold 24px monospace';
      ctx.fillText(finalWinner.character.name, arenaSize / 2, arenaSize / 2 + 20);
      ctx.restore();

      // After celebration period, show winner overlay
      if (winnerCelebrationFramesRef.current >= WINNER_CELEBRATION_FRAMES) {
        setWinner(finalWinner.character);
        return;
      }

      // Continue game loop during celebration
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (activeCombatants.length === 0) {
      setWinner(null);
      return;
    }

    // Continue loop regardless of player status
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // Start game
  const handleStart = () => {
    setGameStarted(true);
    setWinner(null);
    setShowNameEntry(false);
    setUnlockedTop5(false);
    initializeCombatants();
    gameLoop();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle winner
  useEffect(() => {
    if (winner) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Check if player placed top 5 to unlock new fighter
      if (placement > 0 && placement <= 5) {
        setUnlockedTop5(true);
        onWin();
      }

      // Show name entry after 2 seconds
      setTimeout(() => {
        setShowNameEntry(true);
      }, 2000);
    }
  }, [winner, placement, onWin]);

  const unlockedCount = Math.min(3 + eliminationWins, CHARACTERS.length);

  // Save score to Supabase
  const handleSaveScore = async () => {
    if (!playerName.trim()) return;

    try {
      await saveEliminationScore({
        name: playerName,
        score,
        placement,
        total_fighters: fighterCount,
        fighter_used: CHARACTERS.find(c => c.id === selectedCharacterId)?.name || 'Unknown'
      });
      console.log('Elimination score saved to Supabase!');
    } catch (error) {
      console.error('Failed to save elimination score:', error);
    }
  };

  // Name entry screen
  if (showNameEntry) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 p-6">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border-2 border-cyan-500/30">
          <h2 className="text-3xl font-black text-white mb-2 text-center">
            {placement === 1 ? '🏆 VICTORY!' : placement <= 5 ? '✨ TOP 5!' : `ELIMINATED`}
          </h2>
          <p className="text-cyan-400 text-center mb-2">
            Placement: #{placement} / {fighterCount}
          </p>
          {unlockedTop5 && (
            <p className="text-green-400 font-bold text-center mb-4 animate-pulse">
              🎉 NEW FIGHTER UNLOCKED!
            </p>
          )}
          <div className="text-center mb-6">
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
              {score.toLocaleString()}
            </p>
            <p className="text-white/60 text-sm">POINTS</p>
          </div>

          <div className="mb-6">
            <label className="block text-white/80 text-sm font-bold mb-2">
              ENTER YOUR NAME
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="Your name..."
              maxLength={20}
              className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg text-white placeholder-white/30 focus:border-cyan-500 focus:outline-none font-mono"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                await handleSaveScore();
                setShowCharacterSelect(true);
                setGameStarted(false);
                setWinner(null);
                setShowNameEntry(false);
                setPlayerName('');
                setUnlockedTop5(false);
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-lg"
            >
              FIGHT AGAIN
            </button>
            <button
              onClick={async () => {
                await handleSaveScore();
                onBack();
              }}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg"
            >
              MAIN MENU
            </button>
          </div>

          {playerName && (
            <p className="text-center text-green-400 text-xs mt-4">
              ✓ Score will be saved to global leaderboard as "{playerName}"
            </p>
          )}
        </div>
      </div>
    );
  }

  // Character selection screen
  if (showCharacterSelect) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 p-6">
        <div className="w-full max-w-5xl flex flex-col" style={{maxHeight: 'calc(100vh - 2rem)'}}>
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500">
                SELECT YOUR FIGHTER
              </h1>
              <p className="text-cyan-400 text-xs mt-1">
                {unlockedCount} / {CHARACTERS.length} FIGHTERS UNLOCKED
              </p>
            </div>
          </div>

          {/* Fighter count selector */}
          <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 shrink-0">
            <label className="block text-white/80 text-sm font-bold mb-2">
              NUMBER OF FIGHTERS IN BATTLE
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="8"
                max={CHARACTERS.length}
                value={fighterCount}
                onChange={(e) => setFighterCount(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((fighterCount - 8) / (CHARACTERS.length - 8)) * 100}%, #334155 ${((fighterCount - 8) / (CHARACTERS.length - 8)) * 100}%, #334155 100%)`
                }}
              />
              <span className="text-2xl font-bold text-cyan-400 font-mono w-12 text-center">
                {fighterCount}
              </span>
            </div>
            <p className="text-white/40 text-xs mt-2">
              Minimum 8 fighters • Arena scales with size
            </p>
          </div>

          <div className="flex-1 min-h-0 mb-4">
            <div className="grid grid-cols-6 lg:grid-cols-8 gap-2 h-full content-start overflow-y-auto">
              {CHARACTERS.map((char, index) => {
                const isLocked = index >= unlockedCount;
                const isSelected = selectedCharacterId === char.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => !isLocked && setSelectedCharacterId(char.id)}
                    disabled={isLocked}
                    className={`relative group flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_15px_rgba(34,211,238,0.3)] z-10'
                        : isLocked
                          ? 'border-slate-800 bg-slate-900/50 opacity-60 cursor-not-allowed'
                          : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <img
                      src={char.avatarUrl}
                      alt={char.name}
                      className="w-10 h-10 rounded-full object-cover shadow-lg border-2 border-white/20 mb-1.5 transition-transform group-hover:scale-105"
                    />
                    <span className={`text-[9px] font-bold font-mono truncate w-full text-center transition-colors ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {char.name}
                    </span>

                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl backdrop-blur-[2px]">
                        <span className="text-lg mb-0.5 drop-shadow-md">🔒</span>
                        <span className="text-[9px] text-white font-bold bg-purple-500/80 px-1.5 py-0.5 rounded font-mono shadow-sm">
                          TOP 5
                        </span>
                      </div>
                    )}

                    {isSelected && !isLocked && (
                      <div className="absolute inset-0 border-2 border-cyan-400 rounded-xl animate-pulse opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 shrink-0">
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm transition-all backdrop-blur-md"
            >
              ← BACK
            </button>
            <button
              onClick={() => setShowCharacterSelect(false)}
              className="flex-1 py-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              CONTINUE TO ARENA
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 p-6">
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500 mb-2">
            AI ELIMINATION
          </h1>
          <p className="text-white/70 text-sm">Last one standing wins</p>
          <p className="text-cyan-400 text-xs mt-2">
            Playing as: {CHARACTERS.find(c => c.id === selectedCharacterId)?.name} • {fighterCount} Fighters
          </p>
        </div>

        {/* Canvas */}
        <div className="relative mb-6">
          <canvas
            ref={canvasRef}
            width={arenaSize}
            height={arenaSize}
            className="border-4 border-cyan-500 rounded-lg shadow-2xl"
          />

          {/* Winner overlay */}
          {winner && !showNameEntry && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center">
                <div className="text-6xl mb-4">{placement === 1 ? '🏆' : placement <= 5 ? '✨' : '💀'}</div>
                <h2 className="text-3xl font-bold text-white mb-2">{winner.name}</h2>
                <p className="text-xl text-cyan-400 mb-6">WINS!</p>
                {placement > 0 && placement <= 5 && (
                  <p className="text-green-400 font-bold mb-4">
                    {placement === 1 ? '🎉 VICTORY' : `✨ TOP 5 FINISH`} • New fighter unlocked!
                  </p>
                )}
                <p className="text-white/60 text-sm">Calculating score...</p>
              </div>
            </div>
          )}

          {/* Start overlay */}
          {!gameStarted && !winner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">HOW TO PLAY</h2>
                <div className="text-white/80 text-sm space-y-2 mb-6">
                  <p>• {fighterCount} fighters enter the arena</p>
                  <p>• Each has 3 lives (♥)</p>
                  <p>• Every collision = -1 life</p>
                  <p>• Speed increases gradually over time</p>
                  <p>• Watch the full match play out!</p>
                  <p>• Last one standing wins</p>
                  <p className="text-cyan-400 font-bold mt-4">Higher placement = more points!</p>
                  <p className="text-purple-400 font-bold">You can spectate after elimination!</p>
                </div>
              </div>
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold text-xl rounded-xl shadow-lg transform transition-all hover:scale-105"
              >
                BEGIN ELIMINATION
              </button>
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => setShowCharacterSelect(true)}
          className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm transition-all backdrop-blur-md"
        >
          ← CHANGE FIGHTER
        </button>
      </div>
    </div>
  );
};

export default AIEliminationGame;


import React, { useRef, useEffect, useState } from 'react';
import { Character } from '../types';
import { CHARACTERS } from '../constants';
import { saveEliminationScore } from '../lib/supabase';
import { getRankLevel } from '../utils/rankingSystem';

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

interface EliminationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const BASE_ARENA_WIDTH = 750;
const BASE_ARENA_HEIGHT = 450;
const AVATAR_RADIUS = 30;
const INITIAL_SPEED = 0.5; // Start even slower
const LIVES = 10; // Increased from 3 to 10
const COLLISION_FLASH_DURATION = 10;
const SPEED_INCREASE_INTERVAL = 8 * 60; // Increase speed every 8 seconds (slower ramp up)
const TARGET_GAME_DURATION = 60; // Target 60 seconds (1 minute)
const WINNER_CELEBRATION_FRAMES = 180; // 3 seconds at 60fps to show winner before overlay

// AI difficulty levels
const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Easy mode', description: '8 AI fighters', fighterCount: 8, color: 'from-green-400 to-green-600' },
  { id: 'medium', name: 'Medium', description: '12 AI fighters', fighterCount: 12, color: 'from-blue-400 to-blue-600' },
  { id: 'hard', name: 'Difficult', description: '16 AI fighters', fighterCount: 16, color: 'from-orange-400 to-orange-600' },
  { id: 'nightmare', name: 'Nightmare mode', description: '22 AI fighters', fighterCount: 22, color: 'from-red-500 to-purple-600' }
];

// Game modes
const GAME_MODES = [
  {
    id: 'classic',
    name: 'Classic Battle',
    description: 'Standard elimination rules',
    icon: '⚔️',
    lives: 10,
    baseSpeed: 0.5,
    speedInterval: 8 * 60,
    speedIncrement: 0.4,
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'blitz',
    name: 'Blitz Mode',
    description: 'Fast-paced chaos',
    icon: '⚡',
    lives: 5,
    baseSpeed: 0.8,
    speedInterval: 4 * 60,
    speedIncrement: 0.8,
    color: 'from-yellow-400 to-orange-600'
  },
  {
    id: 'marathon',
    name: 'Marathon Mode',
    description: 'Endurance challenge',
    icon: '🏃',
    lives: 20,
    baseSpeed: 0.3,
    speedInterval: 12 * 60,
    speedIncrement: 0.2,
    color: 'from-green-400 to-teal-600'
  }
];

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
  const eliminationParticlesRef = useRef<EliminationParticle[]>([]);

  const [winner, setWinner] = useState<Character | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showGameModeSelect, setShowGameModeSelect] = useState(true);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [showPostGameLeaderboard, setShowPostGameLeaderboard] = useState(false);
  const [showInGameLeaderboard, setShowInGameLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialSelectedCharacterId);
  const [selectedGameMode, setSelectedGameMode] = useState(GAME_MODES[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS[0]);
  const [fighterCount, setFighterCount] = useState(8);
  const [score, setScore] = useState(0);
  const [placement, setPlacement] = useState(0);
  const [unlockedTop5, setUnlockedTop5] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<Array<{character: Character, placement: number}>>([]);

  // Calculate arena dimensions based on fighter count (horizontal layout)
  const arenaWidth = Math.min(BASE_ARENA_WIDTH + (fighterCount - 8) * 15, 900); // Max 900px width
  const arenaHeight = Math.min(BASE_ARENA_HEIGHT + (fighterCount - 8) * 8, 550); // Max 550px height

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

  // Create elimination particle effect
  const createEliminationParticles = (x: number, y: number, color: string) => {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      eliminationParticlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30, // frames
        color
      });
    }
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

    selectedFighters.forEach((char) => {
      // Randomize starting positions (avoiding edges)
      const padding = AVATAR_RADIUS * 2;
      const x = padding + Math.random() * (arenaWidth - padding * 2);
      const y = padding + Math.random() * (arenaHeight - padding * 2);

      activeCombatants.push({
        id: char.id,
        character: char,
        x,
        y,
        vx: (Math.random() - 0.5) * selectedGameMode.baseSpeed * 2,
        vy: (Math.random() - 0.5) * selectedGameMode.baseSpeed * 2,
        lives: selectedGameMode.lives,
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

    // Draw lives below avatar (color based on percentage)
    ctx.font = 'bold 12px monospace';
    const maxLives = selectedGameMode.lives;
    const lifePercentage = lives / maxLives;
    ctx.fillStyle = lifePercentage >= 0.6 ? '#22c55e' : lifePercentage >= 0.3 ? '#f59e0b' : '#ef4444';
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

    // Increase speed based on game mode
    if (frameCountRef.current % selectedGameMode.speedInterval === 0) {
      speedMultiplierRef.current += selectedGameMode.speedIncrement;
    }

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, arenaWidth, arenaHeight);

    // Draw arena border
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, arenaWidth - 4, arenaHeight - 4);

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
      } else if (combatant.x + combatant.radius > arenaWidth) {
        combatant.x = arenaWidth - combatant.radius;
        combatant.vx = -Math.abs(combatant.vx);
      }

      if (combatant.y - combatant.radius < 0) {
        combatant.y = combatant.radius;
        combatant.vy = Math.abs(combatant.vy);
      } else if (combatant.y + combatant.radius > arenaHeight) {
        combatant.y = arenaHeight - combatant.radius;
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

          // Track if both are eliminated in the same collision (tied placement)
          const c1JustEliminated = c1.lives <= 0 && !c1.eliminated;
          const c2JustEliminated = c2.lives <= 0 && !c2.eliminated;

          // Check for elimination and assign order
          if (c1JustEliminated && c2JustEliminated) {
            // Both eliminated at same time - same placement
            eliminationOrderRef.current++;
            c1.eliminated = true;
            c2.eliminated = true;
            c1.eliminationOrder = eliminationOrderRef.current;
            c2.eliminationOrder = eliminationOrderRef.current;
            // Create elimination particles
            createEliminationParticles(c1.x, c1.y, c1.character.color);
            createEliminationParticles(c2.x, c2.y, c2.character.color);
          } else {
            // Separate eliminations
            if (c1JustEliminated) {
              c1.eliminated = true;
              eliminationOrderRef.current++;
              c1.eliminationOrder = eliminationOrderRef.current;
              // Create elimination particles
              createEliminationParticles(c1.x, c1.y, c1.character.color);
            }
            if (c2JustEliminated) {
              c2.eliminated = true;
              eliminationOrderRef.current++;
              c2.eliminationOrder = eliminationOrderRef.current;
              // Create elimination particles
              createEliminationParticles(c2.x, c2.y, c2.character.color);
            }
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

    // Update and draw elimination particles
    eliminationParticlesRef.current = eliminationParticlesRef.current.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      return particle.life > 0;
    });

    // Draw particles
    eliminationParticlesRef.current.forEach(particle => {
      const alpha = particle.life / 30;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

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
      ctx.fillText(`💀 ELIMINATED: ${eliminatedCount}`, arenaWidth - 10, 30);
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
    ctx.fillText(`SCORE: ${currentScore}`, arenaWidth / 2, 30);

    // Show "SPECTATING" if player is eliminated
    if (playerEliminatedRef.current) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('👁️ SPECTATING', arenaWidth / 2, 50);
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
      ctx.fillText('🏆 WINNER 🏆', arenaWidth / 2, arenaHeight / 2 - 20);
      ctx.font = 'bold 24px monospace';
      ctx.fillText(finalWinner.character.name, arenaWidth / 2, arenaHeight / 2 + 20);
      ctx.restore();

      // After celebration period, calculate final leaderboard and show winner overlay
      if (winnerCelebrationFramesRef.current >= WINNER_CELEBRATION_FRAMES) {
        // Build final leaderboard
        const leaderboard = combatants.map(c => ({
          character: c.character,
          placement: c.eliminated
            ? combatants.length - (c.eliminationOrder || 0) + 1
            : 1 // Winner gets placement 1
        })).sort((a, b) => a.placement - b.placement);

        setFinalLeaderboard(leaderboard);
        setWinner(finalWinner.character);
        return;
      }

      // Continue game loop during celebration
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Handle case where all fighters are eliminated (tied for last place)
    if (activeCombatants.length === 0 && combatants.length > 0) {
      // Find the fighters with the highest elimination order (eliminated last = winners)
      const maxEliminationOrder = Math.max(...combatants.map(c => c.eliminationOrder || 0));
      const winners = combatants.filter(c => c.eliminationOrder === maxEliminationOrder);

      // Show celebration for tied winners
      ctx.save();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.95)';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';

      if (winners.length > 1) {
        ctx.fillText('🏆 TIE! 🏆', arenaWidth / 2, arenaHeight / 2 - 40);
        ctx.font = 'bold 20px monospace';
        ctx.fillText('WINNERS:', arenaWidth / 2, arenaHeight / 2 - 10);
        winners.forEach((w, i) => {
          ctx.fillText(w.character.name, arenaWidth / 2, arenaHeight / 2 + 20 + (i * 25));
        });
      } else if (winners.length === 1) {
        ctx.fillText('🏆 WINNER 🏆', arenaWidth / 2, arenaHeight / 2 - 20);
        ctx.font = 'bold 24px monospace';
        ctx.fillText(winners[0].character.name, arenaWidth / 2, arenaHeight / 2 + 20);
      }
      ctx.restore();

      // Build final leaderboard
      const leaderboard = combatants.map(c => ({
        character: c.character,
        placement: c.eliminated ? combatants.length - (c.eliminationOrder || 0) + 1 : 1
      })).sort((a, b) => a.placement - b.placement);

      setFinalLeaderboard(leaderboard);
      setWinner(winners[0]?.character || combatants[0].character);
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

  const unlockedCount = CHARACTERS.length; // All characters unlocked from the start

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

  // Post-game leaderboard screen
  if (showPostGameLeaderboard) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/95 p-6 overflow-y-auto">
        {/* HOME BUTTON */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-4 py-2 bg-slate-800/90 border-2 border-white/20 rounded-lg text-white font-bold hover:bg-slate-700 transition-all flex items-center gap-2 z-50"
        >
          <span>🏠</span> HOME
        </button>

        <div className="max-w-3xl w-full mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border-2 border-cyan-500/30 my-auto">
          <h2 className="text-4xl font-black text-white mb-2 text-center">
            FINAL STANDINGS
          </h2>
          <p className="text-cyan-400 text-center mb-6">{selectedGameMode.name} • {selectedDifficulty.name} • {fighterCount} Fighters</p>

          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {finalLeaderboard.map((entry, index) => {
              const isPlayer = entry.character.id === selectedCharacterId;
              return (
                <div
                  key={`${entry.character.id}-${index}`}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    isPlayer
                      ? 'bg-cyan-900/40 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg shrink-0 ${
                    entry.placement === 1
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900'
                      : entry.placement === 2
                        ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900'
                        : entry.placement === 3
                          ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-slate-900'
                          : 'bg-slate-700 text-slate-300'
                  }`}>
                    #{entry.placement}
                  </div>

                  <img
                    src={entry.character.avatarUrl}
                    alt={entry.character.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-lg ${isPlayer ? 'text-cyan-300' : 'text-white'}`}>
                        {entry.character.name}
                      </span>
                      {isPlayer && (
                        <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded">YOU</span>
                      )}
                    </div>
                  </div>

                  {entry.placement === 1 && <span className="text-2xl">🏆</span>}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowPostGameLeaderboard(false);
                setShowCharacterSelect(true);
                setGameStarted(false);
                setWinner(null);
                setShowNameEntry(false);
                setPlayerName('');
                setUnlockedTop5(false);
                setFinalLeaderboard([]);
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"
            >
              <span>🔄</span> FIGHT AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Name entry screen
  if (showNameEntry) {
    const rank = getRankLevel(score);

    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/95 p-6">
        {/* HOME BUTTON */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-4 py-2 bg-slate-800/90 border-2 border-white/20 rounded-lg text-white font-bold hover:bg-slate-700 transition-all flex items-center gap-2 z-50"
        >
          <span>🏠</span> HOME
        </button>

        <div className="max-w-md w-full mx-auto my-auto bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border-2 border-cyan-500/30">
          <h2 className="text-3xl font-black text-white mb-2 text-center">
            {placement === 1 ? '🏆 VICTORY!' : placement <= 5 ? '✨ TOP 5!' : `ELIMINATED`}
          </h2>
          <p className="text-cyan-400 text-center mb-2">
            Placement: #{placement} / {fighterCount}
          </p>

          {/* Rank Achievement Badge */}
          <div className={`
            flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold text-base mb-4 mx-auto
            bg-gradient-to-r ${rank.gradient}
            shadow-xl
            border-2 border-white/20
          `}
          style={{
            boxShadow: `0 4px 20px ${rank.color}60, inset 0 1px 2px rgba(255,255,255,0.3)`
          }}>
            <span className="text-2xl drop-shadow-lg">{rank.emoji}</span>
            <span className="text-white drop-shadow-lg tracking-wide">RANK: {rank.title.toUpperCase()}</span>
          </div>

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
                setShowNameEntry(false);
                setShowPostGameLeaderboard(true);
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg"
            >
              VIEW FINAL STANDINGS →
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

  // Game Mode selection screen
  if (showGameModeSelect) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/30 p-6">
        {/* HOME BUTTON */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-4 py-2 bg-slate-800/90 border-2 border-white/20 rounded-lg text-white font-bold hover:bg-slate-700 transition-all flex items-center gap-2 z-50"
        >
          <span>🏠</span> HOME
        </button>

        {/* VERSION BADGE - Top Right */}
        <div className="absolute top-6 right-6 z-50">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-lg hover:border-cyan-400/50 transition-all duration-300">
              <span className="text-[10px] text-cyan-400/60 font-mono tracking-wider uppercase">Version</span>
              <span className="text-sm text-cyan-300 font-mono font-bold tracking-wide">1.0.0</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center">
          {/* Enhanced Title Section */}
          <div className="text-center mb-10 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 blur-3xl"></div>
            <div className="relative">
              <h1 className="text-6xl md:text-7xl font-black mb-3">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-purple-400 to-pink-400 animate-pulse">
                  AI ELIMINATION
                </span>
              </h1>
              <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-purple-500/30 backdrop-blur-sm mb-3">
                <p className="text-purple-300 text-lg font-bold tracking-wide">SELECT GAME MODE</p>
              </div>
              <p className="text-slate-400 text-sm mt-2">Choose your battle style and dominate the arena</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {GAME_MODES.map((mode) => {
              const isSelected = selectedGameMode.id === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedGameMode(mode)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-900/30 shadow-[0_0_30px_rgba(34,211,238,0.4)] scale-105'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800 hover:scale-105'
                  }`}
                >
                  <div className="text-6xl mb-3">{mode.icon}</div>
                  <div className={`inline-block px-4 py-2 rounded-full font-bold text-base mb-3 bg-gradient-to-r ${mode.color} text-white shadow-lg`}>
                    {mode.name}
                  </div>
                  <p className="text-slate-300 text-sm mb-3">{mode.description}</p>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p>♥ Lives: {mode.lives}</p>
                    <p>🏃 Base Speed: {mode.baseSpeed}x</p>
                    <p>⚡ Acceleration: {mode.speedIncrement}x per {mode.speedInterval / 60}s</p>
                  </div>
                  {isSelected && (
                    <div className="mt-3 text-cyan-400 font-bold flex items-center justify-center gap-2">
                      <span className="text-xl">✓</span> SELECTED
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setShowGameModeSelect(false);
                setShowDifficultySelect(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold text-xl rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              SELECT DIFFICULTY →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Difficulty selection screen
  if (showDifficultySelect) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/95 p-6">
        {/* HOME BUTTON */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-4 py-2 bg-slate-800/90 border-2 border-white/20 rounded-lg text-white font-bold hover:bg-slate-700 transition-all flex items-center gap-2 z-50"
        >
          <span>🏠</span> HOME
        </button>

        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500 mb-2">
              SELECT DIFFICULTY
            </h1>
            <p className="text-slate-400 text-sm">Choose your AI challenge level</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {DIFFICULTY_LEVELS.map((diff) => {
              const isSelected = selectedDifficulty.id === diff.id;
              return (
                <button
                  key={diff.id}
                  onClick={() => {
                    setSelectedDifficulty(diff);
                    setFighterCount(diff.fighterCount);
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-900/30 shadow-[0_0_30px_rgba(34,211,238,0.4)] scale-105'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800 hover:scale-102'
                  }`}
                >
                  <div className={`inline-block px-4 py-2 rounded-full font-bold text-lg mb-3 bg-gradient-to-r ${diff.color} text-white shadow-lg`}>
                    {diff.name}
                  </div>
                  <p className="text-2xl font-mono font-bold text-white mb-2">{diff.description}</p>
                  <p className="text-slate-400 text-sm">
                    {diff.id === 'easy' && 'Perfect for beginners'}
                    {diff.id === 'medium' && 'A balanced challenge'}
                    {diff.id === 'hard' && 'For experienced players'}
                    {diff.id === 'nightmare' && 'The ultimate test'}
                  </p>
                  {isSelected && (
                    <div className="mt-3 text-cyan-400 font-bold flex items-center justify-center gap-2">
                      <span className="text-xl">✓</span> SELECTED
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setShowDifficultySelect(false);
                setShowGameModeSelect(true);
              }}
              className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm transition-all backdrop-blur-md"
            >
              ← GAME MODE
            </button>
            <button
              onClick={() => {
                setShowDifficultySelect(false);
                setShowCharacterSelect(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold text-xl rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              SELECT YOUR FIGHTER →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Character selection screen (simplified)
  if (showCharacterSelect) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/95 p-6">
        {/* HOME BUTTON */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 px-4 py-2 bg-slate-800/90 border-2 border-white/20 rounded-lg text-white font-bold hover:bg-slate-700 transition-all flex items-center gap-2 z-50"
        >
          <span>🏠</span> HOME
        </button>

        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500">
              SELECT YOUR FIGHTER
            </h1>
            <p className="text-cyan-400 text-sm mt-2">
              {selectedGameMode.name} • {selectedDifficulty.name} • {unlockedCount} / {CHARACTERS.length} FIGHTERS UNLOCKED
            </p>
          </div>

          <div className="grid grid-cols-6 lg:grid-cols-8 gap-3 mb-6 max-h-96 overflow-y-auto p-2">
            {CHARACTERS.map((char, index) => {
              const isLocked = index >= unlockedCount;
              const isSelected = selectedCharacterId === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => !isLocked && setSelectedCharacterId(char.id)}
                  disabled={isLocked}
                  className={`relative group flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-110 z-10'
                      : isLocked
                        ? 'border-slate-800 bg-slate-900/50 opacity-60 cursor-not-allowed'
                        : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-700 hover:scale-105'
                  }`}
                >
                  <img
                    src={char.avatarUrl}
                    alt={char.name}
                    className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-white/20 mb-2"
                  />
                  <span className={`text-[10px] font-bold font-mono truncate w-full text-center ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                    {char.name}
                  </span>

                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl backdrop-blur-[2px]">
                      <span className="text-2xl mb-1">🔒</span>
                      <span className="text-[9px] text-white font-bold bg-purple-500/80 px-2 py-0.5 rounded font-mono">
                        TOP 5
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setShowCharacterSelect(false);
                setShowDifficultySelect(true);
              }}
              className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm transition-all backdrop-blur-md"
            >
              ← DIFFICULTY
            </button>
            <button
              onClick={() => setShowCharacterSelect(false)}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold text-xl rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              ENTER ARENA →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-900/95 p-6">
      {/* HOME BUTTON */}
      <button
        onClick={() => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          onBack();
        }}
        className="absolute top-4 left-4 px-4 py-2 bg-slate-800/90 border-2 border-white/20 rounded-lg text-white font-bold hover:bg-slate-700 transition-all flex items-center gap-2 z-50"
      >
        <span>🏠</span> HOME
      </button>

      <div className="flex flex-col items-center justify-center flex-1">
        {/* Header */}
        <div className="mb-4 text-center relative">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500 mb-2">
            AI ELIMINATION
          </h1>
          <p className="text-white/70 text-sm">{selectedGameMode.name} • Last one standing wins</p>
          <p className="text-cyan-400 text-xs mt-2">
            Playing as: {CHARACTERS.find(c => c.id === selectedCharacterId)?.name} • {selectedDifficulty.name} • {fighterCount} Fighters
          </p>

          {/* STANDINGS button moved here */}
          {gameStarted && (
            <button
              onClick={() => setShowInGameLeaderboard(!showInGameLeaderboard)}
              className="absolute top-0 right-0 px-4 py-2 bg-slate-800/90 border-2 border-cyan-500 rounded-lg text-white font-bold hover:bg-slate-700 transition-all z-10 flex items-center gap-2"
            >
              <span className="text-lg">📊</span>
              {showInGameLeaderboard ? 'HIDE' : 'STANDINGS'}
            </button>
          )}
        </div>

        {/* Main game area - horizontal layout with eliminated panel on left */}
        <div className="flex gap-3 items-start mb-4">
          {/* Eliminated Players Panel (Left Side) */}
          <div className="w-56 bg-slate-800/80 border-2 border-red-500/30 rounded-lg p-3 shadow-2xl" style={{ height: `${arenaHeight}px` }}>
            <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
              <span>💀</span> ELIMINATED
            </h3>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: `${arenaHeight - 60}px` }}>
              {combatantsRef.current
                .filter(c => c.eliminated)
                .sort((a, b) => (b.eliminationOrder || 0) - (a.eliminationOrder || 0))
                .map((c) => {
                  const isPlayer = c.character.id === selectedCharacterId;
                  const eliminationPlacement = combatantsRef.current.length - (c.eliminationOrder || 0) + 1;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        isPlayer
                          ? 'bg-cyan-900/40 border border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                          : 'bg-slate-700/50'
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 border border-red-500 text-red-400 font-bold text-xs shrink-0">
                        #{eliminationPlacement}
                      </div>
                      <img
                        src={c.character.avatarUrl}
                        alt={c.character.name}
                        className="w-10 h-10 rounded-full object-cover grayscale border-2 border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`font-mono text-sm font-bold block truncate ${
                          isPlayer ? 'text-cyan-300' : 'text-white'
                        }`}>
                          {c.character.name}
                        </span>
                        {isPlayer && (
                          <span className="text-cyan-400 text-xs">YOU</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {combatantsRef.current.filter(c => c.eliminated).length === 0 && (
                <div className="text-center text-slate-500 text-sm py-8">
                  No eliminations yet...
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={arenaWidth}
              height={arenaHeight}
              className="border-4 border-cyan-500 rounded-lg shadow-2xl"
            />

          {/* In-game leaderboard overlay */}
          {showInGameLeaderboard && gameStarted && (
            <div className="absolute top-0 -right-[340px] w-80 max-h-96 overflow-y-auto bg-slate-800/95 border-2 border-cyan-500 rounded-xl p-4 z-20 shadow-2xl">
              <h3 className="text-xl font-bold text-cyan-400 mb-3 text-center">CURRENT STANDINGS</h3>
              <div className="space-y-2">
                {combatantsRef.current
                  .filter(c => !c.eliminated)
                  .sort((a, b) => b.lives - a.lives)
                  .map((c, index) => {
                    const isPlayer = c.character.id === selectedCharacterId;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          isPlayer ? 'bg-cyan-900/50 border border-cyan-500' : 'bg-slate-700/50'
                        }`}
                      >
                        <span className="text-white font-bold w-6">#{index + 1}</span>
                        <img src={c.character.avatarUrl} alt={c.character.name} className="w-8 h-8 rounded-full" />
                        <span className={`flex-1 text-sm font-mono ${isPlayer ? 'text-cyan-300 font-bold' : 'text-white'}`}>
                          {c.character.name}
                        </span>
                        <span className={`font-bold ${c.lives >= 7 ? 'text-green-400' : c.lives >= 4 ? 'text-orange-400' : 'text-red-400'}`}>
                          {c.lives}♥
                        </span>
                      </div>
                    );
                  })}
              </div>
              {combatantsRef.current.filter(c => c.eliminated).length > 0 && (
                <>
                  <div className="border-t border-slate-600 my-3"></div>
                  <h4 className="text-sm font-bold text-red-400 mb-2">ELIMINATED</h4>
                  <div className="space-y-1">
                    {combatantsRef.current
                      .filter(c => c.eliminated)
                      .sort((a, b) => (b.eliminationOrder || 0) - (a.eliminationOrder || 0))
                      .map((c) => {
                        const isPlayer = c.character.id === selectedCharacterId;
                        const eliminationPlacement = combatantsRef.current.length - (c.eliminationOrder || 0) + 1;
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-2 p-2 rounded-lg opacity-60 ${
                              isPlayer ? 'bg-cyan-900/30 border border-cyan-700' : 'bg-slate-700/30'
                            }`}
                          >
                            <span className="text-slate-400 font-bold w-6 text-xs">#{eliminationPlacement}</span>
                            <img src={c.character.avatarUrl} alt={c.character.name} className="w-6 h-6 rounded-full grayscale" />
                            <span className={`flex-1 text-xs font-mono ${isPlayer ? 'text-cyan-400' : 'text-slate-400'}`}>
                              {c.character.name}
                            </span>
                            <span className="text-red-500 text-xs">💀</span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}

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
                  <p>• {selectedGameMode.name} • {fighterCount} fighters</p>
                  <p>• Each has {selectedGameMode.lives} lives (♥)</p>
                  <p>• Every collision = -1 life</p>
                  <p>• Speed: +{selectedGameMode.speedIncrement}x every {selectedGameMode.speedInterval / 60}s</p>
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
        </div>

        {/* Back button */}
        <button
          onClick={() => {
            setShowCharacterSelect(true);
            setGameStarted(false);
            setWinner(null);
          }}
          className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm transition-all backdrop-blur-md"
        >
          ← CHANGE FIGHTER
        </button>
      </div>
    </div>
  );
};

export default AIEliminationGame;

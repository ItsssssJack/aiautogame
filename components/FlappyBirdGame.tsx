import React, { useEffect, useRef } from 'react';
import { Character } from '../types';

interface FlappyBirdGameProps {
  selectedCharacter: Character;
  onBack: () => void;
  allCharacters?: Character[];
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

const FlappyBirdGame: React.FC<FlappyBirdGameProps> = ({
  selectedCharacter: initialCharacter,
  onBack,
  allCharacters = [],
}) => {
  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Constants
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const BIRD_SIZE = 40;
  const BIRD_X = 200;
  const GRAVITY = 0.5;
  const FLAP_STRENGTH = -9;
  const PIPE_WIDTH = 80;
  const PIPE_GAP = 200;
  const PIPE_SPEED = 3;
  const PIPE_SPAWN_INTERVAL = 1800;

  // Game state refs (NO React state for game logic)
  const birdRef = useRef({
    y: CANVAS_HEIGHT / 2,
    velocity: 0,
    rotation: 0,
  });
  const pipesRef = useRef<Pipe[]>([]);
  const gameStartedRef = useRef(false);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const lastPipeSpawn = useRef(Date.now());

  // Render game to canvas
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

    // Clear canvas with sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    console.log('Canvas rendering!');
  };

  // Animation loop - runs once, never restarts
  useEffect(() => {
    console.log('Starting animation loop');

    const animate = () => {
      renderGame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      console.log('Cleaning up animation loop');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Empty deps - never re-run

  return (
    <div className="flex flex-row h-screen overflow-hidden bg-slate-900">
      {/* Left Sidebar */}
      <div className="w-[180px] h-full flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col p-4 gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-700 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all font-bold text-sm"
        >
          ← BACK
        </button>
        <div className="flex-1 bg-slate-700/50 border border-white/10 rounded-xl p-3">
          <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider text-center">
            Phase 1: Testing Canvas
          </div>
        </div>
      </div>

      {/* Right Game Area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
};

export default FlappyBirdGame;

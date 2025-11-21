
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Entity, Particle, Decor, ThemeConfig, EntityType, Character } from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  LANE_COUNT, 
  LANE_HEIGHT, 
  PLAYER_SIZE, 
  OBSTACLE_SIZE, 
  COIN_SIZE, 
  POWERUP_SIZE,
  INITIAL_SPEED, 
  MAX_SPEED, 
  SPEED_INCREMENT,
  LANE_TRANSITION_SPEED,
  LEVEL_SCORE_THRESHOLD,
  DAY_NIGHT_CYCLE_FRAMES,
  CHARACTERS
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  theme: ThemeConfig;
  character: Character;
  onGameOver: (score: number, time: number) => void;
  onScoreUpdate: (score: number) => void;
  onLevelUpdate: (level: number) => void;
  onLifetimePointsUpdate: (gameScore: number) => void;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, theme, character, onGameOver, onScoreUpdate, onLevelUpdate, onLifetimePointsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Callbacks Ref
  const callbacksRef = useRef({ onGameOver, onScoreUpdate, onLevelUpdate, onLifetimePointsUpdate });
  useEffect(() => {
    callbacksRef.current = { onGameOver, onScoreUpdate, onLevelUpdate, onLifetimePointsUpdate };
  }, [onGameOver, onScoreUpdate, onLevelUpdate, onLifetimePointsUpdate]);

  // Game State
  const reqRef = useRef<number>();
  const scoreRef = useRef(0);
  const startTimeRef = useRef(0);
  
  const levelRef = useRef(1);
  const speedRef = useRef(INITIAL_SPEED);
  const slowMoTimerRef = useRef(0);
  const shieldActiveRef = useRef(false);
  const pausedRef = useRef(false);

  // Combo System
  const comboCountRef = useRef(0);
  const comboMultiplierRef = useRef(1);
  const comboTimerRef = useRef(0);
  
  // Player Physics - NOW DISCRETE LANES
  const playerLaneRef = useRef(2); // Start in middle (0-4)
  const playerYRef = useRef(2.5 * LANE_HEIGHT); // Visual Y position
  const playerXRef = useRef(150); // Fixed X position (can move left/right)
  const playerOffsetXRef = useRef(0); // Horizontal offset within lane

  // Jump Physics
  const isJumpingRef = useRef(false);
  const jumpVelocityRef = useRef(0);
  const jumpOffsetYRef = useRef(0);

  const bgOffsetRef = useRef(0);
  
  const entitiesRef = useRef<Entity[]>([]);
  const decorRef = useRef<Decor[]>([]); 
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const framesRef = useRef(0);

  // Rivals State
  const rivalsRef = useRef<Character[]>([]);
  const introducedRivalsRef = useRef<Set<string>>(new Set());

  // Texture Caches
  const roadPatternRef = useRef<CanvasPattern | null>(null);
  const avatarImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // --- Initialization ---
  useEffect(() => {
    // Filter out the player's character to get the list of rivals
    rivalsRef.current = CHARACTERS.filter(c => c.id !== character.id);
    introducedRivalsRef.current.clear();
  }, [character]);

  // --- Texture Generation ---
  const generateTextures = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 128;
    noiseCanvas.height = 128;
    const nCtx = noiseCanvas.getContext('2d')!;
    
    if (theme.roadType === 'asphalt') {
      nCtx.fillStyle = theme.colors.road;
      nCtx.fillRect(0, 0, 128, 128);
      for(let i=0; i<500; i++) {
        nCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        nCtx.fillRect(Math.random()*128, Math.random()*128, 4, 1);
        nCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        nCtx.fillRect(Math.random()*128, Math.random()*128, 4, 1);
      }
    } else if (theme.roadType === 'dirt') {
      nCtx.fillStyle = theme.colors.road;
      nCtx.fillRect(0, 0, 128, 128);
      for(let i=0; i<800; i++) {
        nCtx.fillStyle = `rgba(100,50,0,${Math.random() * 0.1})`;
        nCtx.beginPath();
        nCtx.arc(Math.random()*128, Math.random()*128, Math.random()*2, 0, Math.PI*2);
        nCtx.fill();
      }
    }
    
    if (theme.roadType !== 'grid') {
      roadPatternRef.current = ctx.createPattern(noiseCanvas, 'repeat');
    } else {
      roadPatternRef.current = null;
    }

  }, [theme]);

  useEffect(() => {
    generateTextures();
  }, [theme, generateTextures]);


  // --- Drawing Helpers ---

  const getSkyGradient = (ctx: CanvasRenderingContext2D, timeOfDay: number) => {
    // timeOfDay: 0=Day, 0.25=Sunset, 0.5=Night, 0.75=Sunrise
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    
    // Simple interpolation helper
    const lerpColor = (c1: string, c2: string, t: number) => {
      // Simplified: returning stops based on thresholds for better gradient control without heavy hex math
      return t < 0.5 ? c1 : c2; 
    };

    if (!theme.dayNightEnabled) {
        grad.addColorStop(0, theme.colors.backgroundTop);
        grad.addColorStop(1, theme.colors.backgroundBottom);
        return grad;
    }

    // Dynamic Colors
    let top, bottom;
    
    if (timeOfDay < 0.2) { // Day
      top = "#87CEEB"; bottom = "#E0F7FA";
    } else if (timeOfDay < 0.3) { // Sunset
      top = "#1e3a8a"; bottom = "#f97316";
    } else if (timeOfDay < 0.7) { // Night
      top = "#020617"; bottom = "#1e293b";
    } else if (timeOfDay < 0.8) { // Sunrise
      top = "#4c1d95"; bottom = "#facc15";
    } else { // Day Loop
      top = "#87CEEB"; bottom = "#E0F7FA";
    }

    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    return grad;
  };

  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, accent: string, tilt: number, isPlayer: boolean, isNight: boolean, avatarUrl?: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt * Math.PI / 180);

    // Shield Visual
    if (isPlayer && shieldActiveRef.current) {
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 + Math.sin(framesRef.current * 0.1) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_SIZE * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(6, 182, 212, 0.15)`;
      ctx.fill();
      ctx.restore();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 12, PLAYER_SIZE/2 + 2, 8, 0, 0, Math.PI*2);
    ctx.fill();

    if (theme.id === 'vaporwave') {
      // Retro Sports Car
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-22, -15); 
      ctx.lineTo(10, -15); 
      ctx.lineTo(22, 0);   
      ctx.lineTo(10, 15);  
      ctx.lineTo(-22, 15); 
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillStyle = accent;
      ctx.fillRect(-18, -10, 10, 20);
    } else {
      // Realistic Car Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-22, -14, 44, 28, 4);
      ctx.fill();

      // Cabin
      const grad = ctx.createLinearGradient(-10, 0, 10, 0);
      grad.addColorStop(0, '#111');
      grad.addColorStop(0.5, '#444');
      grad.addColorStop(1, '#111');
      ctx.fillStyle = grad;
      
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(10, -10);
      ctx.lineTo(10, 10);
      ctx.lineTo(-8, 12);
      ctx.closePath();
      ctx.fill();

      // Headlights
      if (isPlayer && isNight) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(20, -10, 3, 0, Math.PI*2);
        ctx.arc(20, 10, 3, 0, Math.PI*2);
        ctx.fill();

        ctx.globalCompositeOperation = 'screen';
        const beamGrad = ctx.createLinearGradient(20, 0, 500, 0);
        beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(20, -10);
        ctx.lineTo(500, -120);
        ctx.lineTo(500, 120);
        ctx.lineTo(20, 10);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (isPlayer) {
         // Day running lights (dim)
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(20, -10, 2, 0, Math.PI*2);
        ctx.arc(20, 10, 2, 0, Math.PI*2);
        ctx.fill();
      } else {
        // Opponent taillights
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-22, -12, 2, 6);
        ctx.fillRect(-22, 6, 2, 6);
      }

      // Player Taillights
      if (isPlayer) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-22, -12, 4, 6);
        ctx.fillRect(-22, 6, 4, 6);
      }
    }

    // Avatar Display (small circular image on top of car)
    if (avatarUrl) {
      let img = avatarImagesRef.current.get(avatarUrl);
      if (!img) {
        // Load image and cache it
        img = new Image();
        img.src = avatarUrl;
        avatarImagesRef.current.set(avatarUrl, img);
      }

      // Only draw if image is loaded
      if (img.complete && img.naturalHeight !== 0) {
        ctx.save();
        ctx.shadowBlur = 0;

        // Draw circular avatar
        const avatarSize = 48;
        const avatarX = 0;
        const avatarY = 0;

        // Counter-rotate to keep avatar upright (undo the car's rotation)
        ctx.rotate(-tilt * Math.PI / 180);

        // Clip to circle
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw image
        ctx.drawImage(img, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);

        ctx.restore();

        // Draw border around avatar
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  };

  const drawPowerUp = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
    ctx.save();
    ctx.translate(x, y + Math.sin(framesRef.current * 0.1) * 5);
    
    if (type === 'powerup_shield') {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', 0, 1);
    } else if (type === 'powerup_slow') {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#a855f7';
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, 8);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -2);
      ctx.stroke();
    } else if (type === 'powerup_blast') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Shockwave lines
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      const scale = (Math.sin(framesRef.current * 0.2) + 1) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + scale * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawDecorElement = (ctx: CanvasRenderingContext2D, d: Decor, isNight: boolean) => {
    ctx.save();
    ctx.translate(d.x, d.y);
    
    if (d.type === 'tree') {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 5;
      // Darker trees at night
      ctx.fillStyle = isNight ? '#0f172a' : '#1e293b';
      ctx.beginPath(); 
      ctx.arc(2, 2, 4, 0, Math.PI*2);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.fillStyle = isNight ? '#064e3b' : '#15803d'; 
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = isNight ? '#166534' : '#22c55e'; 
      ctx.beginPath();
      ctx.arc(-3, -3, 6, 0, Math.PI*2);
      ctx.fill();
    } else if (d.type === 'light') {
      ctx.fillStyle = '#64748b'; 
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, -8, 4, 16);
      
      if (isNight) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(254, 243, 199, 0.6)';
        ctx.fillStyle = '#fef3c7';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#cbd5e1';
      }
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI*2);
      ctx.fill();
    } else if (d.type === 'column') {
      ctx.fillStyle = theme.colors.laneBorder;
      ctx.fillRect(-4, -10, 8, 20);
      ctx.strokeStyle = theme.colors.roadMarking;
      ctx.strokeRect(-4, -10, 8, 20);
    }
    ctx.restore();
  };

  // --- EVENT DRIVEN INPUT FOR LANE HOPPING ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;

      const key = e.key.toLowerCase();

      // Pause/Resume
      if (key === 'escape' || key === 'p') {
        pausedRef.current = !pausedRef.current;
        return;
      }

      // Don't allow movement when paused
      if (pausedRef.current) return;

      // Lane switching
      if (key === 'arrowup' || key === 'w') {
        playerLaneRef.current = Math.max(0, playerLaneRef.current - 1);
      }
      if (key === 'arrowdown' || key === 's') {
        playerLaneRef.current = Math.min(LANE_COUNT - 1, playerLaneRef.current + 1);
      }

      // Horizontal movement within lane
      if (key === 'arrowleft' || key === 'a') {
        playerOffsetXRef.current = Math.max(-60, playerOffsetXRef.current - 15);
      }
      if (key === 'arrowright' || key === 'd') {
        playerOffsetXRef.current = Math.min(60, playerOffsetXRef.current + 15);
      }

      // Jump
      if (key === ' ' && !isJumpingRef.current) {
        e.preventDefault(); // Prevent page scroll
        isJumpingRef.current = true;
        jumpVelocityRef.current = -15; // Initial upward velocity (increased for higher jump)
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState]);

  const handleTouch = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING || pausedRef.current) return;
    const touchY = e.touches[0].clientY;
    const height = window.innerHeight;
    
    if (touchY < height * 0.5) {
      playerLaneRef.current = Math.max(0, playerLaneRef.current - 1);
    } else {
      playerLaneRef.current = Math.min(LANE_COUNT - 1, playerLaneRef.current + 1);
    }
  };
  
  const showFloatingText = (text: string, color: string = '#fff') => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x: playerXRef.current,
      y: playerYRef.current - 40,
      text,
      life: 1.5,
      color
    });
  };

  // Spawn Logic
  const spawnEntity = () => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const laneY = lane * LANE_HEIGHT + (LANE_HEIGHT / 2);
    
    let type: EntityType = 'obstacle';
    const rand = Math.random();
    
    // Adjusted Rarity
    if (rand > 0.99) type = 'powerup_blast'; // 1%
    else if (rand > 0.98) type = 'powerup_shield'; // 1%
    else if (rand > 0.97) type = 'powerup_slow'; // 1%
    else if (rand > 0.94) type = 'coin'; // 6%
    
    let size = OBSTACLE_SIZE;
    let color = theme.colors.obstacle;
    let accentColor = theme.colors.obstacleAccent;
    let isRival = false;
    let name = undefined;
    let avatarUrl = undefined;

    if (type === 'coin') {
      size = COIN_SIZE;
      color = theme.colors.coin;
    }
    if (type.startsWith('powerup')) size = POWERUP_SIZE;
    
    // Rival Spawning Logic
    if (type === 'obstacle') {
      // Logic: Unlock 1 rival every 2 levels (2, 4, 6, 8)
      // Available rivals index = Floor(Level / 2) - 1
      const unlockedCount = Math.floor(levelRef.current / 2);

      if (unlockedCount > 0 && Math.random() > 0.7) { // 30% chance for obstacle to be a Rival if unlocked
        const maxIndex = Math.min(unlockedCount - 1, rivalsRef.current.length - 1);
        const rivalIndex = Math.floor(Math.random() * (maxIndex + 1));
        const rival = rivalsRef.current[rivalIndex];

        if (rival) {
          isRival = true;
          color = rival.color;
          accentColor = rival.accentColor;
          name = rival.name;
          avatarUrl = rival.avatarUrl;

          // New Rival Discovery Alert
          if (!introducedRivalsRef.current.has(rival.id)) {
            introducedRivalsRef.current.add(rival.id);
            showFloatingText(`CHALLENGER: ${rival.name}`, rival.color);
          }
        }
      } else {
        // Non-rival obstacles: Assign random avatar from ALL characters
        const randomChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        avatarUrl = randomChar.avatarUrl;
      }
    }

    const entity: Entity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      lane,
      x: CANVAS_WIDTH + 100,
      y: laneY,
      width: size,
      height: size,
      color,
      accentColor,
      isRival,
      name,
      avatarUrl
    };
    
    // Check collision with existing entities in same lane at spawn (basic overlap)
    const tooClose = entitiesRef.current.some(e => e.lane === lane && Math.abs(e.x - entity.x) < 300);
    if (!tooClose) {
      entitiesRef.current.push(entity);
    }
  };

  const spawnDecor = () => {
    const side = Math.random() > 0.5 ? 'top' : 'bottom';
    const y = side === 'top' ? -40 : CANVAS_HEIGHT + 40;
    
    let type: Decor['type'] = 'tree';
    if (theme.scenery === 'city') type = 'light';
    if (theme.scenery === 'palm') type = 'column';

    decorRef.current.push({
      id: Math.random().toString(),
      x: CANVAS_WIDTH + 50,
      y: y,
      type,
      scale: 1
    });
  };

  const createExplosion = (x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0.8,
        color,
        size: Math.random() * 3 + 1
      });
    }
  };

  // Main Loop
  const gameLoop = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    framesRef.current++;

    // --- Cycle Logic ---
    const cyclePos = (framesRef.current % DAY_NIGHT_CYCLE_FRAMES) / DAY_NIGHT_CYCLE_FRAMES;
    // isNight logic: if cycle is between 0.3 (sunset) and 0.7 (sunriseish)
    const isNight = theme.dayNightEnabled ? (cyclePos > 0.3 && cyclePos < 0.8) : false;

    // --- PAUSE LOGIC: Skip game updates when paused ---
    let effectiveSpeed = speedRef.current;
    let effectiveTilt = 0;

    if (!pausedRef.current) {
      // --- Level & Score Logic ---
      if (slowMoTimerRef.current > 0) {
        slowMoTimerRef.current--;
        effectiveSpeed = speedRef.current * 0.5;
      }

      // SLOWER CLIMB: Score based on distance/survival
      if (framesRef.current % 20 === 0) {
        scoreRef.current += 10;
        callbacksRef.current.onScoreUpdate(scoreRef.current);

        // Level Up Check
        const requiredScore = levelRef.current * LEVEL_SCORE_THRESHOLD;
        if (scoreRef.current >= requiredScore) {
          levelRef.current++;
          speedRef.current = Math.min(MAX_SPEED, speedRef.current + SPEED_INCREMENT);
          callbacksRef.current.onLevelUpdate(levelRef.current);
          showFloatingText(`LEVEL ${levelRef.current}`, '#facc15');
        }
      }

      // --- Player Movement (Lerp to Lane Center) ---
      const targetY = (playerLaneRef.current * LANE_HEIGHT) + (LANE_HEIGHT / 2);
      // Simple Lerp for quick snapping
      const diff = targetY - playerYRef.current;
      playerYRef.current += diff * LANE_TRANSITION_SPEED;

      // Tilt based on movement direction
      if (Math.abs(diff) > 2) {
        effectiveTilt = diff > 0 ? 5 : -5;
      }

      // --- Jump Physics ---
      if (isJumpingRef.current) {
        jumpVelocityRef.current += 0.6; // Gravity
        jumpOffsetYRef.current += jumpVelocityRef.current;

        // Land when back at ground level
        if (jumpOffsetYRef.current >= 0) {
          jumpOffsetYRef.current = 0;
          jumpVelocityRef.current = 0;
          isJumpingRef.current = false;
        }
      }

      // Horizontal offset decay (slide back to center)
      if (playerOffsetXRef.current > 0) {
        playerOffsetXRef.current = Math.max(0, playerOffsetXRef.current - 2);
      } else if (playerOffsetXRef.current < 0) {
        playerOffsetXRef.current = Math.min(0, playerOffsetXRef.current + 2);
      }

      // --- Spawning ---
      const spawnRate = Math.max(50, Math.floor(1800 / (effectiveSpeed * 10 + 10)));
      if (framesRef.current % spawnRate === 0) spawnEntity();
      if (framesRef.current % 30 === 0) spawnDecor();

      // --- Update Entities ---
      entitiesRef.current.forEach(e => e.x -= effectiveSpeed);
      decorRef.current.forEach(d => d.x -= effectiveSpeed);
      entitiesRef.current = entitiesRef.current.filter(e => e.x > -100);
      decorRef.current = decorRef.current.filter(d => d.x > -100);

      // --- Combo Timer Decay ---
      if (comboTimerRef.current > 0) {
        comboTimerRef.current--;
      } else if (comboCountRef.current > 0) {
        // Reset combo if timer expires
        comboCountRef.current = 0;
        comboMultiplierRef.current = 1;
      }

      // --- Collision ---
      const pRect = {
        x: (playerXRef.current + playerOffsetXRef.current) - PLAYER_SIZE / 2 + 8,
        y: (playerYRef.current + jumpOffsetYRef.current) - 12,
        w: PLAYER_SIZE - 16,
        h: 24
      };

      // Check if player is jumping high enough to clear obstacles
      const jumpClearanceHeight = 50; // How high player needs to jump to clear obstacle
      const isJumpingOverObstacles = jumpOffsetYRef.current < -jumpClearanceHeight;

      for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
        const ent = entitiesRef.current[i];
        const entRect = { x: ent.x - ent.width/2, y: ent.y - ent.height/2, w: ent.width, h: ent.height };

        if (
          pRect.x < entRect.x + entRect.w &&
          pRect.x + pRect.w > entRect.x &&
          pRect.y < entRect.y + entRect.h &&
          pRect.y + pRect.h > entRect.y
        ) {
          // Skip obstacle collision if jumping high enough
          if (ent.type === 'obstacle' && isJumpingOverObstacles) {
            continue;
          }

          if (ent.type === 'obstacle') {
            if (shieldActiveRef.current) {
              shieldActiveRef.current = false;
              createExplosion(ent.x, ent.y, '#06b6d4', 20);
              entitiesRef.current.splice(i, 1);
              showFloatingText("SHIELD BROKEN!", "#06b6d4");
              // Reset combo on collision (even with shield)
              comboCountRef.current = 0;
              comboMultiplierRef.current = 1;
              comboTimerRef.current = 0;
            } else {
              createExplosion(playerXRef.current, playerYRef.current, character.color);
              createExplosion(ent.x, ent.y, ent.color);
              const sessionTime = (Date.now() - startTimeRef.current) / 1000;
              callbacksRef.current.onLifetimePointsUpdate(scoreRef.current);
              callbacksRef.current.onGameOver(scoreRef.current, sessionTime);
              return;
            }
          } else if (ent.type === 'coin') {
            // Combo System
            comboCountRef.current++;
            comboTimerRef.current = 180; // 3 seconds at 60fps

            // Update multiplier based on combo count
            if (comboCountRef.current >= 20) {
              comboMultiplierRef.current = 5;
            } else if (comboCountRef.current >= 10) {
              comboMultiplierRef.current = 3;
            } else if (comboCountRef.current >= 5) {
              comboMultiplierRef.current = 2;
            } else {
              comboMultiplierRef.current = 1;
            }

            const coinValue = 50 * comboMultiplierRef.current;
            scoreRef.current += coinValue;
            callbacksRef.current.onScoreUpdate(scoreRef.current);
            createExplosion(ent.x, ent.y, theme.colors.coin, 8);
            entitiesRef.current.splice(i, 1);

            if (comboMultiplierRef.current > 1) {
              showFloatingText(`+${coinValue} (x${comboMultiplierRef.current})`, theme.colors.coin);
            }
          } else if (ent.type === 'powerup_shield') {
            shieldActiveRef.current = true;
            scoreRef.current += 25;
            createExplosion(ent.x, ent.y, '#06b6d4', 10);
            entitiesRef.current.splice(i, 1);
            showFloatingText("SHIELD ACTIVE", "#06b6d4");
          } else if (ent.type === 'powerup_slow') {
            slowMoTimerRef.current = 300;
            scoreRef.current += 25;
            createExplosion(ent.x, ent.y, '#a855f7', 10);
            entitiesRef.current.splice(i, 1);
            showFloatingText("TIME SLOW", "#a855f7");
          } else if (ent.type === 'powerup_blast') {
            scoreRef.current += 100;
            entitiesRef.current = entitiesRef.current.filter(e => {
              if (e.type === 'obstacle') {
                createExplosion(e.x, e.y, e.color);
                return false;
              }
              return e !== ent;
            });
            createExplosion(ent.x, ent.y, '#ef4444', 30);
            showFloatingText("SONIC BLAST!", "#ef4444");
          }
        }
      }

      // Particles & Text
      particlesRef.current.forEach(p => {
        p.x += p.vx - effectiveSpeed * 0.5;
        p.y += p.vy;
        p.life -= 0.05;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      floatingTextsRef.current.forEach(t => {
        t.y -= 1;
        t.life -= 0.02;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);
  } // End of pause check - always render below

    // --- RENDER ---
    ctx.fillStyle = getSkyGradient(ctx, cyclePos);
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ground Background (Parallax layer behind road)
    bgOffsetRef.current = (bgOffsetRef.current - effectiveSpeed) % 128; 
    if (theme.id === 'outback') {
      ctx.fillStyle = isNight ? '#14532d' : '#3f6212'; 
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.save();
    if (roadPatternRef.current) {
      ctx.fillStyle = roadPatternRef.current;
      ctx.translate(bgOffsetRef.current, 0); 
      ctx.fillRect(-bgOffsetRef.current, 0, CANVAS_WIDTH + 128, CANVAS_HEIGHT);
      // Darken road at night
      if (isNight) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-bgOffsetRef.current, 0, CANVAS_WIDTH + 128, CANVAS_HEIGHT);
      }
    } else {
      ctx.fillStyle = theme.colors.road;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = theme.colors.laneBorder;
      ctx.lineWidth = 2;
      for (let x = bgOffsetRef.current; x < CANVAS_WIDTH; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Lines
    ctx.strokeStyle = theme.colors.laneBorder;
    ctx.lineWidth = 2;
    ctx.setLineDash([]); 
    for (let i = 0; i <= LANE_COUNT; i++) {
      const y = i * LANE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.strokeStyle = theme.colors.roadMarking;
    ctx.lineWidth = 2;
    ctx.setLineDash([30, 40]);
    ctx.lineDashOffset = -bgOffsetRef.current; 
    for (let i = 1; i < LANE_COUNT; i++) {
      const y = i * LANE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    decorRef.current.forEach(d => drawDecorElement(ctx, d, isNight));

    entitiesRef.current.forEach(ent => {
      if (ent.type === 'coin') {
        const floatY = Math.sin(framesRef.current * 0.1) * 5;
        ctx.save();
        ctx.translate(ent.x, ent.y + floatY);
        ctx.shadowBlur = 8;
        ctx.shadowColor = theme.colors.coin;
        ctx.fillStyle = theme.colors.coin;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-12, 0);
        ctx.fill();
        ctx.restore();
      } else if (ent.type.startsWith('powerup')) {
        drawPowerUp(ctx, ent.x, ent.y, ent.type);
      } else {
        // OBSTACLE RENDERING
        if (ent.isRival) {
          drawCar(ctx, ent.x, ent.y, ent.color, ent.accentColor || '#fff', 180, false, isNight, ent.avatarUrl);
        } else {
          if (theme.roadType === 'dirt') {
            const size = ent.width;
            ctx.save();
            ctx.translate(ent.x, ent.y);
            ctx.fillStyle = theme.colors.obstacle;
            ctx.beginPath();
            ctx.moveTo(-size/3, -size/2);
            ctx.lineTo(size/2, -size/3);
            ctx.lineTo(size/3, size/2);
            ctx.lineTo(-size/2, size/4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            drawCar(ctx, ent.x, ent.y, theme.colors.obstacle, theme.colors.obstacleAccent, 180, false, isNight, ent.avatarUrl);
          }
        }
      }
    });

    // Player (Use Character Color with jump and horizontal offset)
    drawCar(
      ctx,
      playerXRef.current + playerOffsetXRef.current,
      playerYRef.current + jumpOffsetYRef.current,
      character.color,
      character.accentColor,
      effectiveTilt,
      true,
      isNight,
      character.avatarUrl
    );

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Floating Text
    floatingTextsRef.current.forEach(t => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.fillStyle = t.color;
      ctx.font = "bold 20px 'Orbitron', sans-serif";
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    if (slowMoTimerRef.current > 0) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('SLOW MOTION', CANVAS_WIDTH / 2 - 60, 40);
    }

    if (shieldActiveRef.current) {
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🛡 SHIELD ACTIVE', 20, 40);
    }

    // Control hints
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ Lanes  •  ←→ Dodge  •  SPACE Jump  •  ESC Pause', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 15);

    // Combo UI
    if (comboCountRef.current > 0) {
      const comboX = CANVAS_WIDTH - 150;
      const comboY = 40;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(comboX - 10, comboY - 25, 140, 70);

      ctx.fillStyle = theme.colors.coin;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'right';
      ctx.shadowBlur = 5;
      ctx.shadowColor = theme.colors.coin;
      ctx.fillText(`x${comboMultiplierRef.current}`, comboX + 120, comboY);

      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText(`${comboCountRef.current} Coin Combo`, comboX + 120, comboY + 20);

      // Combo timer bar
      const timerWidth = 120;
      const timerHeight = 4;
      const timerPercent = comboTimerRef.current / 180;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(comboX, comboY + 28, timerWidth, timerHeight);
      ctx.fillStyle = theme.colors.coin;
      ctx.fillRect(comboX, comboY + 28, timerWidth * timerPercent, timerHeight);

      ctx.textAlign = 'left';
      ctx.restore();
    }

    // Pause Overlay
    if (pausedRef.current) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 60px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#000';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

      ctx.font = '20px sans-serif';
      ctx.fillText('Press ESC or P to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }

    reqRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, theme, character]); 

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      // RESET GAME STATE
      scoreRef.current = 0;
      startTimeRef.current = Date.now();
      
      levelRef.current = 1;
      speedRef.current = INITIAL_SPEED;
      
      entitiesRef.current = [];
      decorRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      
      // Filter rivals again on start
      rivalsRef.current = CHARACTERS.filter(c => c.id !== character.id);
      introducedRivalsRef.current.clear();

      playerLaneRef.current = 2;
      playerYRef.current = 2.5 * LANE_HEIGHT;
      playerXRef.current = 150;
      playerOffsetXRef.current = 0;

      isJumpingRef.current = false;
      jumpVelocityRef.current = 0;
      jumpOffsetYRef.current = 0;

      framesRef.current = 0;
      slowMoTimerRef.current = 0;
      shieldActiveRef.current = false;
      pausedRef.current = false;
      comboCountRef.current = 0;
      comboMultiplierRef.current = 1;
      comboTimerRef.current = 0;
      callbacksRef.current.onLevelUpdate(1);
      
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      reqRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [gameState, gameLoop, character]); 

  return (
    <div className="w-full h-full flex justify-center items-center relative overflow-hidden outline-none" onTouchStart={handleTouch}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full max-h-full object-contain shadow-2xl"
      />
    </div>
  );
};

export default GameCanvas;

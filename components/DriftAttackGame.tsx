import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Track, TRACKS, Checkpoint, Hazard } from '../lib/tracks';
import { Character } from '../constants';

interface DriftAttackGameProps {
  selectedTrack: Track;
  selectedCharacter: Character;
  onBack: () => void;
  playerHighScore: number;
}

interface GhostFrame {
  x: number;
  y: number;
  angle: number;
  timestamp: number;
}

interface LapTime {
  lap: number;
  time: number;
  isPerfect: boolean; // All checkpoints hit perfectly
}

const DriftAttackGame: React.FC<DriftAttackGameProps> = ({
  selectedTrack,
  selectedCharacter,
  onBack,
  playerHighScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);

  // Player state
  const playerRef = useRef({
    x: 150,
    y: 500,
    velocityX: 0,
    velocityY: 0,
    angle: 0,
    speed: 0,
    isDrifting: false,
    driftAngle: 0,
    boostMeter: 0, // 0-100
  });

  // Drift mechanics
  const [driftMeter, setDriftMeter] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const driftStartTime = useRef<number>(0);

  // Timing state
  const [currentLap, setCurrentLap] = useState(1);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [raceStartTime, setRaceStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [checkpointsPassed, setCheckpointsPassed] = useState<Set<number>>(new Set());
  const [perfectCheckpoints, setPerfectCheckpoints] = useState<Set<number>>(new Set());

  // Ghost state
  const [recordingGhost, setRecordingGhost] = useState<GhostFrame[]>([]);
  const [personalBestGhost, setPersonalBestGhost] = useState<GhostFrame[]>([]);
  const [globalBestGhost, setGlobalBestGhost] = useState<GhostFrame[]>([]);
  const ghostRecordingRef = useRef<GhostFrame[]>([]);

  // Input state
  const keysPressed = useRef<Set<string>>(new Set());

  // Constants
  const CAR_WIDTH = 40;
  const CAR_HEIGHT = 60;
  const ACCELERATION = 0.5;
  const MAX_SPEED = 12;
  const DRIFT_SPEED_MULTIPLIER = 0.85;
  const BOOST_SPEED_MULTIPLIER = 1.5;
  const TURN_SPEED = 0.08;
  const DRIFT_TURN_SPEED = 0.12;
  const FRICTION = 0.96;
  const DRIFT_METER_RATE = 2;
  const BOOST_DRAIN_RATE = 3;

  // Initialize game
  useEffect(() => {
    if (!gameStarted) {
      // Reset player position to track start
      playerRef.current = {
        x: 150,
        y: 500,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
        speed: 0,
        isDrifting: false,
        driftAngle: 0,
        boostMeter: 0,
      };

      // Load personal best ghost from localStorage
      const savedGhost = localStorage.getItem(`ghost-${selectedTrack.id}`);
      if (savedGhost) {
        setPersonalBestGhost(JSON.parse(savedGhost));
      }

      // TODO: Load global best ghost from Supabase

      // Start countdown
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) {
          clearInterval(countdownInterval);
          setGameStarted(true);
          setRaceStartTime(Date.now());
        }
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [selectedTrack.id]);

  // Keyboard input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      // Pause toggle
      if (e.key === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  const updateGame = useCallback(() => {
    if (!gameStarted || isPaused || raceFinished) return;

    const player = playerRef.current;
    const keys = keysPressed.current;

    // Update current time
    const now = Date.now();
    const elapsed = (now - raceStartTime) / 1000;
    setCurrentTime(elapsed);

    // Input handling
    const isAccelerating = keys.has('arrowup') || keys.has('w');
    const isBraking = keys.has('arrowdown') || keys.has('s');
    const isTurningLeft = keys.has('arrowleft') || keys.has('a');
    const isTurningRight = keys.has('arrowright') || keys.has('d');
    const isDriftPressed = keys.has(' ');

    // Drift mechanics
    if (isDriftPressed && player.speed > 3) {
      if (!player.isDrifting) {
        player.isDrifting = true;
        driftStartTime.current = now;
      }

      // Build drift meter while drifting
      if (player.boostMeter < 100) {
        player.boostMeter = Math.min(100, player.boostMeter + DRIFT_METER_RATE);
        setDriftMeter(player.boostMeter);
      }
    } else {
      if (player.isDrifting) {
        // Release drift - activate boost if meter is high enough
        if (player.boostMeter > 30) {
          setIsBoosting(true);
          setTimeout(() => setIsBoosting(false), 1500);
        }
        player.isDrifting = false;
      }
    }

    // Boost drain
    if (isBoosting && player.boostMeter > 0) {
      player.boostMeter = Math.max(0, player.boostMeter - BOOST_DRAIN_RATE);
      setDriftMeter(player.boostMeter);
    } else if (!player.isDrifting && player.boostMeter > 0) {
      // Slow decay when not drifting or boosting
      player.boostMeter = Math.max(0, player.boostMeter - 0.5);
      setDriftMeter(player.boostMeter);
    }

    // Acceleration/Braking
    if (isAccelerating) {
      player.speed = Math.min(MAX_SPEED, player.speed + ACCELERATION);
    } else if (isBraking) {
      player.speed = Math.max(0, player.speed - ACCELERATION * 1.5);
    } else {
      player.speed *= FRICTION;
    }

    // Apply speed multipliers
    let effectiveSpeed = player.speed;
    if (player.isDrifting) {
      effectiveSpeed *= DRIFT_SPEED_MULTIPLIER;
    }
    if (isBoosting) {
      effectiveSpeed *= BOOST_SPEED_MULTIPLIER;
    }

    // Turning
    const turnSpeed = player.isDrifting ? DRIFT_TURN_SPEED : TURN_SPEED;
    if (isTurningLeft) {
      player.angle -= turnSpeed * (player.speed / MAX_SPEED);
    }
    if (isTurningRight) {
      player.angle += turnSpeed * (player.speed / MAX_SPEED);
    }

    // Apply drift angle offset for visual effect
    if (player.isDrifting) {
      if (isTurningLeft) {
        player.driftAngle = -0.3;
      } else if (isTurningRight) {
        player.driftAngle = 0.3;
      }
    } else {
      player.driftAngle *= 0.9; // Smooth return to center
    }

    // Update position
    player.velocityX = Math.cos(player.angle) * effectiveSpeed;
    player.velocityY = Math.sin(player.angle) * effectiveSpeed;
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Track boundaries (simple wrap for now)
    if (player.x < 0) player.x = selectedTrack.width;
    if (player.x > selectedTrack.width) player.x = 0;
    if (player.y < 0) player.y = selectedTrack.height;
    if (player.y > selectedTrack.height) player.y = 0;

    // Record ghost frame
    ghostRecordingRef.current.push({
      x: player.x,
      y: player.y,
      angle: player.angle,
      timestamp: elapsed,
    });

    // Check checkpoint collisions
    checkCheckpointCollisions();

    // Check hazard collisions
    checkHazardCollisions();
  }, [gameStarted, isPaused, raceFinished, raceStartTime, selectedTrack]);

  // Checkpoint collision detection
  const checkCheckpointCollisions = useCallback(() => {
    const player = playerRef.current;

    selectedTrack.checkpoints.forEach((checkpoint, index) => {
      const dx = player.x - checkpoint.x;
      const dy = player.y - checkpoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < checkpoint.width / 2) {
        if (!checkpointsPassed.has(index)) {
          const newCheckpoints = new Set(checkpointsPassed);
          newCheckpoints.add(index);
          setCheckpointsPassed(newCheckpoints);

          // Check if it's a perfect hit
          if (distance < checkpoint.perfectWindow / 2) {
            const newPerfectCheckpoints = new Set(perfectCheckpoints);
            newPerfectCheckpoints.add(index);
            setPerfectCheckpoints(newPerfectCheckpoints);
          }

          // Check if lap completed (all checkpoints passed)
          if (newCheckpoints.size === selectedTrack.checkpoints.length) {
            completeLap();
          }
        }
      }
    });
  }, [checkpointsPassed, perfectCheckpoints, selectedTrack.checkpoints]);

  // Hazard collision detection
  const checkHazardCollisions = useCallback(() => {
    const player = playerRef.current;

    selectedTrack.hazards.forEach((hazard) => {
      const isColliding =
        player.x > hazard.x &&
        player.x < hazard.x + hazard.width &&
        player.y > hazard.y &&
        player.y < hazard.y + hazard.height;

      if (isColliding) {
        // Slow down significantly
        player.speed *= 0.5;
        player.boostMeter = Math.max(0, player.boostMeter - 20);
        setDriftMeter(player.boostMeter);
      }
    });
  }, [selectedTrack.hazards]);

  // Complete a lap
  const completeLap = useCallback(() => {
    const lapTime = (Date.now() - raceStartTime) / 1000;
    const isPerfect = perfectCheckpoints.size === selectedTrack.checkpoints.length;

    const newLapTime: LapTime = {
      lap: currentLap,
      time: lapTime,
      isPerfect,
    };

    setLapTimes(prev => [...prev, newLapTime]);
    setCheckpointsPassed(new Set());
    setPerfectCheckpoints(new Set());

    if (currentLap >= selectedTrack.laps) {
      // Race finished
      finishRace(lapTime);
    } else {
      // Next lap
      setCurrentLap(prev => prev + 1);
    }
  }, [currentLap, raceStartTime, perfectCheckpoints, selectedTrack]);

  // Finish race
  const finishRace = useCallback((finalTime: number) => {
    setRaceFinished(true);

    // Save ghost if it's a personal best
    const savedBestTime = localStorage.getItem(`best-time-${selectedTrack.id}`);
    if (!savedBestTime || finalTime < parseFloat(savedBestTime)) {
      localStorage.setItem(`best-time-${selectedTrack.id}`, finalTime.toString());
      localStorage.setItem(`ghost-${selectedTrack.id}`, JSON.stringify(ghostRecordingRef.current));
    }

    // TODO: Submit to Supabase leaderboard
  }, [selectedTrack.id]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      updateGame();
      renderGame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (gameStarted) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, updateGame]);

  // Render game
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = selectedTrack.colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track
    ctx.fillStyle = selectedTrack.colors.track;
    ctx.fillRect(50, 50, selectedTrack.width - 100, selectedTrack.height - 100);

    // Draw racing line
    ctx.strokeStyle = selectedTrack.colors.accent + '40';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    selectedTrack.racingLine.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw checkpoints
    selectedTrack.checkpoints.forEach((checkpoint, index) => {
      const isPassed = checkpointsPassed.has(index);
      const isPerfect = perfectCheckpoints.has(index);

      ctx.fillStyle = isPassed
        ? isPerfect
          ? '#10b981'
          : '#3b82f6'
        : selectedTrack.colors.primary + '40';
      ctx.beginPath();
      ctx.arc(checkpoint.x, checkpoint.y, checkpoint.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Perfect window
      if (!isPassed) {
        ctx.fillStyle = selectedTrack.colors.accent + '80';
        ctx.beginPath();
        ctx.arc(checkpoint.x, checkpoint.y, checkpoint.perfectWindow / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw hazards
    selectedTrack.hazards.forEach((hazard) => {
      ctx.fillStyle = hazard.type === 'oil' ? '#fbbf24' : '#ef4444';
      ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
    });

    // Draw ghosts
    const currentGhostTime = (Date.now() - raceStartTime) / 1000;

    // Personal best ghost
    if (personalBestGhost.length > 0) {
      const ghostFrame = personalBestGhost.find(
        (frame, i) =>
          frame.timestamp <= currentGhostTime &&
          (i === personalBestGhost.length - 1 || personalBestGhost[i + 1].timestamp > currentGhostTime)
      );
      if (ghostFrame) {
        drawCar(ctx, ghostFrame.x, ghostFrame.y, ghostFrame.angle, '#ffffff40', true);
      }
    }

    // Player car
    const player = playerRef.current;
    const carColor = player.isDrifting ? '#f59e0b' : selectedCharacter.color;
    drawCar(ctx, player.x, player.y, player.angle + player.driftAngle, carColor, false);

    // Drift particles
    if (player.isDrifting) {
      ctx.fillStyle = '#ffffff80';
      for (let i = 0; i < 3; i++) {
        const offsetX = Math.cos(player.angle + Math.PI) * (20 + i * 10);
        const offsetY = Math.sin(player.angle + Math.PI) * (20 + i * 10);
        ctx.beginPath();
        ctx.arc(player.x + offsetX, player.y + offsetY, 3 - i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Draw car helper
  const drawCar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    isGhost: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Car body
    ctx.fillStyle = color;
    ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);

    // Car details (skip for ghost)
    if (!isGhost) {
      ctx.fillStyle = selectedCharacter.accentColor || '#ffffff';
      ctx.fillRect(-CAR_WIDTH / 2 + 5, -CAR_HEIGHT / 2 + 5, CAR_WIDTH - 10, 15);

      // Character avatar
      if (selectedCharacter.avatarUrl) {
        const img = new Image();
        img.src = selectedCharacter.avatarUrl;
        ctx.drawImage(img, -15, -15, 30, 30);
      }
    }

    ctx.restore();
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        {/* Left side - Lap & Time */}
        <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Lap {currentLap}/{selectedTrack.laps}</div>
          <div className="text-3xl font-bold text-white font-mono">
            {currentTime.toFixed(2)}s
          </div>
          {lapTimes.length > 0 && (
            <div className="text-xs text-cyan-400 mt-1">
              Last: {lapTimes[lapTimes.length - 1].time.toFixed(2)}s
              {lapTimes[lapTimes.length - 1].isPerfect && ' ⭐'}
            </div>
          )}
        </div>

        {/* Right side - Drift Meter */}
        <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Boost</div>
          <div className="w-40 h-6 bg-slate-800 rounded-full overflow-hidden border border-white/20">
            <div
              className={`h-full transition-all ${
                driftMeter > 70 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                driftMeter > 30 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}
              style={{ width: `${driftMeter}%` }}
            />
          </div>
          {isBoosting && <div className="text-xs text-orange-400 mt-1 font-bold">BOOSTING!</div>}
        </div>
      </div>

      {/* Bottom HUD - Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-6 py-3 border border-white/10">
          <div className="text-white/60 text-xs text-center">
            WASD / Arrows: Move • SPACE: Drift • ESC: Pause
          </div>
        </div>
      </div>

      {/* Countdown */}
      {!gameStarted && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="text-9xl font-black text-white animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Pause Menu */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 border-2 border-white/20">
            <h2 className="text-4xl font-black text-white mb-6">PAUSED</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setIsPaused(false)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold"
              >
                Resume
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-slate-700 text-white font-bold"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Race Finished */}
      {raceFinished && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 border-2 border-cyan-500/50">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-6">
              RACE COMPLETE!
            </h2>
            <div className="space-y-3 mb-6">
              {lapTimes.map((lap, index) => (
                <div key={index} className="flex justify-between items-center text-white">
                  <span className="text-white/60">Lap {lap.lap}:</span>
                  <span className="font-mono font-bold">
                    {lap.time.toFixed(2)}s {lap.isPerfect && '⭐'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold"
              >
                Race Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-slate-700 text-white font-bold"
              >
                Track Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={selectedTrack.width}
        height={selectedTrack.height}
        className="absolute inset-0 m-auto"
      />
    </div>
  );
};

export default DriftAttackGame;

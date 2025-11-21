export interface Checkpoint {
  x: number;
  y: number;
  angle: number; // Direction angle for perfect hit detection
  width: number;
  perfectWindow: number; // Smaller window within checkpoint for "perfect" timing
}

export interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'oil' | 'barrier' | 'cone';
}

export interface Shortcut {
  x: number;
  y: number;
  width: number;
  height: number;
  timeSave: number; // Seconds saved if taken successfully
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Track {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'expert';
  theme: 'neon-city' | 'sunset-highway' | 'midnight-mountain';
  worldRecord: number; // In seconds
  unlockScore: number;

  // Track layout
  width: number;
  height: number;
  laps: number;

  // Racing line guide points (for visual aid)
  racingLine: { x: number; y: number }[];

  // Checkpoints for timing splits
  checkpoints: Checkpoint[];

  // Hazards to avoid
  hazards: Hazard[];

  // Optional shortcuts
  shortcuts: Shortcut[];

  // Visual colors
  colors: {
    primary: string;
    accent: string;
    track: string;
    background: string;
  };
}

export const TRACKS: Track[] = [
  {
    id: 'neon-streets',
    name: 'NEON STREETS',
    description: 'Downtown drift through glowing city blocks',
    difficulty: 'beginner',
    theme: 'neon-city',
    worldRecord: 42.5,
    unlockScore: 0,
    width: 1200,
    height: 800,
    laps: 3,

    racingLine: [
      { x: 100, y: 400 },
      { x: 200, y: 200 },
      { x: 600, y: 150 },
      { x: 900, y: 300 },
      { x: 1000, y: 600 },
      { x: 600, y: 700 },
      { x: 200, y: 650 },
      { x: 100, y: 400 },
    ],

    checkpoints: [
      { x: 200, y: 200, angle: 45, width: 80, perfectWindow: 20 },
      { x: 600, y: 150, angle: 0, width: 80, perfectWindow: 20 },
      { x: 900, y: 300, angle: -45, width: 80, perfectWindow: 20 },
      { x: 1000, y: 600, angle: -90, width: 80, perfectWindow: 20 },
      { x: 600, y: 700, angle: 180, width: 80, perfectWindow: 20 },
      { x: 200, y: 650, angle: 135, width: 80, perfectWindow: 20 },
    ],

    hazards: [
      { x: 400, y: 300, width: 40, height: 40, type: 'cone' },
      { x: 700, y: 450, width: 60, height: 20, type: 'oil' },
      { x: 300, y: 500, width: 80, height: 30, type: 'barrier' },
    ],

    shortcuts: [
      { x: 850, y: 200, width: 100, height: 150, timeSave: 0.5, difficulty: 'easy' },
    ],

    colors: {
      primary: '#06b6d4',
      accent: '#3b82f6',
      track: '#1e293b',
      background: '#0f172a',
    },
  },

  {
    id: 'sunset-circuit',
    name: 'SUNSET CIRCUIT',
    description: 'High-speed coastal highway with sweeping curves',
    difficulty: 'intermediate',
    theme: 'sunset-highway',
    worldRecord: 38.2,
    unlockScore: 5000,
    width: 1400,
    height: 900,
    laps: 3,

    racingLine: [
      { x: 100, y: 450 },
      { x: 300, y: 200 },
      { x: 700, y: 100 },
      { x: 1100, y: 200 },
      { x: 1250, y: 450 },
      { x: 1100, y: 750 },
      { x: 700, y: 800 },
      { x: 300, y: 700 },
      { x: 100, y: 450 },
    ],

    checkpoints: [
      { x: 300, y: 200, angle: 30, width: 80, perfectWindow: 18 },
      { x: 700, y: 100, angle: 0, width: 80, perfectWindow: 18 },
      { x: 1100, y: 200, angle: -60, width: 80, perfectWindow: 18 },
      { x: 1250, y: 450, angle: -90, width: 80, perfectWindow: 18 },
      { x: 1100, y: 750, angle: -150, width: 80, perfectWindow: 18 },
      { x: 700, y: 800, angle: 180, width: 80, perfectWindow: 18 },
      { x: 300, y: 700, angle: 150, width: 80, perfectWindow: 18 },
    ],

    hazards: [
      { x: 500, y: 300, width: 50, height: 50, type: 'barrier' },
      { x: 900, y: 150, width: 70, height: 25, type: 'oil' },
      { x: 1150, y: 550, width: 40, height: 40, type: 'cone' },
      { x: 600, y: 650, width: 60, height: 20, type: 'oil' },
    ],

    shortcuts: [
      { x: 950, y: 350, width: 120, height: 200, timeSave: 0.8, difficulty: 'medium' },
      { x: 400, y: 550, width: 100, height: 150, timeSave: 0.6, difficulty: 'medium' },
    ],

    colors: {
      primary: '#f59e0b',
      accent: '#ec4899',
      track: '#451a03',
      background: '#7c2d12',
    },
  },

  {
    id: 'midnight-peak',
    name: 'MIDNIGHT PEAK',
    description: 'Treacherous mountain pass with hairpin turns',
    difficulty: 'expert',
    theme: 'midnight-mountain',
    worldRecord: 45.8,
    unlockScore: 15000,
    width: 1600,
    height: 1000,
    laps: 3,

    racingLine: [
      { x: 150, y: 500 },
      { x: 250, y: 250 },
      { x: 500, y: 150 },
      { x: 800, y: 200 },
      { x: 1000, y: 400 },
      { x: 1200, y: 300 },
      { x: 1400, y: 500 },
      { x: 1300, y: 750 },
      { x: 1000, y: 850 },
      { x: 600, y: 800 },
      { x: 300, y: 700 },
      { x: 150, y: 500 },
    ],

    checkpoints: [
      { x: 250, y: 250, angle: 45, width: 75, perfectWindow: 15 },
      { x: 500, y: 150, angle: 20, width: 75, perfectWindow: 15 },
      { x: 800, y: 200, angle: -30, width: 75, perfectWindow: 15 },
      { x: 1000, y: 400, angle: -60, width: 75, perfectWindow: 15 },
      { x: 1200, y: 300, angle: 30, width: 75, perfectWindow: 15 },
      { x: 1400, y: 500, angle: -90, width: 75, perfectWindow: 15 },
      { x: 1300, y: 750, angle: -135, width: 75, perfectWindow: 15 },
      { x: 1000, y: 850, angle: 180, width: 75, perfectWindow: 15 },
      { x: 600, y: 800, angle: 160, width: 75, perfectWindow: 15 },
      { x: 300, y: 700, angle: 120, width: 75, perfectWindow: 15 },
    ],

    hazards: [
      { x: 350, y: 400, width: 50, height: 50, type: 'barrier' },
      { x: 700, y: 300, width: 80, height: 25, type: 'oil' },
      { x: 1100, y: 250, width: 40, height: 40, type: 'cone' },
      { x: 1250, y: 600, width: 70, height: 25, type: 'oil' },
      { x: 800, y: 750, width: 50, height: 50, type: 'barrier' },
      { x: 450, y: 650, width: 40, height: 40, type: 'cone' },
    ],

    shortcuts: [
      { x: 600, y: 350, width: 150, height: 200, timeSave: 1.2, difficulty: 'hard' },
      { x: 1150, y: 550, width: 120, height: 180, timeSave: 1.0, difficulty: 'hard' },
      { x: 700, y: 650, width: 100, height: 120, timeSave: 0.7, difficulty: 'medium' },
    ],

    colors: {
      primary: '#8b5cf6',
      accent: '#06b6d4',
      track: '#1e1b4b',
      background: '#0c0a1f',
    },
  },
];

export function getTrackById(id: string): Track | undefined {
  return TRACKS.find(track => track.id === id);
}

export function getUnlockedTracks(playerScore: number): Track[] {
  return TRACKS.filter(track => track.unlockScore <= playerScore);
}

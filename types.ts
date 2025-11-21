

export enum GameState {
  MODE_SELECTION,
  MENU,
  PLAYING,
  GAME_OVER,
  LEADERBOARD,
  AI_ELIMINATION,
  FLAPPY_BIRD
}

export type ThemeId = 'midnight' | 'vaporwave' | 'outback';

export interface Character {
  id: string;
  name: string;
  unlockPoints: number; // Lifetime points required to unlock
  color: string;
  accentColor: string;
  avatarUrl: string; // URL for the character image
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  font: string; // Tailwind font class
  unlockScore: number; // Score needed to unlock
  scenery: 'city' | 'palm' | 'forest';
  roadType: 'asphalt' | 'grid' | 'dirt';
  dayNightEnabled: boolean;
  colors: {
    backgroundTop: string;
    backgroundBottom: string;
    road: string;
    roadMarking: string;
    laneBorder: string;
    player?: string; // Optional override, otherwise uses Character color
    playerAccent?: string;
    obstacle: string;
    obstacleAccent: string;
    coin: string;
    text: string;
    uiBorder: string;
    uiBackground: string;
  };
}

export interface Position {
  x: number;
  y: number;
}

export type EntityType = 'player' | 'obstacle' | 'coin' | 'powerup_shield' | 'powerup_slow' | 'powerup_blast';

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  accentColor?: string;
  type: EntityType;
  lane?: number;
  isRival?: boolean;
  name?: string;
  avatarUrl?: string;
}

export interface Decor {
  id: string;
  x: number;
  y: number;
  type: 'tree' | 'light' | 'column';
  scale: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  aiComment?: string;
  rankTitle?: string;
}

export interface GameConfig {
  lanes: number;
  laneWidth: number;
  speedBase: number;
  speedMax: number;
  obstacleSpawnRate: number;
}

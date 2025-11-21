
import { ThemeConfig, Character } from './types';

export const CANVAS_WIDTH = 1000; // Wider gameplay window
export const CANVAS_HEIGHT = 600; // Taller gameplay window
export const LANE_COUNT = 5; // More lanes for the larger space
export const LANE_HEIGHT = CANVAS_HEIGHT / LANE_COUNT;

export const PLAYER_SIZE = 48; 
export const OBSTACLE_SIZE = 48;
export const COIN_SIZE = 28;
export const POWERUP_SIZE = 34;

// Physics & Gameplay
export const LANE_TRANSITION_SPEED = 0.3; // Higher = Faster snap to center
export const INITIAL_SPEED = 5; // Balanced start - not too slow, not too fast
export const MAX_SPEED = 20; // Reduced from 30 for less chaos
export const SPEED_INCREMENT = 0.3; // Reduced from 0.5 for smoother progression
export const LEVEL_SCORE_THRESHOLD = 250; // Score needed to level up
export const DAY_NIGHT_CYCLE_FRAMES = 3600; // 60 seconds at 60fps for full cycle

// Colors
export const COLOR_BLAST = '#ef4444';

export const CHARACTERS: Character[] = [
  {
    id: 'player1',
    name: 'PLAYER 1',
    unlockPoints: 0, // Available immediately
    color: '#3b82f6',
    accentColor: '#1d4ed8',
    avatarUrl: '/players/player-1.jpg'
  },
  {
    id: 'player2',
    name: 'PLAYER 2',
    unlockPoints: 0, // Available immediately
    color: '#ef4444',
    accentColor: '#991b1b',
    avatarUrl: '/players/player-2.jpg'
  },
  {
    id: 'player3',
    name: 'PLAYER 3',
    unlockPoints: 0, // Available immediately
    color: '#22c55e',
    accentColor: '#14532d',
    avatarUrl: '/players/player-3.jpg'
  },
  {
    id: 'player4',
    name: 'PLAYER 4',
    unlockPoints: 500,
    color: '#f59e0b',
    accentColor: '#78350f',
    avatarUrl: '/players/player-4.jpeg'
  },
  {
    id: 'player5',
    name: 'PLAYER 5',
    unlockPoints: 1000,
    color: '#8b5cf6',
    accentColor: '#4c1d95',
    avatarUrl: '/players/player-5.jpg'
  },
  {
    id: 'player6',
    name: 'PLAYER 6',
    unlockPoints: 1500,
    color: '#ec4899',
    accentColor: '#831843',
    avatarUrl: '/players/player-6.jpg'
  },
  {
    id: 'player7',
    name: 'PLAYER 7',
    unlockPoints: 2000,
    color: '#06b6d4',
    accentColor: '#164e63',
    avatarUrl: '/players/player-7.jpg'
  },
  {
    id: 'player8',
    name: 'PLAYER 8',
    unlockPoints: 2500,
    color: '#84cc16',
    accentColor: '#365314',
    avatarUrl: '/players/player-8.jpeg'
  },
  {
    id: 'player9',
    name: 'PLAYER 9',
    unlockPoints: 3000,
    color: '#f97316',
    accentColor: '#7c2d12',
    avatarUrl: '/players/player-9.jpg'
  },
  {
    id: 'player10',
    name: 'PLAYER 10',
    unlockPoints: 4000,
    color: '#64748b',
    accentColor: '#0f172a',
    avatarUrl: '/players/player-10.jpg'
  },
  {
    id: 'player11',
    name: 'PLAYER 11',
    unlockPoints: 5000,
    color: '#14b8a6',
    accentColor: '#134e4a',
    avatarUrl: '/players/player-11.jpg'
  },
  {
    id: 'player12',
    name: 'PLAYER 12',
    unlockPoints: 6000,
    color: '#a855f7',
    accentColor: '#581c87',
    avatarUrl: '/players/player-12.jpg'
  },
  {
    id: 'player13',
    name: 'PLAYER 13',
    unlockPoints: 7500,
    color: '#eab308',
    accentColor: '#713f12',
    avatarUrl: '/players/player-13.jpg'
  },
  {
    id: 'player14',
    name: 'PLAYER 14',
    unlockPoints: 9000,
    color: '#10b981',
    accentColor: '#064e3b',
    avatarUrl: '/players/player-14.jpg'
  },
  {
    id: 'player15',
    name: 'PLAYER 15',
    unlockPoints: 11000,
    color: '#f43f5e',
    accentColor: '#881337',
    avatarUrl: '/players/player-15.jpg'
  },
  {
    id: 'player16',
    name: 'PLAYER 16',
    unlockPoints: 13000,
    color: '#0ea5e9',
    accentColor: '#0c4a6e',
    avatarUrl: '/players/player-16.jpg'
  },
  {
    id: 'player17',
    name: 'PLAYER 17',
    unlockPoints: 15000,
    color: '#d946ef',
    accentColor: '#701a75',
    avatarUrl: '/players/player-17.jpg'
  },
  {
    id: 'player18',
    name: 'PLAYER 18',
    unlockPoints: 18000,
    color: '#fb923c',
    accentColor: '#9a3412',
    avatarUrl: '/players/player-18.jpg'
  },
  {
    id: 'player19',
    name: 'PLAYER 19',
    unlockPoints: 22000,
    color: '#4ade80',
    accentColor: '#14532d',
    avatarUrl: '/players/player-19.jpg'
  },
  {
    id: 'player20',
    name: 'PLAYER 20',
    unlockPoints: 27000,
    color: '#facc15',
    accentColor: '#854d0e',
    avatarUrl: '/players/player-20.jpg'
  },
  {
    id: 'player21',
    name: 'PLAYER 21',
    unlockPoints: 33000,
    color: '#38bdf8',
    accentColor: '#075985',
    avatarUrl: '/players/player-21.jpg'
  },
  {
    id: 'player22',
    name: 'PLAYER 22',
    unlockPoints: 40000,
    color: '#c084fc',
    accentColor: '#6b21a8',
    avatarUrl: '/players/player-22.jpg'
  }
];

export const THEMES: Record<string, ThemeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'MIDNIGHT RUN',
    description: 'High speed urban drift. Smooth asphalt, street lights.',
    font: 'font-sans',
    unlockScore: 0,
    scenery: 'city',
    roadType: 'asphalt',
    dayNightEnabled: true,
    colors: {
      backgroundTop: '#0f172a', 
      backgroundBottom: '#1e293b',
      road: '#334155', 
      roadMarking: 'rgba(255, 255, 255, 0.4)',
      laneBorder: 'rgba(255, 255, 255, 0.1)',
      obstacle: '#1e293b', 
      obstacleAccent: '#f87171', 
      coin: '#facc15', 
      text: 'text-white',
      uiBorder: 'border-white/20',
      uiBackground: 'bg-slate-900/80'
    }
  },
  vaporwave: {
    id: 'vaporwave',
    name: 'VAPOR HORIZON',
    description: 'Aesthetics and chill beats.',
    font: 'font-display',
    unlockScore: 1500,
    scenery: 'palm',
    roadType: 'grid',
    dayNightEnabled: false, // Vaporwave is eternally dusk
    colors: {
      backgroundTop: '#240046',
      backgroundBottom: '#7b2cbf',
      road: '#10002b',
      roadMarking: 'rgba(224, 170, 255, 0.5)',
      laneBorder: '#c77dff',
      obstacle: '#ff006e', 
      obstacleAccent: '#ff9e00',
      coin: '#9d4edd',
      text: 'text-fuchsia-300',
      uiBorder: 'border-fuchsia-500/50',
      uiBackground: 'bg-purple-900/80'
    }
  },
  outback: {
    id: 'outback',
    name: 'DUSTY RALLY',
    description: 'Off-road intensity in nature.',
    font: 'font-display',
    unlockScore: 3000,
    scenery: 'forest',
    roadType: 'dirt',
    dayNightEnabled: true,
    colors: {
      backgroundTop: '#87CEEB',
      backgroundBottom: '#fde68a',
      road: '#d4a373',
      roadMarking: 'rgba(255, 255, 255, 0.3)',
      laneBorder: 'rgba(0,0,0,0.1)',
      obstacle: '#57534e',
      obstacleAccent: '#292524',
      coin: '#3b82f6',
      text: 'text-slate-800',
      uiBorder: 'border-amber-800/30',
      uiBackground: 'bg-amber-50/90'
    }
  }
};

// Helper function to convert community avatar database records to Character objects
export function convertCommunityAvatarToCharacter(dbRecord: any): Character {
  return {
    id: `community-${dbRecord.id}`,
    name: dbRecord.name,
    unlockPoints: 0, // Community avatars are always unlocked
    color: dbRecord.color,
    accentColor: dbRecord.accent_color,
    avatarUrl: dbRecord.avatar_url
  };
}

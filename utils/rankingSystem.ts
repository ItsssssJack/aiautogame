export interface RankLevel {
  level: number;
  title: string;
  emoji: string;
  minScore: number;
  color: string;
  gradient: string;
}

export const RANK_LEVELS: RankLevel[] = [
  {
    level: 1,
    title: "Fax Machine",
    emoji: "📠",
    minScore: 0,
    color: "#94a3b8",
    gradient: "from-slate-400 to-slate-600"
  },
  {
    level: 2,
    title: "Padawan",
    emoji: "🌱",
    minScore: 1000,
    color: "#86efac",
    gradient: "from-green-300 to-green-600"
  },
  {
    level: 3,
    title: "Cloud",
    emoji: "☁️",
    minScore: 2500,
    color: "#93c5fd",
    gradient: "from-blue-300 to-blue-500"
  },
  {
    level: 4,
    title: "Automation Ninja",
    emoji: "🥷",
    minScore: 5000,
    color: "#a78bfa",
    gradient: "from-violet-400 to-violet-700"
  },
  {
    level: 5,
    title: "Trailblazer",
    emoji: "🔥",
    minScore: 8000,
    color: "#fb923c",
    gradient: "from-orange-400 to-red-600"
  },
  {
    level: 6,
    title: "AI Wizard",
    emoji: "🧙",
    minScore: 12000,
    color: "#c084fc",
    gradient: "from-purple-400 to-purple-700"
  },
  {
    level: 7,
    title: "Automation Hero",
    emoji: "🦸",
    minScore: 18000,
    color: "#fbbf24",
    gradient: "from-yellow-400 to-amber-600"
  },
  {
    level: 8,
    title: "T-800",
    emoji: "🦾",
    minScore: 25000,
    color: "#ef4444",
    gradient: "from-red-500 to-red-900"
  },
  {
    level: 9,
    title: "Singularity",
    emoji: "⭐️",
    minScore: 35000,
    color: "#fbbf24",
    gradient: "from-yellow-300 via-amber-500 to-orange-700"
  }
];

export function getRankLevel(score: number): RankLevel {
  // Find the highest rank the player qualifies for
  for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
    if (score >= RANK_LEVELS[i].minScore) {
      return RANK_LEVELS[i];
    }
  }
  // Default to first rank
  return RANK_LEVELS[0];
}

export function getProgressToNextRank(score: number): {
  currentRank: RankLevel;
  nextRank: RankLevel | null;
  progressPercent: number;
  pointsNeeded: number;
} {
  const currentRank = getRankLevel(score);
  const currentIndex = RANK_LEVELS.findIndex(r => r.level === currentRank.level);
  const nextRank = currentIndex < RANK_LEVELS.length - 1 ? RANK_LEVELS[currentIndex + 1] : null;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progressPercent: 100,
      pointsNeeded: 0
    };
  }

  const pointsIntoCurrentRank = score - currentRank.minScore;
  const pointsNeededForNextRank = nextRank.minScore - currentRank.minScore;
  const progressPercent = Math.min(100, (pointsIntoCurrentRank / pointsNeededForNextRank) * 100);
  const pointsNeeded = nextRank.minScore - score;

  return {
    currentRank,
    nextRank,
    progressPercent,
    pointsNeeded
  };
}

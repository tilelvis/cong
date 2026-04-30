export const DIFFICULTY_BASE_POINTS = {
  novice: 100,
  soldier: 300,
  expert: 700,
} as const;

export function getTimeMultiplier(timeTakenMs: number): number {
  const s = timeTakenMs / 1000;
  if (s < 30)  return 3.0;
  if (s < 60)  return 2.0;
  if (s < 120) return 1.5;
  if (s < 300) return 1.0;
  return 0.5;
}

export function calcPoints(
  difficulty: 'novice' | 'soldier' | 'expert',
  timeTakenMs: number,
): { points: number; multiplier: number } {
  const base = DIFFICULTY_BASE_POINTS[difficulty];
  const multiplier = getTimeMultiplier(timeTakenMs);
  return { points: Math.round(base * multiplier), multiplier };
}

export const NOVICE_BADGES = [
  { id: 'novice-0', emoji: '🪐', name: 'Cadet',     min: 0     },
  { id: 'novice-1', emoji: '⭐', name: 'Scout',     min: 500   },
  { id: 'novice-2', emoji: '🌟', name: 'Ranger',    min: 1500  },
  { id: 'novice-3', emoji: '💫', name: 'Commander', min: 3000  },
] as const;

export const SOLDIER_BADGES = [
  { id: 'soldier-0', emoji: '⚔️',  name: 'Recruit', min: 0    },
  { id: 'soldier-1', emoji: '🛡️',  name: 'Soldier', min: 1000 },
  { id: 'soldier-2', emoji: '🔱',  name: 'Warlord', min: 3000 },
  { id: 'soldier-3', emoji: '👑',  name: 'General', min: 7000 },
] as const;

export const EXPERT_BADGES = [
  { id: 'expert-0', emoji: '🔬', name: 'Analyst',    min: 0     },
  { id: 'expert-1', emoji: '🧠', name: 'Cipher',     min: 2000  },
  { id: 'expert-2', emoji: '⚡', name: 'Phantom',    min: 6000  },
  { id: 'expert-3', emoji: '👽', name: 'Alien Mind', min: 15000 },
] as const;

export const OVERALL_RANKS = [
  { emoji: '🌑', name: 'Dark Matter',        min: 0      },
  { emoji: '🌒', name: 'Nebula',             min: 1000   },
  { emoji: '🌓', name: 'Stardust',           min: 5000   },
  { emoji: '🌔', name: 'Nova',               min: 15000  },
  { emoji: '🌕', name: 'Supernova',          min: 40000  },
  { emoji: '☄️', name: 'Event Horizon',      min: 100000 },
  { emoji: '👽', name: 'Alien Intelligence', min: 250000 },
] as const;

type BadgeEntry = { emoji: string; name: string; min: number };

function getBadge(pts: number, tiers: readonly BadgeEntry[]): BadgeEntry {
  return [...tiers].reverse().find(t => pts >= t.min) ?? tiers[0];
}

export function getNoviceBadge(pts: number)  { return getBadge(pts, NOVICE_BADGES);  }
export function getSoldierBadge(pts: number) { return getBadge(pts, SOLDIER_BADGES); }
export function getExpertBadge(pts: number)  { return getBadge(pts, EXPERT_BADGES);  }
export function getOverallRank(pts: number)  { return getBadge(pts, OVERALL_RANKS);  }

export function getNextRank(pts: number): BadgeEntry | null {
  return [...OVERALL_RANKS].find(r => r.min > pts) ?? null;
}

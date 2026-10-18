import type { Difficulty } from '../sim/types';

/** A team battle: both sides' fighters and formation. Everyone is AI-controlled. */
export interface TeamSetup {
  size: 2 | 3 | 4;
  player: { id: string; row: 'front' | 'back' }[];
  enemy: { id: string; row: 'front' | 'back' }[];
  mode: 'free' | 'draft';
}

/** Arena size (sim units) per team size; the arena is drawn scaled down to fit the same screen area. */
export const TEAM_ARENAS: Record<2 | 3 | 4, { width: number; height: number }> = {
  2: { width: 900, height: 372 },
  3: { width: 1200, height: 496 },
  4: { width: 1500, height: 620 },
};

/** What Character Select hands to the Battle scene (and Results hands back for a rematch). */
export interface MatchSetup {
  playerId: string;
  enemyId: string;
  difficulty: Difficulty;
  seed: number;
  /** Training mode: fight a dummy with infinite energy instead of a CPU opponent. */
  training?: boolean;
  /** Team battle (2v2 to 4v4, all AI). playerId / enemyId are ignored when this is set. */
  team?: TeamSetup;
}

export const newSeed = (): number => Math.floor(Math.random() * 2 ** 31);

export interface MatchResult {
  setup: MatchSetup;
  /** 0 = player's team won, 1 = enemy, -1 = draw. */
  winnerTeam: number;
  reason: 'ko' | 'time';
  duration: number;
  fighters: {
    id: string;
    name: string;
    color: number;
    hpLeft: number;
    maxHp: number;
    damageDealt: number;
    skillsUsed: number;
    hits: number;
    transformed: boolean;
    /** Team battles: 0 = your team, 1 = the other. */
    team?: number;
    healing?: number;
  }[];
}

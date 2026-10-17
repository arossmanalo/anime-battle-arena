import type { Difficulty } from '../sim/types';

/** What Character Select hands to the Battle scene (and Results hands back for a rematch). */
export interface MatchSetup {
  playerId: string;
  enemyId: string;
  difficulty: Difficulty;
  seed: number;
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
  }[];
}

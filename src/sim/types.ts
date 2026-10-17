export interface Vec {
  x: number;
  y: number;
}

/** Effects applied to whoever a skill hits (or to the caster, for `selfEffects`). */
export type Effect =
  | { type: 'damage'; amount: number }
  | { type: 'knockback'; force: number }
  | { type: 'stun'; duration: number }
  | { type: 'burn'; dps: number; duration: number }
  | { type: 'slow'; factor: number; duration: number }
  | { type: 'shield'; amount: number; duration: number }
  | { type: 'heal'; amount: number }
  | { type: 'speedBuff'; factor: number; duration: number }
  | { type: 'damageBuff'; factor: number; duration: number };

export type SkillKind = 'projectile' | 'beam' | 'dash' | 'aoe' | 'zone' | 'buff';

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  /** Energy spent on cast. Ultimates ignore this and spend the full ultimate meter instead. */
  energyCost: number;
  /** Seconds. */
  cooldown: number;
  /** Wind-up before the skill fires, in seconds. The caster is slowed while winding up. */
  castTime: number;
  /** Max distance at which the AI considers the skill useful. Also beam length / dash distance. */
  range: number;
  effects: Effect[];
  selfEffects?: Effect[];
  /** projectile: hit radius. aoe/zone: area radius. beam: half-width. */
  radius?: number;
  /** projectile / dash travel speed (px/s). */
  speed?: number;
  /** projectile: how many to fire, and the fan angle between them (radians). */
  count?: number;
  spread?: number;
  /** projectile: explode on impact, hitting everyone within this radius. */
  impactRadius?: number;
  /** beam / zone: how long it lasts, and how often its effects re-apply. */
  duration?: number;
  tickInterval?: number;
  /** aoe / zone: centre on the target instead of the caster. */
  atTarget?: boolean;
  /** zone: render as a full Domain Expansion. */
  domain?: boolean;
  ultimate?: boolean;
  color: number;
}

export interface FormDef {
  id: string;
  name: string;
  /** Unlocks once HP falls to this fraction of max. */
  hpThreshold: number;
  energyCost: number;
  speedMult: number;
  damageMult: number;
  energyRegenMult: number;
  /** Fraction of max HP restored on transforming. */
  heal: number;
  /** Skill slot (0-3) → replacement skill while transformed. */
  skillOverrides?: Partial<Record<0 | 1 | 2 | 3, SkillDef>>;
  ultimateOverride?: SkillDef;
  color: number;
}

export type AiProfile = 'rushdown' | 'balanced' | 'zoner';

export interface VoiceLines {
  intro: string[];
  ultimate: string[];
  transform: string[];
  hurt: string[];
  win: string[];
}

export interface FighterDef {
  id: string;
  name: string;
  series: string;
  /** Short label for the placeholder portrait. */
  initials: string;
  color: number;
  accent: number;
  hp: number;
  speed: number;
  radius: number;
  energyRegen: number;
  aiProfile: AiProfile;
  skills: [SkillDef, SkillDef, SkillDef, SkillDef];
  ultimate: SkillDef;
  form?: FormDef;
  voiceLines: VoiceLines;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Controller = 'ai' | 'player';

export interface FighterSetup {
  def: FighterDef;
  controller: Controller;
}

export interface SimConfig {
  seed: number;
  /** Each inner array is a team. 1v1 today; 2v2 tag teams later use the same shape. */
  teams: FighterSetup[][];
  arena?: { width: number; height: number };
  /** Seconds. */
  timeLimit?: number;
  difficulty?: Difficulty;
  /** Seconds a player may stay idle before the AI starts casting for them. 0 disables it. */
  idleFallback?: number;
}

/** Slot 0-3 are the regular skills, 4 is the ultimate. */
export type SkillSlot = 0 | 1 | 2 | 3 | 4;

export type Command =
  | { type: 'castSkill'; uid: number; slot: SkillSlot }
  | { type: 'transform'; uid: number }
  | { type: 'setAuto'; uid: number; auto: boolean };

export type CastFailReason = 'cooldown' | 'energy' | 'busy' | 'stunned' | 'dead' | 'unavailable';

export type SimEvent =
  | { type: 'skillCast'; uid: number; skill: SkillDef }
  | { type: 'skillFired'; uid: number; skill: SkillDef; x: number; y: number }
  | { type: 'castFailed'; uid: number; reason: CastFailReason }
  | { type: 'hit'; source: number; target: number; damage: number; x: number; y: number; skill: SkillDef }
  | { type: 'impact'; x: number; y: number; radius: number; color: number }
  | { type: 'ko'; uid: number }
  | { type: 'transform'; uid: number; form: FormDef }
  | { type: 'voiceLine'; uid: number; text: string }
  | { type: 'matchEnd'; winnerTeam: number; reason: 'ko' | 'time' };

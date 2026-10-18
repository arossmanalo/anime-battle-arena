export interface Vec {
  x: number;
  y: number;
}

/** Effects applied to whoever a skill hits (or to the caster, for `selfEffects`). */
export type Effect =
  /** `pierce` (0-1): the share of this damage that ignores shields. */
  | { type: 'damage'; amount: number; pierce?: number }
  | { type: 'knockback'; force: number }
  | { type: 'stun'; duration: number }
  | { type: 'burn'; dps: number; duration: number }
  | { type: 'slow'; factor: number; duration: number }
  | { type: 'shield'; amount: number; duration: number }
  | { type: 'heal'; amount: number }
  | { type: 'speedBuff'; factor: number; duration: number }
  | { type: 'damageBuff'; factor: number; duration: number }
  /** Enemies hit are forced to attack the caster for `duration` seconds. */
  | { type: 'taunt'; duration: number }
  /** The target takes `factor` (0.6 = 40% less) of incoming damage for `duration` seconds. */
  | { type: 'guard'; factor: number; duration: number }
  /** Removes stun, burn and slow from the target. */
  | { type: 'cleanse' };

export type SkillKind = 'projectile' | 'beam' | 'dash' | 'aoe' | 'zone' | 'buff';

/** Roles are scores (0-1); a hybrid has two high ones. Missing roles count as 0, and a fighter with none is a damage dealer. */
export type Role = 'tank' | 'damage' | 'support';
export type RoleScores = Partial<Record<Role, number>>;

/** Effects a skill applies to the caster's teammates. */
export interface SupportDef {
  to: 'lowestAlly' | 'allAllies' | 'nearestAlly';
  /** Teammates must be within this distance (default 400). */
  range?: number;
  effects: Effect[];
}

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
  /** domain: instead of a backdrop, a shrine rises at the caster and slashes fly across the whole screen. */
  domainStyle?: 'slashes';
  ultimate?: boolean;
  /** Applied to teammates when the skill fires (heals, shields, buffs for others). */
  support?: SupportDef;
  /** zone: effects applied once, to everyone still inside, when the zone ends (a domain's final blow). */
  finale?: Effect[];
  /** While winding up this skill, the caster can't be stunned or interrupted. */
  uninterruptible?: boolean;
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

/** What a passive does. Passives are always on: no cast, no energy, no button. */
export type PassiveEffect =
  /** Blocks the next `hits` incoming attacks outright. Once spent, recharges after `cooldown` seconds. */
  | { kind: 'barrier'; hits: number; cooldown: number }
  /** Each incoming attack has this chance (0-1) to be evaded outright. */
  | { kind: 'dodge'; chance: number }
  /** Heals `hpPerSec` while HP is at or below `belowHp` (fraction of max). */
  | { kind: 'regen'; hpPerSec: number; belowHp: number }
  /** Damage dealt grows with missing HP, up to +`maxBonus` (0.3 = +30%) at 0 HP. */
  | { kind: 'rage'; maxBonus: number }
  /** The ultimate meter charges `mult` times as fast. */
  | { kind: 'ultCharge'; mult: number }
  /** Once per match, a lethal hit leaves the fighter on 1 HP and invulnerable for `invuln` seconds. */
  | { kind: 'lastStand'; invuln: number }
  /** Each damaging projectile/dash/area/default-attack hit puts a mark on the target (they expire after `expire` s without a new one); a hit on a target with `stacks` marks consumes them for `bonus` extra damage. */
  | { kind: 'marks'; stacks: number; bonus: number; expire: number };

export type PassiveDef = { id: string; name: string; description: string } & PassiveEffect;

/**
 * A fighter's default attack: used automatically whenever an enemy is in reach, costs no energy and
 * works alongside skills. Melee swings need the enemy within `range`; ranged ones fire a weak projectile.
 */
export interface AttackDef {
  name: string;
  style: 'melee' | 'ranged';
  /** Damage per hit. The last hit of a combo deals 1.5x and adds knockback. */
  damage: number;
  /** melee: reach beyond both fighters' radii. ranged: how far the projectile flies. */
  range: number;
  /** Seconds between attacks (the combo finisher takes 1.5x as long to recover). */
  cooldown: number;
  /** Seconds from starting the swing to the hit landing. */
  windup: number;
  /** Hits in the chain (1 = no combo). */
  combo: number;
  /** Knockback on the combo finisher (or on every hit if combo is 1). */
  knockback?: number;
  /** ranged: projectile speed (px/s). */
  speed?: number;
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
  attack: AttackDef;
  /** Team roles. Missing = damage dealer. */
  roles?: RoleScores;
  /** Skills that replace a slot only in team matches (so 1v1 balance is unaffected). */
  teamKit?: Partial<Record<0 | 1 | 2 | 3, SkillDef>>;
  passive: PassiveDef;
  form?: FormDef;
  voiceLines: VoiceLines;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

/** `dummy` is the training dummy: it never acts, can't be killed, and its position is controlled by the sim. */
export type Controller = 'ai' | 'player' | 'dummy';

export interface FighterSetup {
  def: FighterDef;
  controller: Controller;
  /** Formation: back-row fighters start further from the enemy. Default depends on the fighter's roles. */
  row?: 'front' | 'back';
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
  /** Team matches: healing weakens and defence drops as the match goes on, to prevent stalemates. Default: on when a team has more than one fighter. */
  decay?: boolean;
  /** Training mode: the player has infinite energy and ultimate, can transform any time and can't be hurt; the match never ends. */
  training?: boolean;
}

/** Slot 0-3 are the regular skills, 4 is the ultimate. */
export type SkillSlot = 0 | 1 | 2 | 3 | 4;

/** How a team's AI fights: `aggressive` closes in and never backs off, `defensive` holds near its team until enemies come close. */
export type Stance = 'aggressive' | 'balanced' | 'defensive';

/** Tactical orders a team can give its (AI-controlled) fighters during a match. */
export interface TeamOrders {
  /** Everyone attacks this enemy (uid) while it lives, unless taunted. */
  focus: number | null;
  /** Healers and supports favour this ally (uid), tanks guard it, damage dealers hunt whoever attacks it. */
  protect: number | null;
  stance: Stance;
  /** The AI holds its ultimates; the player fires them by hand. */
  holdUlts: boolean;
}

export const DEFAULT_ORDERS: TeamOrders = { focus: null, protect: null, stance: 'balanced', holdUlts: false };

export type Command =
  | { type: 'order'; team: number; order: Partial<TeamOrders> }
  | { type: 'castSkill'; uid: number; slot: SkillSlot }
  | { type: 'transform'; uid: number }
  | { type: 'setAuto'; uid: number; auto: boolean };

export type CastFailReason = 'cooldown' | 'energy' | 'busy' | 'stunned' | 'dead' | 'unavailable';

/** What a passive just did: blocked or evaded an attack, saved its owner from a KO, or recharged. */
export type PassiveProc = 'block' | 'dodge' | 'lastStand' | 'recharged';

export type SimEvent =
  | { type: 'skillCast'; uid: number; skill: SkillDef }
  | { type: 'skillFired'; uid: number; skill: SkillDef; x: number; y: number }
  | { type: 'castFailed'; uid: number; reason: CastFailReason }
  | { type: 'hit'; source: number; target: number; damage: number; x: number; y: number; skill: SkillDef }
  | { type: 'impact'; x: number; y: number; radius: number; color: number; skillId?: string }
  | { type: 'heal'; uid: number; amount: number; source: number }
  | { type: 'attack'; uid: number; attack: AttackDef; finisher: boolean }
  | { type: 'passive'; uid: number; passive: PassiveDef; proc: PassiveProc; x: number; y: number }
  | { type: 'ko'; uid: number }
  | { type: 'transform'; uid: number; form: FormDef }
  | { type: 'voiceLine'; uid: number; text: string }
  | { type: 'matchEnd'; winnerTeam: number; reason: 'ko' | 'time' };

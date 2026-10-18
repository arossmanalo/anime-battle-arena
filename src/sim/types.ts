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
  /** `selfFactor`: the share of the heal the caster gets when healing themself (0.6 = 40% less). */
  | { type: 'heal'; amount: number; selfFactor?: number }
  /** Heals `hps` HP per second for `duration` seconds. Re-applying refreshes it instead of stacking. */
  | { type: 'regen'; hps: number; duration: number }
  /** For `duration` seconds the target ignores new burn, slow and stun. */
  | { type: 'ward'; duration: number }
  /** Strips the target's shields, guards, buffs, wards and braces. */
  | { type: 'purge' }
  /** For `duration` seconds any slow on the target is weakened: `share` (0.5 = half) of its strength is removed. */
  | { type: 'slowResist'; share: number; duration: number }
  /** Cuts the remaining time of the target's slows by `cut` (0.7 = 70% shorter). */
  | { type: 'unslow'; cut: number }
  /** Marks the target: for `duration` seconds the marker's team deals `amount` times damage to it (0.15 more = 1.15). Re-marking refreshes, never stacks. */
  | { type: 'mark'; amount: number; duration: number }
  /** For `duration` seconds the target deals a little extra damage to marked enemies (Focused Assault). */
  | { type: 'focus'; duration: number }
  /** For `duration` seconds nothing the target has (a barrier, a dodge) can stop an attack: every hit on it lands. */
  | { type: 'expose'; duration: number }
  | { type: 'speedBuff'; factor: number; duration: number }
  | { type: 'damageBuff'; factor: number; duration: number }
  /** Enemies hit are forced to attack the caster for `duration` seconds. */
  | { type: 'taunt'; duration: number }
  /** The target takes `factor` (0.6 = 40% less) of incoming damage for `duration` seconds. */
  | { type: 'guard'; factor: number; duration: number }
  /** Removes stun, burn and slow from the target. */
  | { type: 'cleanse' }
  /** For `duration` seconds knockback taken is multiplied by `factor` and stuns are shortened by it (at 0.3 or less they are ignored and nothing interrupts a cast). */
  | { type: 'steady'; factor: number; duration: number }
  /** Braces for `duration` seconds: no default attacks, and the first close-range hit that lands is answered with `damage`, a stun and knockback. */
  | { type: 'counter'; duration: number; damage: number };

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
  /** An area skill with a second ring: enemies farther than `from` from the centre get these effects instead of `effects`. */
  outer?: { from: number; effects: Effect[] };
  /** Healing a badly hurt ally can enlarge the next use (see the awakening passive's `radiusBonus`). */
  boostable?: boolean;
  /** Projectile: how many times it ricochets off walls and enemies (each enemy hit redirects it to another enemy). */
  bounces?: number;
  /** Zone: enemies inside are pulled toward the centre at this speed (px/s). */
  pull?: number;
  /** Can only be cast while the caster is at or below this fraction of max HP. */
  requiresHpBelow?: number;
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
  /** A rally pulse when the form activates: effects on enemies and on allies (and self) within `radius`. */
  rally?: { radius: number; enemyEffects: Effect[]; allyEffects: Effect[] };
  /** A second life: instead of unlocking at low HP, the form triggers when this fighter would die, reviving them at `reviveHp` of max HP. */
  onDeath?: boolean;
  reviveHp?: number;
  /** Seconds of invulnerability right after reviving. */
  reviveInvuln?: number;
  /** Seconds of free energy right after reviving: skills cost nothing and energy stays full. */
  reviveFreeEnergy?: number;
  /** Two orbs (colours) that hover beside the fighter while at 30% HP or less, showing the form's ultimate is armed. */
  ultOrbs?: [number, number];
  /** Healing done is multiplied by this while transformed. */
  healMult?: number;
  /** Max HP multiplier while transformed (the extra HP is granted on transforming). */
  maxHpMult?: number;
  /** Damage taken multiplier while transformed (0.85 = 15% less). */
  damageTaken?: number;
  /** Knockback taken multiplier while transformed (0.6 = 40% less). */
  knockbackTaken?: number;
  /** Replaces the passive while transformed. */
  passiveOverride?: PassiveDef;
  /** Replaces the default attack while transformed. */
  attackOverride?: AttackDef;
  /** Replaces the team roles while transformed (a support that becomes a frontline tank). */
  roles?: RoleScores;
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
  | { kind: 'marks'; stacks: number; bonus: number; expire: number }
  /**
   * An awakening meter (0-100) that fills from damage dealt (`perDamage`), damage taken (`perTaken`) and support
   * actions (`perSupport` per HP healed or shield granted, and a flat bonus for a cleanse). A full meter unlocks the
   * transformation like low HP does. Also regenerates `hpPerSec` once `regenDelay` seconds have passed without taking damage.
   */
  | {
      kind: 'awakening';
      perDamage: number;
      perTaken: number;
      perSupport: number;
      regenDelay: number;
      hpPerSec: number;
      /** Knockback taken is reduced by up to this much (0.5 = 50%) at a full meter; a transformed fighter counts as full. */
      knockbackResist?: number;
      /** Damage taken is reduced by up to this much at a full meter. */
      damageReduction?: number;
      /** Healing an ally under 35% HP enlarges the caster's next `boostable` area skill by `bonus` (0.25 = +25%) for `expire` seconds. */
      radiusBonus?: { bonus: number; expire: number };
      /** Seconds between meter gains, so rapid ticks cannot fill it. */
      icd?: number;
      /** Meter gained when this fighter's stun interrupts an enemy. */
      interruptGain?: number;
      /** Assisting a teammate (a buff, a guard) gives this fighter a short speed boost. */
      assistSpeed?: { factor: number; duration: number };
    };

export type PassiveDef = { id: string; name: string; description: string } & PassiveEffect;

/**
 * A fighter's default attack: used automatically whenever an enemy is in reach, costs no energy and
 * works alongside skills. Melee swings need the enemy within `range`; ranged ones fire a weak projectile.
 */
export interface AttackDef {
  name: string;
  /** Effect-art id when it differs from `<fighter>.attack` (a transformed form with its own hit effect). */
  fxId?: string;
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
  | { type: 'impact'; x: number; y: number; radius: number; color: number; skillId?: string; support?: boolean; uid?: number; duration?: number }
  | { type: 'heal'; uid: number; amount: number; source: number }
  | { type: 'attack'; uid: number; attack: AttackDef; finisher: boolean }
  | { type: 'passive'; uid: number; passive: PassiveDef; proc: PassiveProc; x: number; y: number }
  | { type: 'ko'; uid: number }
  | { type: 'transform'; uid: number; form: FormDef }
  | { type: 'voiceLine'; uid: number; text: string }
  | { type: 'matchEnd'; winnerTeam: number; reason: 'ko' | 'time' };

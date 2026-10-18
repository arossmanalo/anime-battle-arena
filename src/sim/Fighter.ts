import { passiveDamageMult } from './passives';
import type { AttackDef, Controller, FighterDef, FormDef, PassiveDef, PassiveProc, SkillDef, SkillSlot, Vec } from './types';
import { vec } from './vec';

export type StatusType = 'stun' | 'burn' | 'slow' | 'shield' | 'speedBuff' | 'damageBuff' | 'taunt' | 'guard' | 'steady' | 'counter' | 'regen' | 'ward';

export interface Status {
  type: StatusType;
  remaining: number;
  /** stun: unused. burn: dps. slow/speedBuff/damageBuff/guard: multiplier. shield: HP left to absorb. taunt: uid of the taunter. */
  value: number;
  source: number;
}

export interface Casting {
  skill: SkillDef;
  remaining: number;
}

export interface Dash {
  skill: SkillDef;
  dir: Vec;
  remaining: number;
  hit: Set<number>;
}

export interface Channel {
  beamId: number;
  remaining: number;
}

export interface FighterStats {
  damageDealt: number;
  damageTaken: number;
  skillsUsed: number;
  hits: number;
  healingDone: number;
}

/** Mutable state behind a fighter's passive. */
export interface PassiveState {
  /** barrier: attacks it can still block. */
  hitsLeft: number;
  /** barrier: seconds until it refills (0 = not recharging). */
  recharge: number;
  /** lastStand: already spent this match. */
  used: boolean;
  /** Attacks already decided this instant (key -> verdict), so a beam's later ticks share the first tick's verdict. */
  decided: Map<string, { blocked: boolean; remaining: number }>;
  /** Triggers since the Simulation last looked, turned into events. */
  procs: PassiveProc[];
  /** marks passive (on the victim): marks currently on this fighter, and seconds until they fade. */
  marks: number;
  markTimer: number;
  /** awakening: meter 0-100, and seconds since this fighter last lost HP. */
  meter: number;
  calm: number;
  /** radiusBonus: seconds left on the enlarged next area skill. */
  boost: number;
}

/** Runtime state of one fighter in a match. Pure data plus small helpers — the Simulation drives it. */
export class Fighter {
  private readonly baseMaxHp: number;
  hp: number;
  /** Fighters start with some energy so the opening seconds aren't dead air. */
  energy = 40;
  readonly maxEnergy = 100;
  /** Ultimate meter, charged by dealing and taking damage. Ultimates spend all of it. */
  ult = 0;
  readonly maxUlt = 100;
  pos: Vec;
  vel: Vec = vec();
  /** Decaying impulse from knockback, separate from AI-chosen velocity. */
  knock: Vec = vec();
  facing = 1;
  cooldowns = new Map<string, number>();
  statuses: Status[] = [];
  casting: Casting | null = null;
  dash: Dash | null = null;
  channel: Channel | null = null;
  form: FormDef | null = null;
  /** Training mode player: infinite energy, can't be hurt, can transform or revert any time. */
  sandbox = false;
  /** Where the training dummy stands when it isn't being knocked around. */
  home: Vec = vec();
  /** Team match: use `def.teamKit` skills, and spawn in `row`. */
  teamMode = false;
  row: 'front' | 'back' = 'front';
  /** The enemy this fighter is concentrating on (chosen by the AI; a taunt overrides it). */
  focus: Fighter | null = null;
  /** Seconds until the default attack can start again. */
  attackCd = 0;
  /** A default attack in its wind-up. Cancelled by stuns and by casting a skill. */
  swing: { remaining: number; finisher: boolean } | null = null;
  /** Index of the next hit in the current combo, and how long until the combo is dropped. */
  combo = 0;
  comboTimer = 0;
  /** Seconds of invulnerability left (transform cinematic). */
  invuln = 0;
  auto: boolean;
  /** Seconds since the player last issued a skill command. */
  idleTime = 0;
  passive: PassiveState;
  stats: FighterStats = { damageDealt: 0, damageTaken: 0, skillsUsed: 0, hits: 0, healingDone: 0 };

  constructor(
    readonly uid: number,
    readonly team: number,
    readonly def: FighterDef,
    readonly controller: Controller,
    pos: Vec,
  ) {
    this.baseMaxHp = def.hp;
    this.hp = def.hp;
    this.pos = pos;
    this.auto = controller === 'ai';
    this.passive = {
      hitsLeft: def.passive.kind === 'barrier' ? def.passive.hits : 0,
      recharge: 0,
      used: false,
      decided: new Map(),
      procs: [],
      marks: 0,
      markTimer: 0,
      meter: 0,
      calm: 0,
      boost: 0,
    };
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get maxHp(): number {
    return Math.round(this.baseMaxHp * (this.form?.maxHpMult ?? 1));
  }

  /** The passive in force: a form can replace it. */
  get passiveDef(): PassiveDef {
    return this.form?.passiveOverride ?? this.def.passive;
  }

  /** The default attack in force: a form can replace it. */
  get attack(): AttackDef {
    return this.form?.attackOverride ?? this.def.attack;
  }

  get transformed(): boolean {
    return this.form !== null;
  }

  skill(slot: SkillSlot): SkillDef {
    if (slot === 4) return this.form?.ultimateOverride ?? this.def.ultimate;
    return this.form?.skillOverrides?.[slot] ?? (this.teamMode ? this.def.teamKit?.[slot] : undefined) ?? this.def.skills[slot];
  }

  /** Uid of whoever has taunted this fighter, if the taunt is active. */
  get tauntedBy(): number | null {
    const s = this.statuses.find((x) => x.type === 'taunt');
    return s ? s.value : null;
  }

  cooldown(skill: SkillDef): number {
    return this.cooldowns.get(skill.id) ?? 0;
  }

  hasStatus(type: StatusType): boolean {
    return this.statuses.some((s) => s.type === type);
  }

  /** Product of every active status of this type (for multipliers). */
  statusMult(type: StatusType): number {
    return this.statuses.reduce((m, s) => (s.type === type ? m * s.value : m), 1);
  }

  get stunned(): boolean {
    return this.hasStatus('stun');
  }

  get swinging(): boolean {
    return this.swing !== null;
  }

  /** Busy fighters cannot start another skill. */
  get busy(): boolean {
    return this.casting !== null || this.dash !== null || this.channel !== null;
  }

  get speed(): number {
    return (
      this.def.speed * (this.form?.speedMult ?? 1) * this.statusMult('speedBuff') * this.statusMult('slow')
    );
  }

  get damageMult(): number {
    return (this.form?.damageMult ?? 1) * this.statusMult('damageBuff') * passiveDamageMult(this);
  }

  get energyRegen(): number {
    return this.def.energyRegen * (this.form?.energyRegenMult ?? 1);
  }

  canAfford(skill: SkillDef): boolean {
    return skill.ultimate ? this.ult >= this.maxUlt : this.energy >= skill.energyCost;
  }

  pay(skill: SkillDef): void {
    if (skill.ultimate) this.ult = 0;
    else this.energy -= skill.energyCost;
  }

  /** True when the transformation is available right now. */
  get canTransform(): boolean {
    const f = this.def.form;
    if (this.sandbox) return !!f && this.alive;
    return (
      !!f &&
      !this.form &&
      this.alive &&
      (this.hp <= this.maxHp * f.hpThreshold || (this.passiveDef.kind === 'awakening' && this.passive.meter >= 100)) &&
      this.energy >= f.energyCost
    );
  }
}

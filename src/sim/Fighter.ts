import type { Controller, FighterDef, FormDef, SkillDef, SkillSlot, Vec } from './types';
import { vec } from './vec';

export type StatusType = 'stun' | 'burn' | 'slow' | 'shield' | 'speedBuff' | 'damageBuff';

export interface Status {
  type: StatusType;
  remaining: number;
  /** stun: unused. burn: dps. slow/speedBuff/damageBuff: multiplier. shield: HP left to absorb. */
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
}

/** Runtime state of one fighter in a match. Pure data plus small helpers — the Simulation drives it. */
export class Fighter {
  readonly maxHp: number;
  hp: number;
  energy = 0;
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
  /** Seconds of invulnerability left (transform cinematic). */
  invuln = 0;
  auto: boolean;
  /** Seconds since the player last issued a skill command. */
  idleTime = 0;
  stats: FighterStats = { damageDealt: 0, damageTaken: 0, skillsUsed: 0, hits: 0 };

  constructor(
    readonly uid: number,
    readonly team: number,
    readonly def: FighterDef,
    readonly controller: Controller,
    pos: Vec,
  ) {
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.pos = pos;
    this.auto = controller === 'ai';
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get transformed(): boolean {
    return this.form !== null;
  }

  skill(slot: SkillSlot): SkillDef {
    if (slot === 4) return this.form?.ultimateOverride ?? this.def.ultimate;
    return this.form?.skillOverrides?.[slot] ?? this.def.skills[slot];
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
    return (this.form?.damageMult ?? 1) * this.statusMult('damageBuff');
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
    return (
      !!f &&
      !this.form &&
      this.alive &&
      this.hp <= this.maxHp * f.hpThreshold &&
      this.energy >= f.energyCost
    );
  }
}

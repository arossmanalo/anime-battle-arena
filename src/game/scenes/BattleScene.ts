import Phaser from 'phaser';
import { TRAINING_DUMMY } from '../../data/dummy';
import { fighterById } from '../../data/fighters';
import type { Fighter } from '../../sim/Fighter';
import { DT, Simulation } from '../../sim/Simulation';
import type { SimEvent, SkillDef } from '../../sim/types';
import { FLOOR_KEY } from '../assets';
import { sfx, type Sfx } from '../audio/Sfx';
import { Announcer } from '../hud/Announcer';
import { Hud } from '../hud/Hud';
import { ROLE_COLOR, ROLE_LABEL, TEAM_COLOR, TacticsBar, TeamHud } from '../hud/TeamHud';
import { mainRole } from '../../sim/roles';
import { SkillBar } from '../hud/SkillBar';
import { TrainingHud } from '../hud/TrainingHud';
import { PlayerController } from '../input/PlayerController';
import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, fitCamera, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../layout';
import { TEAM_ARENAS, type MatchResult, type MatchSetup } from '../match';
import { COLORS, impactStyle, shade, textStyle } from '../theme';
import { FighterView } from '../view/FighterView';
import { Vfx, isSelfAura } from '../view/Vfx';

const INTRO_TIME = 1.9;
/** Seconds of real time to freeze the sim on a hit, by damage. */
const hitstopFor = (dmg: number) => (dmg >= 30 ? 0.09 : dmg >= 15 ? 0.05 : dmg >= 8 ? 0.025 : 0);

export class BattleScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private sim!: Simulation;
  private player?: Fighter;
  /** Team battle: everyone is AI-controlled, there is no player fighter. */
  private teamMode = false;
  /** World container scale (team arenas are bigger than the screen area and drawn scaled down). */
  private worldScale = 1;
  private speedMult = 1;
  private lastVoiceAt = -10;
  private world!: Phaser.GameObjects.Container;
  private ui!: Phaser.GameObjects.Container;
  private fightersLayer!: Phaser.GameObjects.Container;
  private trailLayer!: Phaser.GameObjects.Container;
  private views = new Map<number, FighterView>();
  private vfx!: Vfx;
  private hud!: Hud | TeamHud;
  private bar?: SkillBar;
  private tactics?: TacticsBar;
  private announcer!: Announcer;
  private controller?: PlayerController;
  private trainingHud?: TrainingHud;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private sfx!: Sfx;

  private acc = 0;
  private timeScale = 1;
  private hitstop = 0;
  private introLeft = INTRO_TIME;
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private ending = false;

  constructor() {
    super('Battle');
  }

  init(setup: MatchSetup): void {
    this.setup = setup;
    this.teamMode = !!setup.team;
    this.worldScale = 1;
    this.speedMult = 1;
    this.lastVoiceAt = -10;
    this.player = undefined;
    this.controller = undefined;
    this.bar = undefined;
    this.tactics = undefined;
    this.views = new Map();
    this.acc = 0;
    this.timeScale = 1;
    this.hitstop = 0;
    this.introLeft = INTRO_TIME;
    this.paused = false;
    this.pauseOverlay = undefined;
    this.ending = false;
    this.trainingHud = undefined;
  }

  create(): void {
    const team = this.setup.team;
    this.sim = new Simulation({
      seed: this.setup.seed,
      difficulty: this.setup.difficulty,
      arena: team ? TEAM_ARENAS[team.size] : { width: ARENA_WIDTH, height: ARENA_HEIGHT },
      training: this.setup.training,
      ...(this.setup.training || team ? { idleFallback: 0 } : {}),
      teams: team
        ? [team.player, team.enemy].map((side) => side.map((m) => ({ def: fighterById(m.id), controller: 'ai' as const, row: m.row })))
        : [
            [{ def: fighterById(this.setup.playerId), controller: 'player' }],
            this.setup.training
              ? [{ def: TRAINING_DUMMY, controller: 'dummy' }]
              : [{ def: fighterById(this.setup.enemyId), controller: 'ai' }],
          ],
    });
    this.worldScale = ARENA_WIDTH / this.sim.arena.width;
    this.player = this.sim.fighters.find((f) => f.controller === 'player');
    this.sfx = sfx(this);

    // World (arena space, offset onto the screen) and UI live on separate cameras,
    // so camera zoom/shake moves the arena but never the HUD.
    this.world = this.add.container(ARENA_X, ARENA_Y).setScale(this.worldScale);
    this.ui = this.add.container(0, 0);
    fitCamera(this.cameras.main);
    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH * RENDER_SCALE, GAME_HEIGHT * RENDER_SCALE);
    fitCamera(this.uiCam);
    this.cameras.main.ignore(this.ui);
    this.uiCam.ignore(this.world);

    this.drawArena();
    const floor = this.add.container(0, 0);
    const zones = this.add.container(0, 0);
    this.trailLayer = this.add.container(0, 0);
    this.fightersLayer = this.add.container(0, 0);
    const fx = this.add.container(0, 0);
    this.world.add([floor, zones, this.trailLayer, this.fightersLayer, fx]);

    this.vfx = new Vfx(this, { floor, zones, fx });
    this.vfx.setClock(() => this.sim.time);
    this.vfx.setView(this.sim.arena.width, this.sim.arena.height, this.worldScale, this.teamMode);
    for (const f of this.sim.fighters) {
      const role = mainRole(f.def);
      const teamInfo = this.teamMode ? { color: TEAM_COLOR[f.team], tag: ROLE_LABEL[role], tagColor: ROLE_COLOR[role] } : undefined;
      this.views.set(f.uid, new FighterView(this, f, this.fightersLayer, f === this.player, teamInfo));
    }

    if (this.teamMode) {
      const handlers = {
        onOrder: (order: Partial<import('../../sim/types').TeamOrders>) => this.sim.command({ type: 'order', team: 0, order }),
        onUlt: (uid: number) => this.sim.command({ type: 'castSkill', uid, slot: 4 }),
      };
      this.hud = new TeamHud(this, this.sim, this.ui, handlers);
      this.tactics = new TacticsBar(this, this.sim, this.ui, handlers);
    } else {
      this.hud = new Hud(this, this.sim, this.ui);
      this.bar = new SkillBar(this, this.player!, this.ui, (a) => this.controller!.act(a));
      this.controller = new PlayerController(this, this.sim, this.player!, this.bar);
    }
    this.announcer = new Announcer(this, this.world, this.ui);
    if (this.setup.training) this.setupTraining();

    const hint = this.add
      .text(
        GAME_WIDTH - 8,
        GAME_HEIGHT - 4,
        this.teamMode
          ? 'S speed · 1/2/3 stance · H hold ultimates · X clear orders · M mute · ESC pause'
          : this.setup.training
            ? '1-4 skills · U ultimate · T form · A auto · R reset · C cooldowns · D dummy · M mute · ESC pause'
            : '1-4 skills · U ultimate · T transform · A auto · M mute · ESC pause',
        textStyle(10, COLORS.muted),
      )
      .setOrigin(1, 1);
    this.ui.add(hint);

    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => this.sfx.toggleMute());
    this.input.keyboard?.on('keydown-S', () => {
      if (!this.teamMode) return;
      this.speedMult = this.speedMult === 1 ? 2 : this.speedMult === 2 ? 0.5 : 1;
      this.announcer.banner(`${this.speedMult}x`, COLORS.energy, undefined, 400);
    });
    this.input.keyboard?.on('keydown-Q', () => {
      if (this.paused) this.scene.start(this.teamMode ? 'TeamSelect' : 'CharacterSelect', this.setup);
    });

    this.handleEvents(this.sim.drainEvents()); // intro voice lines
    this.announcer.banner(this.setup.training ? 'TRAINING' : this.teamMode ? `${this.setup.team!.size} v ${this.setup.team!.size}` : 'READY', COLORS.ult, undefined, 700);
    this.time.delayedCall(1100, () => {
      if (!this.setup.training) this.announcer.banner('FIGHT!', 0xff5a3c, undefined, 500);
      this.sfx.play('fight');
    });
  }

  /** Training mode: the stats panel and its keys (R reset, C cooldowns, D dummy motion). */
  private setupTraining(): void {
    const dummy = this.sim.fighters.find((f) => f.controller === 'dummy')!;
    const hud = new TrainingHud(this, this.sim, dummy, this.ui);
    this.trainingHud = hud;
    const kb = this.input.keyboard;
    kb?.on('keydown-R', () => {
      this.sim.resetTraining();
      hud.reset();
      this.announcer.banner('RESET', COLORS.energy, undefined, 400);
    });
    kb?.on('keydown-C', () => {
      this.sim.noCooldowns = !this.sim.noCooldowns;
    });
    kb?.on('keydown-D', () => {
      const modes = ['still', 'pace', 'strafe', 'attack'] as const;
      this.sim.dummyMode = modes[(modes.indexOf(this.sim.dummyMode) + 1) % modes.length];
    });
  }

  private drawArena(): void {
    if (this.textures.exists(FLOOR_KEY)) {
      this.world.add(this.add.tileSprite(0, 0, this.sim.arena.width, this.sim.arena.height, FLOOR_KEY).setOrigin(0));
    }
    const g = this.add.graphics();
    if (!this.textures.exists(FLOOR_KEY)) {
      g.fillStyle(0x3a3e4c).fillRect(0, 0, this.sim.arena.width, this.sim.arena.height);
      // Stone tiles with a little deterministic variation.
      const tile = 46;
      for (let y = 0; y < this.sim.arena.height; y += tile) {
        for (let x = 0; x < this.sim.arena.width; x += tile) {
          const v = ((x * 7 + y * 13) % 5) / 5;
          const w = Math.min(tile, this.sim.arena.width - x) - 2;
          const h = Math.min(tile, this.sim.arena.height - y) - 2;
          g.fillStyle(shade(0x3a3e4c, -0.08 + v * 0.12)).fillRect(x + 1, y + 1, w, h);
        }
      }
    }
    g.lineStyle(2, 0xffffff, 0.08).strokeCircle(this.sim.arena.width / 2, this.sim.arena.height / 2, 70);
    g.lineBetween(this.sim.arena.width / 2, 0, this.sim.arena.width / 2, this.sim.arena.height);
    g.lineStyle(4, 0x6a7090).strokeRect(0, 0, this.sim.arena.width, this.sim.arena.height);
    this.world.add(g);
  }

  private togglePause(): void {
    if (this.ending) return;
    this.paused = !this.paused;
    if (this.paused) {
      const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
      const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'PAUSED', impactStyle(48)).setOrigin(0.5);
      const s = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'ESC resume   ·   Q quit to Character Select', textStyle(14, COLORS.muted))
        .setOrigin(0.5);
      const idle = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 56, this.sim.training ? 'Training: nothing is lost by quitting.' : `If you don't cast for ${this.sim.idleFallback}s, the AI casts for you until you do.`, textStyle(12, COLORS.muted))
        .setOrigin(0.5);
      this.pauseOverlay = this.add.container(0, 0, [bg, t, s, idle]);
      this.ui.add(this.pauseOverlay);
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (this.paused) return;

    if (this.introLeft > 0) {
      this.introLeft -= dt;
      if (this.introLeft <= 0 && this.controller) this.controller.enabled = true;
    } else if (!this.sim.over) {
      if (this.hitstop > 0) this.hitstop -= dt;
      else {
        this.acc += dt * this.timeScale * this.speedMult;
        while (this.acc >= DT && !this.sim.over) {
          this.sim.step();
          this.acc -= DT;
          this.handleEvents(this.sim.drainEvents());
          if (this.hitstop > 0) {
            this.acc = 0;
            break;
          }
        }
      }
    }

    // Sprite animations freeze during hit-stop and slow down with slow motion.
    const animSpeed = this.hitstop > 0 ? 0 : this.timeScale;
    for (const v of this.views.values()) v.update(dt * this.timeScale, this.trailLayer, animSpeed);
    this.fightersLayer.sort('y');
    this.vfx.syncProjectiles(this.sim.projectiles);
    this.vfx.drawBeams(this.sim.beams);
    this.vfx.drawZones(this.sim.zones);
    this.vfx.syncAttached();
    this.hud.update(dt);
    this.trainingHud?.update();
    this.bar?.update();
    this.tactics?.update();
    if (this.teamMode) {
      const o = this.sim.ordersOf(0);
      for (const [uid, v] of this.views) v.setMarker(o.focus === uid ? 'focus' : o.protect === uid ? 'protect' : null);
    }
    this.announcer.update();
  }

  // ---- sim events → presentation -------------------------------------------------------------

  private handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'skillCast': {
          const f = this.sim.fighter(e.uid)!;
          this.vfx.cast(f, e.skill);
          if (e.skill.ultimate) {
            this.announcer.callout(f.pos.x, this.calloutY(f), e.skill.name, e.skill.color, true);
            this.cinematic(f, 0.35, 900, 1.25);
            // The wind-up plays in slow motion, so stretch the charge sound to match.
            this.sfx.play('charge', { duration: e.skill.castTime / 0.35 });
          } else if (!this.teamMode) {
            // With many fighters casting at once, only ultimates get a name callout.
            this.announcer.callout(f.pos.x, this.calloutY(f), e.skill.name, e.skill.color);
          }
          break;
        }
        case 'skillFired': {
          const f = this.sim.fighter(e.uid)!;
          this.playFireSound(e.skill);
          this.vfx.fired(f, e.skill, e.x, e.y);
          if (isSelfAura(e.skill)) {
            this.views.get(e.uid)?.pulse(e.skill.color, e.skill.id);
            if (!this.vfx.hasAnyFx(e.skill.id)) this.vfx.aura(f.pos.x, f.pos.y, e.skill.color);
          }
          if (e.skill.domain) {
            this.announcer.banner('DOMAIN EXPANSION', e.skill.id.startsWith('sukuna') ? 0xff3a4a : 0xb79bff, e.skill.name.toUpperCase(), this.teamMode ? 800 : 1300);
            this.cinematic(f, 0.3, 1100, 1.15);
          }
          if (e.skill.kind === 'beam') this.cameras.main.shake(e.skill.ultimate ? 900 : 400, 0.004);
          break;
        }
        case 'castFailed':
          if (this.player && e.uid === this.player.uid) {
            this.controller?.onCastFailed(e.reason);
            this.sfx.play('fail');
          }
          break;
        case 'hit': {
          this.trainingHud?.onHit(e.target, e.damage, e.skill.name);
          if (e.damage <= 0) break;
          this.views.get(e.target)?.hitFlash();
          this.sfx.play(e.damage >= 15 ? 'hitHeavy' : 'hit');
          this.vfx.damageNumber(e.x, e.y, e.damage, e.skill.color);
          this.hitstop = Math.max(this.hitstop, hitstopFor(e.damage));
          if (e.damage >= 8) this.cameras.main.shake(120 + e.damage * 4, Math.min(0.012, 0.0015 + e.damage * 0.00018));
          break;
        }
        case 'heal': {
          const t = this.sim.fighter(e.uid);
          if (t) this.vfx.healNumber(t.pos.x, t.pos.y, e.amount);
          break;
        }
        case 'impact':
          this.vfx.impact(e.x, e.y, e.radius, e.color, e.skillId, e.support);
          if (e.support && e.skillId && e.uid !== undefined && e.duration) {
            const ally = this.sim.fighter(e.uid);
            if (ally) this.vfx.supportAura(ally, e.skillId, e.duration);
          }
          if (e.radius >= 60) this.sfx.play('explosion');
          break;
        case 'transform': {
          const f = this.sim.fighter(e.uid)!;
          this.views.get(e.uid)?.pulse(e.form.color);
          this.vfx.aura(f.pos.x, f.pos.y, e.form.color);
          this.cameras.main.flash(200, 255, 255, 255);
          this.sfx.play('transform');
          this.announcer.banner(e.form.name.toUpperCase(), e.form.color, f.def.name.toUpperCase(), 1100);
          this.cinematic(f, 0.25, 1200, 1.4);
          break;
        }
        case 'voiceLine': {
          const f = this.sim.fighter(e.uid)!;
          // With many fighters, only let a line through every so often so the subtitles stay readable.
          if (this.teamMode && this.sim.time - this.lastVoiceAt < 1.5) break;
          this.lastVoiceAt = this.sim.time;
          this.announcer.say(f.def.name, e.text, f.def.color);
          break;
        }
        case 'passive': {
          const f = this.sim.fighter(e.uid)!;
          const text = { block: 'BLOCKED', dodge: 'EVADED', lastStand: 'RESOLVE', recharged: `${e.passive.name} READY` }[e.proc];
          this.announcer.callout(f.pos.x, this.calloutY(f), text, f.def.color);
          if (e.proc !== 'recharged') this.vfx.impact(e.x, e.y, 36, f.def.color, e.passive.id);
          if (e.proc === 'lastStand') this.cameras.main.shake(300, 0.008);
          break;
        }
        case 'ko': {
          const f = this.sim.fighter(e.uid)!;
          this.vfx.impact(f.pos.x, f.pos.y, 90, 0xffffff);
          this.sfx.play('ko');
          this.cameras.main.shake(500, 0.012);
          break;
        }
        case 'matchEnd':
          this.endMatch(e.winnerTeam, e.reason);
          break;
      }
    }
  }

  private playFireSound(skill: SkillDef): void {
    switch (skill.kind) {
      case 'projectile':
        this.sfx.play('shoot', { volume: skill.ultimate ? 2 : 1 });
        break;
      case 'beam':
        this.sfx.play('beam', { duration: skill.duration, volume: skill.ultimate ? 1.5 : 1 });
        break;
      case 'dash':
        this.sfx.play('dash');
        break;
      case 'zone':
        this.sfx.play(skill.domain ? 'domain' : 'buff', { volume: 0.7 });
        break;
      case 'buff':
        this.sfx.play('buff');
        break;
      case 'aoe':
        break; // its impact event plays the explosion
    }
  }

  /** Anchor for a skill callout: just above the fighter's head and overhead bar. */
  private calloutY(f: Fighter): number {
    return f.pos.y + (this.views.get(f.uid)?.headY ?? -f.def.radius) + 18;
  }

  /** Slow-motion plus a zoom toward a fighter, then back to normal. */
  private cinematic(f: Fighter, slow: number, durationMs: number, zoom: number): void {
    const cam = this.cameras.main;
    this.tweens.killTweensOf(this);
    // Team battles: many fighters act at once, so cinematics are shorter and gentler.
    if (this.teamMode) {
      slow = Math.max(slow, 0.7);
      durationMs = Math.min(durationMs, 500);
      zoom = 1 + (zoom - 1) * 0.35;
    }
    this.timeScale = slow;
    cam.pan(ARENA_X + f.pos.x * this.worldScale, ARENA_Y + f.pos.y * this.worldScale, 200, 'Sine.easeOut', true);
    cam.zoomTo(zoom * RENDER_SCALE, 200, 'Sine.easeOut', true);
    this.time.delayedCall(durationMs, () => {
      cam.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 300, 'Sine.easeInOut', true);
      cam.zoomTo(RENDER_SCALE, 300, 'Sine.easeInOut', true);
      this.tweens.add({ targets: this, timeScale: 1, duration: 300 });
    });
  }

  private endMatch(winnerTeam: number, reason: 'ko' | 'time'): void {
    this.ending = true;
    if (this.controller) this.controller.enabled = false;
    const winner = this.sim.fighters.find((f) => f.team === winnerTeam);
    this.announcer.banner(reason === 'ko' ? 'K.O.!' : 'TIME UP!', COLORS.danger, undefined, 1000);
    if (winner) this.cinematic(winner, 0.5, 1400, 1.3);
    this.time.delayedCall(1500, () => {
      const text = winner ? (this.teamMode ? (winnerTeam === 0 ? 'YOUR TEAM WINS' : 'ENEMY TEAM WINS') : `${winner.def.name.toUpperCase()} WINS`) : 'DRAW';
      const sub = winner ? (this.teamMode ? (winnerTeam === 0 ? 'VICTORY' : 'DEFEAT') : winner === this.player ? 'VICTORY' : 'DEFEAT') : undefined;
      this.announcer.banner(text, winner ? (this.teamMode ? TEAM_COLOR[winnerTeam] : winner.def.color) : COLORS.muted, sub, 1500);
    });
    this.time.delayedCall(4200, () => {
      const result: MatchResult = {
        setup: this.setup,
        winnerTeam,
        reason,
        duration: this.sim.time,
        fighters: this.sim.fighters.map((f) => ({
          id: f.def.id,
          name: f.def.name,
          color: f.def.color,
          hpLeft: Math.ceil(f.hp),
          maxHp: f.maxHp,
          damageDealt: Math.round(f.stats.damageDealt),
          skillsUsed: f.stats.skillsUsed,
          hits: f.stats.hits,
          transformed: f.transformed,
          team: f.team,
          healing: Math.round(f.stats.healingDone),
        })),
      };
      this.scene.start('Results', result);
    });
  }
}

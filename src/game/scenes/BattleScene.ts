import Phaser from 'phaser';
import { fighterById } from '../../data/fighters';
import type { Fighter } from '../../sim/Fighter';
import { DT, Simulation } from '../../sim/Simulation';
import type { SimEvent, SkillDef } from '../../sim/types';
import { FLOOR_KEY } from '../assets';
import { sfx, type Sfx } from '../audio/Sfx';
import { Announcer } from '../hud/Announcer';
import { Hud } from '../hud/Hud';
import { SkillBar } from '../hud/SkillBar';
import { PlayerController } from '../input/PlayerController';
import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, fitCamera, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../layout';
import type { MatchResult, MatchSetup } from '../match';
import { COLORS, impactStyle, shade, textStyle } from '../theme';
import { FighterView } from '../view/FighterView';
import { Vfx } from '../view/Vfx';

const INTRO_TIME = 1.9;
/** Seconds of real time to freeze the sim on a hit, by damage. */
const hitstopFor = (dmg: number) => (dmg >= 30 ? 0.09 : dmg >= 15 ? 0.05 : dmg >= 8 ? 0.025 : 0);

export class BattleScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private sim!: Simulation;
  private player!: Fighter;
  private world!: Phaser.GameObjects.Container;
  private ui!: Phaser.GameObjects.Container;
  private fightersLayer!: Phaser.GameObjects.Container;
  private trailLayer!: Phaser.GameObjects.Container;
  private views = new Map<number, FighterView>();
  private vfx!: Vfx;
  private hud!: Hud;
  private bar!: SkillBar;
  private announcer!: Announcer;
  private controller!: PlayerController;
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
    this.views = new Map();
    this.acc = 0;
    this.timeScale = 1;
    this.hitstop = 0;
    this.introLeft = INTRO_TIME;
    this.paused = false;
    this.pauseOverlay = undefined;
    this.ending = false;
  }

  create(): void {
    this.sim = new Simulation({
      seed: this.setup.seed,
      difficulty: this.setup.difficulty,
      arena: { width: ARENA_WIDTH, height: ARENA_HEIGHT },
      teams: [
        [{ def: fighterById(this.setup.playerId), controller: 'player' }],
        [{ def: fighterById(this.setup.enemyId), controller: 'ai' }],
      ],
    });
    this.player = this.sim.fighters.find((f) => f.controller === 'player')!;
    this.sfx = sfx(this);

    // World (arena space, offset onto the screen) and UI live on separate cameras,
    // so camera zoom/shake moves the arena but never the HUD.
    this.world = this.add.container(ARENA_X, ARENA_Y);
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
    for (const f of this.sim.fighters) {
      this.views.set(f.uid, new FighterView(this, f, this.fightersLayer, f === this.player));
    }

    this.hud = new Hud(this, this.sim, this.ui);
    this.bar = new SkillBar(this, this.player, this.ui, (a) => this.controller.act(a));
    this.controller = new PlayerController(this, this.sim, this.player, this.bar);
    this.announcer = new Announcer(this, this.world, this.ui);

    const hint = this.add
      .text(GAME_WIDTH - 8, GAME_HEIGHT - 4, '1-4 skills · U ultimate · T transform · A auto · M mute · ESC pause', textStyle(10, COLORS.muted))
      .setOrigin(1, 1);
    this.ui.add(hint);

    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => this.sfx.toggleMute());
    this.input.keyboard?.on('keydown-Q', () => {
      if (this.paused) this.scene.start('CharacterSelect', this.setup);
    });

    this.handleEvents(this.sim.drainEvents()); // intro voice lines
    this.announcer.banner('READY', COLORS.ult, undefined, 700);
    this.time.delayedCall(1100, () => {
      this.announcer.banner('FIGHT!', 0xff5a3c, undefined, 500);
      this.sfx.play('fight');
    });
  }

  private drawArena(): void {
    if (this.textures.exists(FLOOR_KEY)) {
      this.world.add(this.add.tileSprite(0, 0, ARENA_WIDTH, ARENA_HEIGHT, FLOOR_KEY).setOrigin(0));
    }
    const g = this.add.graphics();
    if (!this.textures.exists(FLOOR_KEY)) {
      g.fillStyle(0x3a3e4c).fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
      // Stone tiles with a little deterministic variation.
      const tile = 46;
      for (let y = 0; y < ARENA_HEIGHT; y += tile) {
        for (let x = 0; x < ARENA_WIDTH; x += tile) {
          const v = ((x * 7 + y * 13) % 5) / 5;
          const w = Math.min(tile, ARENA_WIDTH - x) - 2;
          const h = Math.min(tile, ARENA_HEIGHT - y) - 2;
          g.fillStyle(shade(0x3a3e4c, -0.08 + v * 0.12)).fillRect(x + 1, y + 1, w, h);
        }
      }
    }
    g.lineStyle(2, 0xffffff, 0.08).strokeCircle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 70);
    g.lineBetween(ARENA_WIDTH / 2, 0, ARENA_WIDTH / 2, ARENA_HEIGHT);
    g.lineStyle(4, 0x6a7090).strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
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
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 56, `If you don't cast for ${this.sim.idleFallback}s, the AI casts for you until you do.`, textStyle(12, COLORS.muted))
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
      if (this.introLeft <= 0) this.controller.enabled = true;
    } else if (!this.sim.over) {
      if (this.hitstop > 0) this.hitstop -= dt;
      else {
        this.acc += dt * this.timeScale;
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
    this.bar.update();
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
          } else {
            this.announcer.callout(f.pos.x, this.calloutY(f), e.skill.name, e.skill.color);
          }
          break;
        }
        case 'skillFired': {
          const f = this.sim.fighter(e.uid)!;
          this.playFireSound(e.skill);
          this.vfx.fired(f, e.skill, e.x, e.y);
          if (e.skill.kind === 'buff') {
            this.views.get(e.uid)?.pulse(e.skill.color);
            if (!this.vfx.hasFx(e.skill.id, 'body')) this.vfx.aura(f.pos.x, f.pos.y, e.skill.color);
          }
          if (e.skill.domain) {
            this.announcer.banner('DOMAIN EXPANSION', 0xb79bff, e.skill.name.toUpperCase(), 1300);
            this.cinematic(f, 0.3, 1100, 1.15);
          }
          if (e.skill.kind === 'beam') this.cameras.main.shake(e.skill.ultimate ? 900 : 400, 0.004);
          break;
        }
        case 'castFailed':
          if (e.uid === this.player.uid) {
            this.controller.onCastFailed(e.reason);
            this.sfx.play('fail');
          }
          break;
        case 'hit': {
          if (e.damage <= 0) break;
          this.views.get(e.target)?.hitFlash();
          this.sfx.play(e.damage >= 15 ? 'hitHeavy' : 'hit');
          this.vfx.damageNumber(e.x, e.y, e.damage, e.skill.color);
          this.hitstop = Math.max(this.hitstop, hitstopFor(e.damage));
          if (e.damage >= 8) this.cameras.main.shake(120 + e.damage * 4, Math.min(0.012, 0.0015 + e.damage * 0.00018));
          break;
        }
        case 'impact':
          this.vfx.impact(e.x, e.y, e.radius, e.color, e.skillId);
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
    this.timeScale = slow;
    cam.pan(ARENA_X + f.pos.x, ARENA_Y + f.pos.y, 200, 'Sine.easeOut', true);
    cam.zoomTo(zoom * RENDER_SCALE, 200, 'Sine.easeOut', true);
    this.time.delayedCall(durationMs, () => {
      cam.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 300, 'Sine.easeInOut', true);
      cam.zoomTo(RENDER_SCALE, 300, 'Sine.easeInOut', true);
      this.tweens.add({ targets: this, timeScale: 1, duration: 300 });
    });
  }

  private endMatch(winnerTeam: number, reason: 'ko' | 'time'): void {
    this.ending = true;
    this.controller.enabled = false;
    const winner = this.sim.fighters.find((f) => f.team === winnerTeam);
    this.announcer.banner(reason === 'ko' ? 'K.O.!' : 'TIME UP!', COLORS.danger, undefined, 1000);
    if (winner) this.cinematic(winner, 0.5, 1400, 1.3);
    this.time.delayedCall(1500, () => {
      const text = winner ? `${winner.def.name.toUpperCase()} WINS` : 'DRAW';
      const sub = winner ? (winner === this.player ? 'VICTORY' : 'DEFEAT') : undefined;
      this.announcer.banner(text, winner ? winner.def.color : COLORS.muted, sub, 1500);
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
        })),
      };
      this.scene.start('Results', result);
    });
  }
}

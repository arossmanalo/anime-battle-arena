import Phaser from 'phaser';
import { ARENA_HEIGHT, ARENA_X, ARENA_Y, GAME_WIDTH } from '../layout';
import { COLORS, hex, impactStyle, shade, textStyle } from '../theme';

const SUBTITLE_TIME = 2400;

/** Skill-name callouts, big centre banners and character subtitles. */
export class Announcer {
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly queue: { speaker: string; text: string; color: number }[] = [];
  private showingUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: Phaser.GameObjects.Container,
    private readonly ui: Phaser.GameObjects.Container,
  ) {
    this.subtitle = scene.add
      .text(ARENA_X + 14, ARENA_Y + ARENA_HEIGHT - 12, '', {
        ...textStyle(16, COLORS.subtitle, { fontStyle: 'bold italic', wordWrap: { width: 560 } }),
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 1);
    ui.add(this.subtitle);
  }

  /** Skill name popping above a fighter, in arena space. */
  callout(x: number, y: number, text: string, color: number, big = false): void {
    const t = this.scene.add
      .text(x, y - 40, `${text.toUpperCase()}!`, impactStyle(big ? 30 : 18, 0xffffff, shade(color, -0.5)))
      .setOrigin(0.5)
      .setDepth(20_000)
      .setScale(0.4);
    t.setShadow(0, 0, hex(color), 12, true, true);
    this.world.add(t);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.15, duration: 110, ease: 'Back.out' },
        { scale: 1, duration: 80 },
        { y: t.y - 22, alpha: 0, delay: big ? 900 : 450, duration: 350 },
      ],
      onComplete: () => t.destroy(),
    });
  }

  /** Large centred banner (READY / FIGHT / K.O. / ultimate names). */
  banner(text: string, color: number, sub?: string, hold = 900): void {
    const y = ARENA_Y + ARENA_HEIGHT / 2 - 20;
    const t = this.scene.add.text(GAME_WIDTH / 2, y, text, impactStyle(58, color, 0x000000)).setOrigin(0.5).setScale(2.2).setAlpha(0);
    t.setShadow(0, 0, hex(color), 18, true, true);
    this.ui.add(t);
    const parts: Phaser.GameObjects.Text[] = [t];
    if (sub) {
      const s = this.scene.add.text(GAME_WIDTH / 2, y + 46, sub, impactStyle(20, 0xffffff)).setOrigin(0.5).setAlpha(0);
      this.ui.add(s);
      parts.push(s);
    }
    this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.out' });
    if (sub) this.scene.tweens.add({ targets: parts[1], alpha: 1, delay: 120, duration: 200 });
    this.scene.tweens.add({
      targets: parts,
      alpha: 0,
      delay: hold,
      duration: 300,
      onComplete: () => parts.forEach((p) => p.destroy()),
    });
  }

  say(speaker: string, text: string, color: number): void {
    this.queue.push({ speaker, text, color });
  }

  update(): void {
    const now = this.scene.time.now;
    if (now < this.showingUntil) return;
    const next = this.queue.shift();
    if (!next) {
      if (this.subtitle.text) this.subtitle.setText('');
      return;
    }
    this.subtitle.setText(`${next.speaker}: "${next.text}"`).setAlpha(0);
    this.scene.tweens.add({ targets: this.subtitle, alpha: 1, duration: 150 });
    this.showingUntil = now + SUBTITLE_TIME;
    // Drop stale lines so subtitles never lag far behind the action.
    if (this.queue.length > 2) this.queue.splice(0, this.queue.length - 2);
  }
}

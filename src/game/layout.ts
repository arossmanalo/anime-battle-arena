/** Screen layout shared by the scenes. The sim works in arena space; the arena is drawn at ARENA_X/Y. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const ARENA_X = 30;
export const ARENA_Y = 78;
export const ARENA_WIDTH = 900;
export const ARENA_HEIGHT = 372;

/**
 * Scenes are laid out in GAME_WIDTH x GAME_HEIGHT units, but the canvas is RENDER_SCALE times bigger
 * so text and shapes stay sharp when the browser scales the game up to a large or high-DPI screen.
 * Picked once at startup from the window size and pixel density (1x-4x).
 */
export const RENDER_SCALE = (() => {
  if (typeof window === 'undefined') return 1;
  const fit = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  const screenFit = Math.min(window.screen.width / GAME_WIDTH, window.screen.height / GAME_HEIGHT);
  // Use the larger of window and screen fit so going fullscreen later still looks sharp.
  return Math.min(4, Math.max(1, Math.ceil(Math.max(fit, screenFit) * (window.devicePixelRatio || 1))));
})();

/** Points a camera at the layout space, zoomed to the render scale. */
export function fitCamera(cam: { setZoom(z: number): unknown; centerOn(x: number, y: number): unknown }): void {
  cam.setZoom(RENDER_SCALE);
  cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

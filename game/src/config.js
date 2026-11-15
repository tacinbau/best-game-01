// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The lantern-keeper who walks the garden floor. */
export const KEEPER = {
  width: 56,
  height: 76,
  speed: 640,
  invulnerable: 1.5,
};

export const LIVES = 3;

/** A drifting ember-spirit: catch it in the lantern. */
export const EMBER = {
  size: 22,
  speed: 165,
  speedPerLevel: 14,
  interval: 0.85,
  intervalScale: 0.92,
  minInterval: 0.38,
  points: 10,
};

/** A rare golden ember, worth more and falling faster. */
export const GOLDEN = {
  size: 27,
  speed: 215,
  chance: 0.12,
  points: 25,
};

/** A shadow-moth: touching one costs a life. Dodging one past the ground scores a point. */
export const MOTH = {
  width: 54,
  height: 30,
  speed: 250,
  speedPerLevel: 22,
  interval: 1.7,
  intervalScale: 0.9,
  minInterval: 0.7,
  dodgePoints: 1,
};

/** Five lanterns light the garden: each level has a quota of embers to gather. Lighting the
 * fifth lantern wins the game. */
export const LEVEL = {
  max: 5,
  baseQuota: 8,
  quotaPerLevel: 3,
  bonus: 50,
  bannerSeconds: 2.2,
};

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 72;

/** The night-garden palette: deep indigo sky, warm lantern gold, ember orange. */
export const PALETTE = {
  backdrop: '#0a0e24',
  skyTop: '#131a3d',
  skyBottom: '#2c3a5e',
  moon: '#f5e9c8',
  hillFar: '#1c2745',
  hillNear: '#16213a',
  ground: '#16241a',
  grass: '#2c4a2e',
  grassDark: '#1e3320',
  keeperCloak: '#35c4a8',
  keeperCloakDark: '#1f8a76',
  keeperFace: '#ffe9b8',
  lanternGlow: '#ffc46b',
  lanternLit: '#ffd98a',
  lanternUnlit: '#3d4a7a',
  ember: '#ffb347',
  emberCore: '#fff3c4',
  golden: '#ffe066',
  mothWing: '#6b5aa8',
  mothBody: '#3a3160',
  mothEye: '#ff5a5a',
  panel: '#1a2140',
  panelBorder: '#3d4a7a',
  text: '#f2ead8',
  muted: '#9aa5c4',
  danger: '#ff6b6b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberlight-keeper.best';

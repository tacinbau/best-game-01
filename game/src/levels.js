// Groups run sequentially: delay before a group, interval between spawns.
const group = (type, count, interval, delay = 1) => Object.freeze({ type, count, interval, delay });
const wave = (bonus, ...groups) => Object.freeze({ bonus, groups: Object.freeze(groups) });
export const WAVES = Object.freeze([
  wave(25, group('skitter', 8, 1.05, 2)),
  wave(30, group('skitter', 14, 0.75)),
  wave(35, group('skitter', 10, 0.65), group('shellback', 5, 1.2)),
  wave(40, group('skitter', 18, 0.42), group('shellback', 8, 0.9)),
  wave(45, group('shellback', 8, 0.85), group('spitter', 8, 0.9), group('skitter', 12, 0.38)),
  wave(50, group('skitter', 26, 0.32), group('spitter', 10, 0.7), group('shellback', 10, 0.7)),
  wave(55, group('shellback', 15, 0.6), group('spitter', 14, 0.6), group('skitter', 24, 0.28)),
  wave(60, group('skitter', 30, 0.25), group('shellback', 20, 0.5), group('spitter', 18, 0.5)),
  wave(65, group('shellback', 24, 0.42), group('skitter', 36, 0.22), group('spitter', 24, 0.42)),
  wave(100, group('shellback', 10, 0.6), group('leviathan', 1, 1, 1.5),
    group('spitter', 20, 0.5, 0.5), group('shellback', 18, 0.5), group('skitter', 30, 0.25)),
]);

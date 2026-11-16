import { cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
// Prevent copying a tree into itself or overwriting the working source.
if (output === resolve(source) || resolve(source).startsWith(output + sep) ||
    output.startsWith(resolve(source, 'game') + sep) || output === resolve(source, 'game') ||
    output.startsWith(resolve(source, 'screenshots') + sep) || output === resolve(source, 'screenshots')) {
  throw new Error('MAKEFUN_OUTPUT_DIR must be separate from the source trees.');
}
for (const name of ['game', 'screenshots']) {
  if (!existsSync(resolve(source, name))) {
    throw new Error(`Missing ${name}/. Complete the game and capture screenshots before packaging.`);
  }
}
mkdirSync(output, { recursive: true });
for (const name of ['game', 'screenshots']) {
  cpSync(resolve(source, name), resolve(output, name), { recursive: true, force: true });
}
writeFileSync(resolve(output, 'dossier.json'), buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
}));
console.log(`TIDEGATE packaged in ${output}`);

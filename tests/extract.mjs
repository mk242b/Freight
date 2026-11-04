import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const match = html.match(/<script id="game">([\s\S]*?)<\/script>/);

if (!match) throw new Error('Inline game script not found in index.html');

const sandbox = { window: {}, console };
vm.runInNewContext(match[1], sandbox, { filename: 'index.html#game' });

if (!sandbox.window.FreightLogic) {
  throw new Error('FreightLogic was not exposed by the game script');
}

export const Logic = sandbox.window.FreightLogic;

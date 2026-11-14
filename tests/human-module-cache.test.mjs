import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('le joueur et les piétons partagent la même version du module humain', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const crowd = await readFile(new URL('../assets/npc/crowd.js', import.meta.url), 'utf8');
  const versions = [...html.matchAll(/import\('\.\/assets\/characters\/human\.js\?v=([^']+)'\)/g)].map(m => m[1]);
  const visitor = crowd.match(/from "\.\.\/characters\/human\.js\?v=([^"]+)"/);
  assert.equal(versions.length, 2);
  assert.ok(visitor);
  assert.ok(versions.every(version => version === visitor[1]));
  assert.match(html, /import\('\.\/assets\/npc\/crowd\.js\?v=[^']+'\)/);
});

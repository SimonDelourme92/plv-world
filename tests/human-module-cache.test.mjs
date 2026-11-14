import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('les visiteurs utilisent des modèles animés distincts et ne réutilisent pas le joueur', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const crowd = await readFile(new URL('../assets/npc/crowd.js', import.meta.url), 'utf8');
  assert.match(html, /import\('\.\/assets\/npc\/crowd\.js\?v=[^']+'\)/);
  assert.match(crowd, /\["maya", "sam", "harper", "jordan"\]/);
  assert.doesNotMatch(crowd, /cloneHuman|InstancedMesh|BoxGeometry|SphereGeometry/);
  for (const name of ['maya', 'harper', 'jordan']) {
    const glb = await readFile(new URL(`../assets/npc/models/${name}.glb`, import.meta.url));
    assert.equal(glb.toString('ascii', 0, 4), 'glTF');
    const jsonLength = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
    assert.ok(gltf.skins?.length && gltf.animations?.length, `${name} doit être articulé et animé`);
  }
});

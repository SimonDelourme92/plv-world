import test from 'node:test';
import assert from 'node:assert/strict';
import { riverbedHeight } from '../assets/river/riverbed.js';
import { WATER_LEVEL } from '../assets/river/water.js';
test('l\'eau remplit la rivière et le lac, jamais la pelouse', () => {
  assert.ok(WATER_LEVEL < 0);
  assert.ok(riverbedHeight(-440, -450) < WATER_LEVEL);   // rivière
  assert.ok(riverbedHeight(-325, 375) < WATER_LEVEL);    // lac
  assert.ok(riverbedHeight(50, 50) > WATER_LEVEL);       // pelouse
  assert.ok(riverbedHeight(-50, 375) > WATER_LEVEL);     // hors du lac
});

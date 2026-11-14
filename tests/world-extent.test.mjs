import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayableHalf } from '../assets/world/extent.js';
test('starts at one kilometre and expands to keep distant inventory accessible', () => {
  const position = { x: 50, z: 69 };
  assert.equal(calculatePlayableHalf([], position), 500);
  const lots = [{ bounds: { min: { x: 700, z: -100 }, max: { x: 760, z: 0 } } }];
  assert.equal(calculatePlayableHalf(lots, position), 900);
  assert.equal(calculatePlayableHalf(lots, { x: 990, z: 0 }), 1000);
});

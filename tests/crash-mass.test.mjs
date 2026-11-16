import test from 'node:test';
import assert from 'node:assert/strict';
import { CAR_MASS, plvMass } from '../assets/crash/crash.js';

test('PLV vides : quelques kilos face à une voiture de 1,5 t', () => {
  const colonne = plvMass({ hx: 0.2, hy: 0.85, hz: 0.2 }), stopPile = plvMass({ hx: 0.15, hy: 0.15, hz: 0.1 });
  assert.ok(colonne > 2 && colonne < 5, 'colonne ' + colonne);
  assert.ok(stopPile >= 0.2 && stopPile < 0.5);
  // traverser une rangée de 20 colonnes ne coûte que quelques % de vitesse
  const keep20 = CAR_MASS / (CAR_MASS + 20 * colonne);
  assert.ok(keep20 > 0.95, 'rangée de 20 : ' + keep20);
  // même 300 colonnes ne stoppent pas la voiture
  assert.ok(CAR_MASS / (CAR_MASS + 300 * colonne) > 0.55);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { riverbedHeight } from '../assets/river/riverbed.js';
test('le lit est creusé, déterministe, et la pelouse éloignée reste plate',()=>{
  assert.ok(riverbedHeight(-440,-450)<-3);
  assert.equal(riverbedHeight(-440,-450),riverbedHeight(-440,-450));
  assert.equal(riverbedHeight(50,50),0);
  assert.equal(riverbedHeight(0,-450),0);
});
test('une emprise PLV existante ou future demeure horizontale',()=>{
  const lot={min:{x:-445,z:-455},max:{x:-435,z:-445}};
  assert.equal(riverbedHeight(-440,-450,[lot]),0);
  assert.ok(riverbedHeight(-440,-450)<0);
  assert.ok(riverbedHeight(-420,-450,[lot])<=0);
});

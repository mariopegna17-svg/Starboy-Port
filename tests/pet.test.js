import test from 'node:test';
import assert from 'node:assert/strict';
import { createPet,restorePet,advance,mood,action,equip,encounter,STORAGE_KEY } from '../public/js/pet.js';

test('los 400 estilos se pueden equipar y los datos inválidos no alteran la mascota',()=>{
  const p=createPet(1000,()=>.5);for(let shape=0;shape<4;shape++)for(let palette=0;palette<100;palette++)assert.equal(equip(p,palette,shape),true);
  assert.equal(p.collection.length,400);const look=[p.palette,p.shape];assert.equal(equip(p,100,0),false);assert.deepEqual([p.palette,p.shape],look);
});
test('cerrar y restaurar conserva identidad, recuerdos y ojos, y aplica el tiempo pasado',()=>{
  const p=createPet(1000,()=>.4);action(p,'feed',1000);const raw=JSON.stringify(p),restored=restorePet(raw,3601000);
  assert.equal(restored.id,p.id);assert.equal(restored.palette,p.palette);assert.deepEqual(restored.memory,p.memory);assert.ok(restored.hunger<p.hunger);assert.ok(restored.energy<p.energy);assert.equal(restored.effect,null);assert.equal(STORAGE_KEY,'starboy.pet.v1');
});
test('dormir recupera energía; ruido, frío y sacudidas cambian su comportamiento',()=>{
  const p=createPet(1000,()=>.2);p.energy=40;action(p,'sleep',1000);advance(p,3601000);assert.ok(p.energy>40);assert.equal(mood(p,3601000),'asleep');
  action(p,'sleep',3601000);p.environment.temperature=5;assert.equal(mood(p,3601000),'cold');p.environment.temperature=22;p.environment.noise=90;assert.equal(mood(p,3601000),'anxious');action(p,'shake',3601000);assert.equal(mood(p,3601000),'dizzy');advance(p,3611000);assert.equal(mood(p,3611000),'angry');advance(p,3616000);assert.equal(mood(p,3616000),'anxious');
});
test('los encuentros desbloquean los ojos del amigo y mantienen la identidad propia',()=>{
  const p=createPet(1000,()=>.2),friend=createPet(1000,()=>.8);const own=p.id;
  assert.equal(encounter(p,friend,2000),true);assert.equal(p.id,own);assert.ok(p.collection.includes(`${friend.shape}-${friend.palette}`));assert.ok(p.behaviors.includes(friend.trait));assert.equal(p.encounters,1);
  assert.equal(encounter(p,p),false);assert.equal(encounter(p,{id:'invalid',palette:999,shape:0}),false);
});
test('archivos dañados o con estadísticas inválidas se rechazan',()=>{
  assert.equal(restorePet('broken'),null);const p=createPet();p.energy='full';assert.equal(restorePet(JSON.stringify(p)),null);
});

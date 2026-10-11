import test from 'node:test';
import assert from 'node:assert/strict';
import { FirstBoot, FIRST_BOOT_KEY } from '../public/js/first-boot.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('el primer encendido se reproduce una vez y no se repite en otra sesión', async () => {
  const saved = storage();
  let plays = 0;
  const animation = async () => { plays++; return true; };
  assert.equal(await new FirstBoot(saved).play(animation), true);
  assert.equal(saved.getItem(FIRST_BOOT_KEY), 'complete');
  assert.equal(await new FirstBoot(saved).play(animation), false);
  assert.equal(plays, 1);
});

test('una animación ausente, fallida o interrumpida no se marca como vista', async () => {
  const saved = storage(), boot = new FirstBoot(saved);
  assert.equal(await boot.play(), false);
  assert.equal(await boot.play(async () => false), false);
  await assert.rejects(boot.play(async () => { throw new Error('interrupted'); }));
  assert.equal(saved.getItem(FIRST_BOOT_KEY), null);
  assert.equal(await boot.play(async () => true), true);
});

test('dos solicitudes simultáneas de esta página comparten una sola reproducción', async () => {
  const saved = storage(), boot = new FirstBoot(saved);
  let finish, plays = 0;
  const animation = () => { plays++; return new Promise(resolve => { finish = resolve; }); };
  const a = boot.play(animation), b = boot.play(animation);
  assert.equal(plays, 1);
  finish(true);
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  assert.equal(await boot.play(animation), false);
});

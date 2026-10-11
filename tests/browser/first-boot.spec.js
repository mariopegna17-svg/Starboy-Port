import {test,expect} from '@playwright/test';

const KEY='starboy.first-boot.v1';
async function ready(page){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.starboy?.bootSequence.data))).toBe(true);
}
async function watched(page){return page.evaluate(key=>localStorage.getItem(key),KEY);}
async function finish(page){
  const remaining=await page.evaluate(()=>window.starboy.bootSequence.data.duration-window.starboy.bootSequence.elapsed);
  await page.clock.runFor(Math.ceil(remaining)+100);
  await expect.poll(()=>watched(page)).toBe('complete');
}

test('el encendido real termina antes de la bienvenida y no se repite al recargar, importar o reiniciar',async({page})=>{
  await page.clock.install();await page.goto('/');await ready(page);
  await expect(page.locator('#first-boot-screen')).toBeVisible();await expect(page.locator('#welcome')).not.toBeVisible();
  await expect(page.locator('#first-boot-screen')).toHaveAttribute('data-phase','seed');
  const pink=await page.evaluate(()=>[...document.querySelector('#boot-animation').getContext('2d').getImageData(200,200,1,1).data]);
  expect(pink[0]).toBeGreaterThan(200);expect(pink[1]).toBeGreaterThan(140);expect(await watched(page)).toBeNull();
  await page.clock.runFor(15500);await expect(page.locator('#first-boot-screen')).toHaveAttribute('data-phase','birth');expect(await watched(page)).toBeNull();
  await page.clock.runFor(15000);await expect(page.locator('#first-boot-screen')).toHaveAttribute('data-phase','eyes');expect(await watched(page)).toBeNull();
  await finish(page);await page.clock.resume();await expect(page.locator('#first-boot-screen')).not.toBeVisible();await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('#hatch').click();const backup=await page.evaluate(()=>JSON.stringify(window.starboy.pet));
  await page.reload();await expect.poll(()=>page.evaluate(()=>Boolean(window.starboy?.firstBoot.completed))).toBe(true);
  await expect(page.locator('#first-boot-screen')).not.toBeVisible();await expect(page.locator('#welcome')).not.toBeVisible();
  await page.locator('.dock [data-panel="settings"]').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#reset-pet').click();
  await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#first-boot-screen')).not.toBeVisible();await page.locator('#hatch').click();
  await page.locator('.dock [data-panel="settings"]').click();page.once('dialog',dialog=>dialog.accept());
  await page.locator('#import-pet').setInputFiles({name:'mi-starboy.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  expect(await watched(page)).toBe('complete');await expect(page.locator('#first-boot-screen')).not.toBeVisible();
});

test('cerrar a mitad del encendido deja la reproducción pendiente al volver',async({page})=>{
  await page.clock.install();await page.goto('/');await ready(page);await page.clock.runFor(6000);
  expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeGreaterThan(5000);expect(await watched(page)).toBeNull();
  await page.reload();await ready(page);await expect(page.locator('#first-boot-screen')).toHaveAttribute('data-phase','seed');
  expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeLessThan(1000);expect(await watched(page)).toBeNull();
  await expect(page.locator('#welcome')).not.toBeVisible();
});

test('la animación espera a la orientación elegida y pausa al ocultar la página',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.clock.install();await page.goto('/');await ready(page);
  await page.clock.runFor(12000);expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBe(0);expect(await watched(page)).toBeNull();
  await page.setViewportSize({width:844,height:390});await page.clock.runFor(5000);
  const before=await page.evaluate(()=>window.starboy.bootSequence.elapsed);expect(before).toBeGreaterThan(4000);
  await page.setViewportSize({width:390,height:844});await page.clock.runFor(15000);
  expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeLessThan(before+200);expect(await watched(page)).toBeNull();
  await page.clock.resume();await page.locator('#portrait-continue').click();await page.clock.runFor(1000);
  const visible=await page.evaluate(()=>window.starboy.bootSequence.elapsed);
  // Emulate the browser visibility event; Chromium headless tabs stay visible.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(20000);expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeLessThan(visible+200);
  await expect(page.locator('#welcome')).not.toBeVisible();
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(1000);
  expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeGreaterThan(visible+800);expect(await watched(page)).toBeNull();
});

test('el primer encendido puede terminar sin conexión desde la caché de la PWA',async({page,context})=>{
  await page.clock.install();await page.goto('/');await ready(page);await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();await ready(page);
  await expect(page.locator('#eyes')).toHaveAttribute('data-engine','original');await finish(page);
  await expect(page.locator('#welcome')).toBeVisible();expect(await watched(page)).toBe('complete');
});

test('un error al cargar la secuencia permite entrar y no guarda una marca falsa',async({page})=>{
  await page.route('**/boot/sequence.json',route=>route.fulfill({status:404,body:'Not found'}));
  await page.goto('/');await expect(page.locator('#welcome')).toBeVisible();expect(await watched(page)).toBeNull();
  await expect(page.locator('#first-boot-screen')).not.toBeVisible();
  await page.unroute('**/boot/sequence.json');await page.reload();await ready(page);await expect(page.locator('#first-boot-screen')).toBeVisible();expect(await watched(page)).toBeNull();
});

test('una pestaña oculta libera el encendido para otra y conserva su progreso',async({page,context})=>{
  await page.clock.install();await page.goto('/');await ready(page);await page.clock.runFor(1000);
  const progress=await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));return window.starboy.bootSequence.elapsed;});
  await expect.poll(()=>page.evaluate(()=>window.starboy.firstBoot.running===null)).toBe(true);
  const other=await context.newPage();await other.goto('/');await ready(other);
  await page.clock.runFor(1000);expect(await other.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeGreaterThan(800);
  expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBe(progress);
  await other.close();await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(1000);expect(await page.evaluate(()=>window.starboy.bootSequence.elapsed)).toBeGreaterThan(progress+800);expect(await watched(page)).toBeNull();
});

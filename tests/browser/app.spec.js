import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function hatch(page){await page.goto('/');await page.waitForFunction(()=>window.starboy);await page.locator('#first-name').fill('Cosmo');await page.locator('#hatch').click();await expect(page.locator('#welcome')).not.toBeVisible();}
async function open(page,name){await page.locator(`.dock [data-panel="${name}"]`).click();}

test('iPhone horizontal: ojos originales, 400 opciones, cuidados, ambiente y persistencia',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await hatch(page);await expect(page.locator('#eyes')).toHaveAttribute('data-engine','original');await expect(page.locator('#pet-name')).toHaveText('Cosmo');
  await open(page,'eyes');await expect(page.locator('.eye-card')).toHaveCount(100);for(const shape of [0,1,2,3]){await page.locator(`#shape-tabs [data-shape="${shape}"]`).click();await expect(page.locator('.eye-card')).toHaveCount(100);}
  await page.locator('#eye-search').fill('matcha');await expect(page.locator('.eye-card')).toHaveCount(1);await page.locator('.eye-card').click();await expect(page.locator('#current-look')).toContainText('matcha');await page.locator('#close-panel').click();
  await open(page,'environment');await page.locator('#temperature').fill('4');await expect(page.locator('#mood-label')).toHaveText('Tengo frío');await page.locator('#temperature').fill('22');await page.locator('#noise').fill('100');await expect(page.locator('#mood-label')).toHaveText('Nervioso');await page.locator('#noise').fill('0');await page.locator('[data-action="shake"]').click();await expect(page.locator('#mood-label')).toHaveText('Mareado');
  await page.locator('.panel-nav [data-panel="care"]').click();await page.locator('[data-action="sleep"]').click();await expect(page.locator('#mood-label')).toHaveText('Soñando');await page.locator('[data-action="sleep"]').click();await page.locator('[data-action="feed"]').click();await expect(page.locator('#mood-label')).toHaveText('Feliz');await page.reload();await page.waitForFunction(()=>window.starboy);await expect(page.locator('#pet-name')).toHaveText('Cosmo');expect(await page.evaluate(()=>window.starboy.pet.palette)).toBe(1);expect(errors).toEqual([]);
});

test('la mascota funciona sin conexión después de instalar el shell de la PWA',async({page,context})=>{
  await hatch(page);await page.waitForFunction(()=>navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.starboy);await expect(page.locator('#eyes')).toHaveAttribute('data-engine','original');await expect(page.locator('#pet-name')).toHaveText('Cosmo');await open(page,'care');await page.locator('[data-action="pet"]').click();await expect(page.locator('#mood-label')).toHaveText('Querido');
});

test('autoguardar antes de conocer a la mascota no omite la bienvenida al volver',async({page})=>{
  await page.clock.install();await page.goto('/');await page.waitForFunction(()=>window.starboy);await expect(page.locator('#welcome')).toBeVisible();await page.clock.fastForward(11000);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('starboy.pet.v1')).hatched)).toBe(false);
  await page.reload();await page.waitForFunction(()=>window.starboy);await expect(page.locator('#welcome')).toBeVisible();await page.locator('#hatch').click();await page.reload();await page.waitForFunction(()=>window.starboy);await expect(page.locator('#welcome')).not.toBeVisible();
});

test('completar una secuencia inicial persiste al recargar y al crear otra mascota',async({page})=>{
  await hatch(page);expect(await page.evaluate(()=>window.starboy.firstBoot.play(async()=>true))).toBe(true);
  await page.reload();await page.waitForFunction(()=>window.starboy);expect(await page.evaluate(()=>window.starboy.firstBoot.completed)).toBe(true);
  await open(page,'settings');page.once('dialog',dialog=>dialog.accept());await page.locator('#reset-pet').click();await expect(page.locator('#welcome')).toBeVisible();
  expect(await page.evaluate(()=>window.starboy.firstBoot.play(()=>{throw new Error('No debe repetirse');}))).toBe(false);
});

test('orientación vertical ofrece girar o continuar sin bloquear la app',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#rotate-screen')).toBeVisible();await page.locator('#portrait-continue').click();await expect(page.locator('#rotate-screen')).not.toBeVisible();await page.waitForFunction(()=>window.starboy);await page.locator('#hatch').click();await open(page,'environment');await expect(page.locator('#camera-toggle')).toBeVisible();
});

test('el modelo oficial reconoce un pulgar arriba y el gesto de victoria',async({page})=>{
  await hatch(page);
  const fixtures=await Promise.all(['thumb_up','victory'].map(async name=>({name,data:'data:image/jpeg;base64,'+(await readFile(new URL(`../fixtures/${name}.jpg`,import.meta.url))).toString('base64')})));
  const results=await page.evaluate(async fixtures=>{
    const {FilesetResolver,GestureRecognizer}=await import('/vendor/vision/vision_bundle.mjs');const files=await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
    const recognizer=await GestureRecognizer.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/gesture_recognizer.task',delegate:'CPU'},runningMode:'IMAGE',numHands:1});
    const output=[];for(const fixture of fixtures){const image=new Image();image.src=fixture.data;await image.decode();const result=recognizer.recognize(image);output.push(result.gestures[0]?.[0]?.categoryName);}recognizer.close();return output;
  },fixtures);
  expect(results).toEqual(['Thumb_Up','Victory']);
});

test('permisos de cámara y micrófono se activan por separado y apagan sus pistas',async({page,context})=>{
  await context.grantPermissions(['camera','microphone']);await hatch(page);await open(page,'environment');await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveAttribute('aria-pressed','true',{timeout:30000});await page.locator('#microphone-toggle').click();await expect(page.locator('#microphone-toggle')).toHaveAttribute('aria-pressed','true');await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#microphone-toggle')).toHaveAttribute('aria-pressed','true');await page.locator('#microphone-toggle').click();expect(await page.evaluate(()=>Object.keys(window.starboy.sensors.streams))).toEqual([]);
});

test('dos navegadores se encuentran e intercambian realmente sus ojos',async({browser})=>{
  const options={viewport:{width:844,height:390},baseURL:'http://127.0.0.1:3000',isMobile:true,hasTouch:true};const a=await browser.newContext(options),b=await browser.newContext(options);const pa=await a.newPage(),pb=await b.newPage();
  try{await hatch(pa);await hatch(pb);
    await pa.evaluate(()=>{window.starboy.pet.palette=10;window.starboy.pet.shape=0;window.starboy.eyes.setLook(10,0);});await pb.evaluate(()=>{window.starboy.pet.palette=20;window.starboy.pet.shape=2;window.starboy.eyes.setLook(20,2);});
    for(const page of [pa,pb]){await open(page,'meet');await page.locator('#room-code').fill('TEST42');await page.locator('#room-form button').click();await expect(page.locator('#meet-status')).toHaveText('Sala TEST42');}
    await expect(pa.locator('.peer')).toHaveCount(1);await expect(pb.locator('.peer')).toHaveCount(1);await pa.locator('[data-meet="swap"]').click();await expect.poll(()=>pa.evaluate(()=>window.starboy.pet.palette)).toBe(20);await expect.poll(()=>pb.evaluate(()=>window.starboy.pet.palette)).toBe(10);expect(await pa.evaluate(()=>window.starboy.pet.encounters)).toBe(1);
  }finally{await a.close();await b.close();}
});

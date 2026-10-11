import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function ready(page){await page.goto('/');await page.waitForFunction(()=>window.starboy);await page.locator('#hatch').click();}
async function open(page,name){await page.locator(`.dock [data-panel="${name}"]`).click();}
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('starboy.first-boot.v1','complete'));});

test('rostro real: sigue la cabeza, prioriza cara y reacciona a una sonrisa una sola vez',async({page})=>{
  const portrait='data:image/jpeg;base64,'+(await readFile(new URL('../fixtures/portrait.jpg',import.meta.url))).toString('base64');
  await ready(page);await open(page,'environment');
  await page.evaluate(async data=>{
    const image=new Image();image.src=data;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;const ctx=canvas.getContext('2d');let shift=-65;
    const paint=()=>{ctx.fillStyle='#777';ctx.fillRect(0,0,480,360);const scale=360/image.height;ctx.drawImage(image,(480-image.width*scale)/2+shift,0,image.width*scale,360);};
    paint();setInterval(paint,60);window.moveHead=value=>shift=value;navigator.mediaDevices.getUserMedia=async()=>canvas.captureStream(15);
    window.faceActions=[];const callback=window.starboy.sensors.callbacks.gesture;window.starboy.sensors.callbacks.gesture=type=>{window.faceActions.push(type);callback(type);};
  },portrait);
  await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveAttribute('aria-pressed','true',{timeout:45000});
  expect(await page.evaluate(()=>window.starboy.sensors.vision.faceEnabled)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.starboy.sensors.tracker.target.x)).toBeGreaterThan(.12);
  await expect.poll(()=>page.evaluate(()=>window.faceActions)).toContain('love');
  await page.evaluate(()=>window.moveHead(65));await expect.poll(()=>page.evaluate(()=>window.starboy.sensors.tracker.target.x)).toBeLessThan(-.12);
  await expect(page.locator('#mood-label')).toHaveText('Querido');
  expect(await page.evaluate(()=>window.faceActions.filter(action=>action==='love').length)).toBe(1);
});

test('el cariño tiene reacción temporal y el modo reducido limita las partículas',async({page})=>{
  await ready(page);await open(page,'care');await page.locator('[data-action="pet"]').click();
  expect(await page.evaluate(()=>window.starboy.eyes.reaction.type)).toBe('pet');expect(await page.evaluate(()=>window.starboy.eyes.stars.length)).toBeGreaterThan(0);
  await page.locator('#close-panel').click();await open(page,'settings');await page.locator('#reduced-motion').check();
  await page.evaluate(()=>{window.starboy.eyes.stars=[];window.starboy.eyes.react('kiss');});
  expect(await page.evaluate(()=>window.starboy.eyes.stars.length)).toBeLessThanOrEqual(4);
  expect(await page.evaluate(()=>window.starboy.eyes.reaction.duration)).toBe(900);
});

test('una temperatura Bluetooth recibida reemplaza el control manual y se libera al desconectar',async({page})=>{
  await page.addInitScript(()=>{
    const value=new DataView(new ArrayBuffer(2));value.setInt16(0,2275,true);
    const characteristic=new EventTarget();characteristic.properties={read:true,notify:true};characteristic.readValue=async()=>value;characteristic.startNotifications=async()=>characteristic;characteristic.stopNotifications=async()=>characteristic;
    const device=new EventTarget();device.name='Termómetro de prueba';device.gatt={connected:false,connect:async()=>{device.gatt.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async()=>characteristic})};},disconnect:()=>{device.gatt.connected=false;}};
    Object.defineProperty(navigator,'bluetooth',{configurable:true,value:{requestDevice:async()=>device}});
  });
  await ready(page);await open(page,'environment');await page.locator('#temperature-sensor-toggle').click();await expect(page.locator('#temperature-value')).toHaveText('22.75 °C');
  await expect(page.locator('#temperature')).toBeDisabled();await expect(page.locator('#temperature-source')).toContainText('Bluetooth');
  await page.locator('#temperature-sensor-toggle').click();await expect(page.locator('#temperature')).toBeEnabled();await expect(page.locator('#temperature-source')).toHaveText('Temperatura manual.');
});

test('dos mascotas entran en el mismo universo, se cuidan juntas y vuelven conservando su identidad',async({browser})=>{
  const options={viewport:{width:844,height:390},baseURL:'http://127.0.0.1:3000',isMobile:true,hasTouch:true};const a=await browser.newContext(options),b=await browser.newContext(options);
  for(const context of [a,b])await context.addInitScript(()=>localStorage.setItem('starboy.first-boot.v1','complete'));
  const host=await a.newPage(),guest=await b.newPage();const errors=[];for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
  try{
    await ready(host);await ready(guest);await host.evaluate(()=>window.starboy.pet.name='Luna');await guest.evaluate(()=>window.starboy.pet.name='Nova');
    const hostId=await host.evaluate(()=>window.starboy.pet.id),guestId=await guest.evaluate(()=>window.starboy.pet.id);
    for(const page of [host,guest]){await open(page,'meet');await page.locator('#room-code').fill('VISIT42');await page.locator('#room-form button').click();await expect(page.locator('#meet-status')).toHaveText('Sala VISIT42');}
    await expect(guest.locator('.visit-button')).toHaveCount(1);await guest.locator('.visit-button').click();await host.locator('#close-panel').click();
    for(const page of [host,guest]){await expect(page.locator('#visitor-space')).toBeVisible();await expect(page.locator('#visitor-eyes')).toHaveAttribute('data-engine','original');}
    await expect(host.locator('.visitor-caption strong')).toHaveText('Nova');await expect(guest.locator('.visitor-caption strong')).toHaveText('Luna');
    const hostBond=await host.evaluate(()=>window.starboy.pet.bond),guestBond=await guest.evaluate(()=>window.starboy.pet.bond);
    await guest.locator('[data-visit-action="pet"]').click();await expect(host.locator('#mood-label')).toHaveText('Querido');await expect(guest.locator('#mood-label')).toHaveText('Querido');
    await expect.poll(()=>host.evaluate(()=>window.starboy.pet.bond)).toBeGreaterThan(hostBond+1);
    await expect.poll(()=>guest.evaluate(()=>window.starboy.pet.bond)).toBeGreaterThan(guestBond+1);
    await host.screenshot({path:'/tmp/starboy-shared-universe.png'});
    await host.locator('.visitor-exit').click();for(const page of [host,guest])await expect(page.locator('#visitor-space')).not.toBeVisible();
    expect(await host.evaluate(()=>window.starboy.pet.id)).toBe(hostId);expect(await guest.evaluate(()=>window.starboy.pet.id)).toBe(guestId);
    expect(await host.evaluate(()=>window.starboy.visits.eyes)).toBeNull();expect(errors).toEqual([]);
  }finally{await a.close();await b.close();}
});

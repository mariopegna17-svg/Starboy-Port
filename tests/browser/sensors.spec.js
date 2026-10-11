import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function ready(page){await page.goto('/');await page.waitForFunction(()=>window.starboy);await page.locator('#hatch').click();}
async function environment(page){await page.locator('.dock [data-panel="environment"]').click();}
async function activate(page){await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveAttribute('aria-pressed','true',{timeout:45000});}
async function pixels(page){return page.evaluate(()=>{const canvas=document.querySelector('#eyes'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let count=0;for(let i=0;i<data.length;i+=16)if(data[i+3]&&Math.max(data[i],data[i+1],data[i+2])>40)count++;return count;});}
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('starboy.first-boot.v1','complete'));});

test('los ojos siguen visibles y animados mientras cámara y micrófono están activos',async({page,context})=>{
  await context.grantPermissions(['camera','microphone']);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await ready(page);await environment(page);await activate(page);
  expect(await page.evaluate(()=>window.starboy.sensors.vision.mode)).toBe('worker');
  await page.locator('#microphone-toggle').click();await expect(page.locator('#microphone-toggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#close-panel').click();await expect(page.locator('#camera-preview')).toHaveCount(0);await expect(page.locator('#camera-video')).toHaveCSS('opacity','0');
  await page.evaluate(()=>{window.eyeFrames=0;window.starboy.eyes.onFrame=()=>window.eyeFrames++;});
  await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
  await expect.poll(()=>page.evaluate(()=>window.eyeFrames)).toBeGreaterThan(45);
  await page.setViewportSize({width:932,height:430});await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
  await environment(page);await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>window.starboy.sensors.video.srcObject)).toBeNull();
  expect(await page.evaluate(()=>window.starboy.sensors.state.microphone)).toBe('on');expect(errors).toEqual([]);
});

test('cancelar durante el permiso descarta y apaga la cámara que llega tarde',async({page})=>{
  await ready(page);await environment(page);
  await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
    window.lateStream=canvas.captureStream(12);
    navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.releaseCamera=()=>resolve(window.lateStream));
  });
  await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveText('Cancelar');await expect(page.locator('#camera-toggle')).toBeEnabled();
  await page.locator('#camera-toggle').click();await expect(page.locator('#camera-toggle')).toHaveText('Activar');
  await page.evaluate(()=>window.releaseCamera());
  await expect.poll(()=>page.evaluate(()=>window.lateStream.getTracks()[0].readyState)).toBe('ended');
  expect(await page.evaluate(()=>window.starboy.sensors.video.srcObject)).toBeNull();
});

test('permiso denegado e interrupción del dispositivo permiten volver a activar',async({page,context})=>{
  await context.grantPermissions(['camera']);await ready(page);await environment(page);
  await page.evaluate(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);let first=true;navigator.mediaDevices.getUserMedia=options=>{if(first){first=false;return Promise.reject(new DOMException('denied','NotAllowedError'));}return original(options);};});
  await page.locator('#camera-toggle').click();await expect(page.locator('#camera-note')).toContainText('denegado');await activate(page);
  await page.evaluate(()=>{const track=window.starboy.sensors.streams.camera.getVideoTracks()[0];track.stop();track.dispatchEvent(new Event('ended'));});
  await expect(page.locator('#camera-note')).toContainText('interrumpió');await activate(page);
  await expect(page.locator('#camera-note')).not.toContainText('denegado');
});

test('volver del segundo plano permite reanudar ambos sensores sin perder los ojos',async({page,context})=>{
  await context.grantPermissions(['camera','microphone']);await ready(page);await environment(page);await activate(page);
  await page.locator('#microphone-toggle').click();await expect(page.locator('#microphone-toggle')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.evaluate(()=>Object.keys(window.starboy.sensors.streams))).toEqual([]);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#camera-toggle')).toHaveText('Reanudar');await expect(page.locator('#microphone-toggle')).toHaveText('Reanudar');
  await activate(page);await page.locator('#microphone-toggle').click();await expect(page.locator('#microphone-toggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#close-panel').click();await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
});

test('la cámara vuelve a funcionar después de recargar completamente sin conexión',async({page,context})=>{
  await context.grantPermissions(['camera']);await ready(page);await page.waitForFunction(()=>navigator.serviceWorker.controller);await environment(page);await activate(page);
  await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('starboy-vision-1.1.0');return (await cache.keys()).length;})).toBeGreaterThanOrEqual(3);
  await page.locator('#camera-toggle').click();await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.starboy);await environment(page);await activate(page);
  expect(await page.evaluate(()=>window.starboy.sensors.vision.mode)).toBe('worker');await page.locator('#close-panel').click();await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
});

test('el navegador sin Worker usa la alternativa compatible y mantiene los ojos',async({page,context})=>{
  await context.grantPermissions(['camera']);await page.addInitScript(()=>{window.Worker=undefined;});await ready(page);await environment(page);await activate(page);
  expect(await page.evaluate(()=>window.starboy.sensors.vision.mode)).toBe('compatible');await page.locator('#close-panel').click();await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
});

test('un fallo del motor se recupera con ojos visibles y un gesto no reinicia el juego',async({page})=>{
  await ready(page);await environment(page);
  await page.evaluate(()=>window.starboy.sensors.callbacks.gesture('play'));
  await expect(page.locator('#control-panel')).toBeVisible();await expect(page.locator('#play-star')).not.toBeVisible();
  await page.locator('#close-panel').click();await page.evaluate(()=>{window.Module._w8=()=>{throw new Error('Interrupción simulada');};});
  await expect(page.locator('#eyes')).toHaveAttribute('data-engine','fallback');await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
  await page.locator('.dock [data-panel="eyes"]').click();await page.locator('#random-eyes').click();await expect(page.locator('.eye-card')).toHaveCount(100);
});

test('la cámara reconoce manos reales en el Worker sin repetir la acción ni ocultar los ojos',async({page})=>{
  await ready(page);await environment(page);
  const fixtures=await Promise.all(['thumb_up','victory'].map(async name=>'data:image/jpeg;base64,'+(await readFile(new URL(`../fixtures/${name}.jpg`,import.meta.url))).toString('base64')));
  await page.evaluate(async fixtures=>{
    const images=await Promise.all(fixtures.map(async data=>{const image=new Image();image.src=data;await image.decode();return image;}));
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;const ctx=canvas.getContext('2d');let selected=0;
    const paint=()=>{ctx.fillStyle='#ddd';ctx.fillRect(0,0,480,360);const image=images[selected],scale=Math.min(480/image.width,360/image.height);ctx.drawImage(image,(480-image.width*scale)/2,(360-image.height*scale)/2,image.width*scale,image.height*scale);};
    paint();setInterval(paint,100);window.selectHand=index=>{selected=index;paint();};const stream=canvas.captureStream(10);navigator.mediaDevices.getUserMedia=async()=>stream;
    window.handActions=[];const callback=window.starboy.sensors.callbacks.gesture;window.starboy.sensors.callbacks.gesture=type=>{window.handActions.push(type);callback(type);};
  },fixtures);
  await activate(page);await expect.poll(()=>page.evaluate(()=>window.handActions)).toEqual(['thumbs']);
  await page.evaluate(()=>window.selectHand(1));await expect.poll(()=>page.evaluate(()=>window.handActions)).toEqual(['thumbs','play']);
  await expect(page.locator('#control-panel')).toBeVisible();await expect(page.locator('#play-star')).not.toBeVisible();await page.locator('#close-panel').click();await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
  await expect.poll(()=>page.evaluate(()=>window.starboy.sensors.lastVideoTime)).toBeGreaterThan(3);
  expect(await page.evaluate(()=>window.handActions)).toEqual(['thumbs','play']);
});

test('ver de nuevo el encendido conserva mascota y primera reproducción, e incluye el icono iPhone',async({page})=>{
  await ready(page);const id=await page.evaluate(()=>window.starboy.pet.id);await page.locator('.dock [data-panel="settings"]').click();await page.locator('#replay-boot').click();
  await expect(page.locator('#first-boot-screen')).toBeVisible();await expect(page.locator('#boot-close')).toBeVisible();await page.locator('#boot-close').click();
  await expect(page.locator('#first-boot-screen')).not.toBeVisible();expect(await page.evaluate(()=>window.starboy.pet.id)).toBe(id);
  expect(await page.evaluate(()=>localStorage.getItem('starboy.first-boot.v1'))).toBe('complete');
  const icon=await page.evaluate(async()=>{const image=new Image();image.src=document.querySelector('link[rel="apple-touch-icon"]').href;await image.decode();return [image.naturalWidth,image.naturalHeight];});expect(icon).toEqual([180,180]);
  await page.reload();await page.waitForFunction(()=>window.starboy);await expect(page.locator('#first-boot-screen')).not.toBeVisible();
});

test('el encendido conserva los dos párpados y termina con ojos amarillos, verde y azul',async({page})=>{
  await ready(page);
  const counts=await page.evaluate(async()=>{
    const sequence=window.starboy.bootSequence;await sequence.load();
    const sample=time=>{
      sequence.draw(time);const data=sequence.ctx.getImageData(0,0,sequence.canvas.width,sequence.canvas.height).data;
      let yellow=0,green=0,blue=0,left=0,right=0;
      for(let i=0;i<data.length;i+=4){const x=(i/4)%sequence.canvas.width,r=data[i],g=data[i+1],b=data[i+2];
        if(r>180&&g>170&&b<180){yellow++;if(x<sequence.canvas.width/2)left++;else right++;}
        if(g>120&&g>r*1.3&&g>b*1.3)green++;
        if(b>150&&b>r*1.3&&b>g*1.3)blue++;
      }return {yellow,green,blue,left,right};
    };return {closed:sample(45000),open:sample(50000)};
  });
  expect(counts.closed.left).toBeGreaterThan(100);expect(counts.closed.right).toBeGreaterThan(100);
  expect(counts.open.yellow).toBeGreaterThan(1000);expect(counts.open.green).toBeGreaterThan(1000);expect(counts.open.blue).toBeGreaterThan(1000);
});

test('la animación manual se puede cerrar incluso mientras descarga la secuencia',async({page})=>{
  await ready(page);await page.route('**/boot/sequence.json',()=>{});
  await page.locator('.dock [data-panel="settings"]').click();await page.locator('#replay-boot').click();await expect(page.locator('#boot-close')).toBeVisible();await page.locator('#boot-close').click();
  await expect(page.locator('#first-boot-screen')).not.toBeVisible();await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
  expect(await page.evaluate(()=>localStorage.getItem('starboy.first-boot.v1'))).toBe('complete');
});

test('importar otra mascota termina el juego previo y respeta una bienvenida pendiente',async({page})=>{
  await ready(page);await page.locator('.dock [data-panel="care"]').click();await page.locator('[data-action="play"]').click();await expect(page.locator('#play-star')).toBeVisible();
  const backup=await page.evaluate(()=>{const pet={...window.starboy.pet,hatched:false,name:'Nova'};return JSON.stringify(pet);});
  await page.locator('.dock [data-panel="settings"]').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#import-pet').setInputFiles({name:'nova.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await expect(page.locator('#play-star')).not.toBeVisible();await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#first-name')).toHaveValue('Nova');
  expect(await page.evaluate(()=>localStorage.getItem('starboy.first-boot.v1'))).toBe('complete');
});

for(const mode of ['worker','compatible'])test(`dos pulgares reales celebran una vez con captura invisible (${mode})`,async({page})=>{
  if(mode==='compatible')await page.addInitScript(()=>{window.Worker=undefined;});
  await ready(page);await environment(page);
  const fixture='data:image/jpeg;base64,'+(await readFile(new URL('../fixtures/thumb_up.jpg',import.meta.url))).toString('base64');
  await page.evaluate(async fixture=>{
    const image=new Image();image.src=fixture;await image.decode();const canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;const ctx=canvas.getContext('2d');
    const scale=Math.min(220/image.width,320/image.height),x=(240-image.width*scale)/2,y=(360-image.height*scale)/2;
    const paint=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,480,360);ctx.drawImage(image,x,y,image.width*scale,image.height*scale);ctx.save();ctx.translate(480,0);ctx.scale(-1,1);ctx.drawImage(image,x,y,image.width*scale,image.height*scale);ctx.restore();};
    paint();setInterval(paint,80);navigator.mediaDevices.getUserMedia=async()=>canvas.captureStream(15);
    window.pairActions=[];const callback=window.starboy.sensors.callbacks.gesture;window.starboy.sensors.callbacks.gesture=(type,name)=>{window.pairActions.push({type,name});callback(type,name);};
    window.pairFrames=0;const {Vision}=await import('/js/vision.js'),recognize=Vision.prototype.recognize;Vision.prototype.recognize=async function(...args){const result=await recognize.apply(this,args);if(result.handsFresh&&result.landmarks.length===2)window.pairFrames++;return result;};
  },fixture);
  await activate(page);expect(await page.evaluate(()=>window.starboy.sensors.vision.mode)).toBe(mode);
  await expect.poll(()=>page.evaluate(()=>window.pairActions)).toEqual([{type:'celebrate',name:'Double_Thumb_Up'}]);
  await expect(page.locator('#camera-gesture')).toHaveText('Dos pulgares arriba → Celebrar');await page.locator('#camera-gestures summary').click();
  await expect(page.locator('#gesture-list')).toContainText('Corazón con ambas manos');await expect(page.locator('#gesture-list')).toContainText('Levantar las cejas');
  await expect.poll(()=>page.evaluate(()=>window.pairFrames)).toBeGreaterThan(6);expect(await page.evaluate(()=>window.pairActions)).toHaveLength(1);
  const time=await page.evaluate(()=>window.starboy.sensors.video.currentTime);await page.locator('#close-panel').click();await expect(page.locator('#camera-preview')).toHaveCount(0);
  await expect(page.locator('#camera-video')).toHaveCSS('opacity','0');await expect.poll(()=>page.evaluate(()=>window.starboy.sensors.video.currentTime)).toBeGreaterThan(time+.5);
  await expect.poll(()=>pixels(page)).toBeGreaterThan(1000);
});

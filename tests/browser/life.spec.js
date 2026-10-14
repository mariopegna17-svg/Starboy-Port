import {test,expect} from '@playwright/test';
async function ready(page){await page.goto('/');await page.waitForFunction(()=>window.starboy);await page.locator('#hatch').click();}
async function open(page,name){await page.locator(`.dock [data-panel="${name}"]`).click();}
async function eyePixels(page){return page.evaluate(()=>{const c=document.querySelector('#eyes'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<data.length;i+=16)if(data[i+3]>40&&Math.max(data[i],data[i+1],data[i+2])>40)count++;return count;});}
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('starboy.first-boot.v1','complete'));});

test('sin tocarlo tiene momentos distintos y conserva identidad, ojos, vínculo y recuerdos',async({page})=>{
  await page.clock.install();await ready(page);
  const before=await page.evaluate(()=>{
    const {pet,eyes}=window.starboy;pet.effect=null;pet.trait='curious';pet.behaviors=['curious'];eyes.mood='happy';eyes.resetMotion(performance.now());eyes.motion.random=()=>0;
    window.idleMoments=[];eyes.onFrame=()=>{if(eyes.motion.current?.source==='idle')window.idleMoments.push(eyes.motion.current.name);};
    return {id:pet.id,palette:pet.palette,shape:pet.shape,bond:pet.bond,memory:pet.memory};
  });
  await page.clock.runFor(15000);expect(await page.evaluate(()=>new Set(window.idleMoments).size)).toBeGreaterThan(1);
  expect(await page.evaluate(()=>{const p=window.starboy.pet;return {id:p.id,palette:p.palette,shape:p.shape,bond:p.bond,memory:p.memory};})).toEqual(before);
  await expect(page.locator('#eyes')).toHaveAttribute('data-engine','original');expect(await eyePixels(page)).toBeGreaterThan(1000);
});

test('comer, dormir y despertar tienen secuencias propias y los cuatro estilos conservan ojos visibles',async({page})=>{
  await page.clock.install();await ready(page);const original=await page.evaluate(()=>{window.starboy.pet.palette=52;window.starboy.eyes.setLook(52,window.starboy.pet.shape);return {id:window.starboy.pet.id,palette:window.starboy.pet.palette};});await open(page,'care');
  await page.locator('[data-action="feed"]').click();expect(await page.evaluate(()=>window.starboy.eyes.motion.current.name)).toBe('feed');
  for(let shape=0;shape<4;shape++){
    await page.evaluate(shape=>{window.starboy.pet.shape=shape;window.starboy.eyes.setLook(window.starboy.pet.palette,shape);},shape);
    await page.locator('[data-action="sleep"]').click();await expect(page.locator('#mood-label')).toHaveText('Soñando');await page.clock.runFor(1800);
    expect(await eyePixels(page)).toBeGreaterThan(100);expect(await page.evaluate(()=>window.starboy.eyes.sleepRemaining)).toBe(0);await expect(page.locator('#eyes')).toHaveAttribute('data-engine','original');
    await page.locator('[data-action="sleep"]').click();expect(await page.evaluate(()=>window.starboy.eyes.motion.current.name)).toBe('wake');await page.clock.runFor(1800);
    await expect.poll(async()=>{await page.clock.runFor(200);return eyePixels(page);}).toBeGreaterThan(1000);
  }
  expect(await page.evaluate(()=>({id:window.starboy.pet.id,palette:window.starboy.pet.palette}))).toEqual(original);
});

test('acariciar arrastrando no duplica el toque al soltar ni acumula corazones',async({page})=>{
  await ready(page);const bond=await page.evaluate(()=>window.starboy.pet.bond);await page.mouse.move(240,185);await page.mouse.down();await page.mouse.move(480,180,{steps:12});await page.mouse.up();
  expect(await page.evaluate(()=>window.starboy.pet.bond)).toBe(bond+2);expect(await page.evaluate(()=>window.starboy.eyes.reaction.type)).toBe('pet');expect(await page.evaluate(()=>window.starboy.eyes.stars.filter(p=>p.kind==='heart').length)).toBeLessThanOrEqual(2);
});

test('la mirada externa manda sobre la curiosidad y pausar o reducir cancela las secuencias',async({page})=>{
  await page.clock.install();await ready(page);
  await page.evaluate(()=>{const eyes=window.starboy.eyes;eyes.resetMotion(performance.now());eyes.motion.play('scan',performance.now(),{source:'idle'});window.followTimer=setInterval(()=>eyes.look(.3,-.12),80);});
  await page.clock.runFor(1400);const gaze=await page.evaluate(()=>{const eyes=window.starboy.eyes,visible=eyes.visibleGaze(performance.now());return {visible,base:eyes.gaze};});
  expect(Math.abs(gaze.visible.x-gaze.base.x)).toBeLessThan(.01);expect(Math.abs(gaze.visible.y-gaze.base.y)).toBeLessThan(.01);
  await page.evaluate(()=>{clearInterval(window.followTimer);Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.evaluate(()=>window.starboy.eyes.motion.current)).toBeNull();await page.clock.runFor(20000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});expect(await page.evaluate(()=>window.starboy.eyes.reaction.type)).toBe('return');
  await open(page,'settings');await page.locator('#reduced-motion').check();await page.locator('#close-panel').click();await page.clock.runFor(12000);
  expect(await page.evaluate(()=>window.starboy.eyes.motion.current)).toBeNull();
  const pose=await page.evaluate(()=>window.starboy.eyes.poseAt(performance.now()));expect(pose).toEqual({gazeX:0,gazeY:0,x:0,y:0,tilt:0,scale:0});
});

test('un motor que devuelve trazos transparentes recupera los ojos originales y conserva la mascota',async({page})=>{
  await page.clock.install();await ready(page);
  const original=await page.evaluate(async()=>{
    const eyes=window.starboy.eyes,engine=await window.eyeEngineReady,read=engine._w12,create=engine._w0;let blank=true;
    engine._w0=()=>{blank=false;return create();};
    engine._w12=(id,pointer,size)=>{const count=read(id,pointer,size);if(blank){const values=new Float32Array(engine.HEAPF32.buffer,pointer,count);let offset=1;for(let i=0;i<values[0];i++){values[offset+5]=0;offset+=6+values[offset]*2;}}return count;};
    return {id:eyes.pet.id,palette:eyes.pet.palette,shape:eyes.pet.shape};
  });
  await page.clock.runFor(2200);expect(await eyePixels(page)).toBeGreaterThan(1000);await expect(page.locator('#eyes')).toHaveAttribute('data-engine','original');
  expect(await page.evaluate(()=>({id:window.starboy.pet.id,palette:window.starboy.pet.palette,shape:window.starboy.pet.shape}))).toEqual(original);
});

const CACHE='starboy-v4';
const VISION='starboy-vision-1.1.0';
const SHELL=['/','/index.html','/styles.css','/js/app.js','/js/pet.js','/js/palettes.js','/js/eyes.js','/js/sensors.js','/js/gesture.js','/js/vision.js','/js/vision-worker.js','/js/meet.js','/js/first-boot.js','/js/boot-sequence.js','/boot/sequence.json','/icon.svg','/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-touch-icon.png?v=2','/manifest.webmanifest','/vendor/starboy/animation_renderer.js','/vendor/starboy/animation_renderer.wasm','/vendor/starboy/anim_data.bin'];
const isVision=pathname=>pathname.startsWith('/vendor/vision/')||pathname.startsWith('/models/');
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const runtime=await caches.open(VISION);
    // Keep downloaded WASM/model data when upgrading the app, including v3.
    for(const key of await caches.keys()){
      if(!key.startsWith('starboy-')||key===CACHE||key===VISION)continue;
      const old=await caches.open(key);
      for(const request of await old.keys())if(isVision(new URL(request.url).pathname)&&!await runtime.match(request))await runtime.put(request,await old.match(request));
      await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||['/healthz','/meet','/sw.js'].includes(url.pathname))return;
  event.respondWith((async()=>{
    const dynamic=isVision(url.pathname),cache=await caches.open(dynamic?VISION:CACHE);
    // Load the installed app immediately, even while a free Render server wakes.
    const cached=await cache.match(event.request);if(cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok){const copy=response.clone();event.waitUntil(cache.put(event.request,copy));}
      return response;
    }catch(error){if(event.request.mode==='navigate')return await cache.match('/')||Response.error();return Response.error();}
  })());
});

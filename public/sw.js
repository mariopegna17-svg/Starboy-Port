const CACHE='starboy-v3';
const SHELL=['/','/index.html','/styles.css','/js/app.js','/js/pet.js','/js/palettes.js','/js/eyes.js','/js/sensors.js','/js/meet.js','/js/first-boot.js','/js/boot-sequence.js','/boot/sequence.json','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest','/vendor/starboy/animation_renderer.js','/vendor/starboy/animation_renderer.wasm','/vendor/starboy/anim_data.bin'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('starboy-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/healthz'||url.pathname==='/meet')return;
  if(url.pathname==='/sw.js')return;
  const dynamic=url.pathname.startsWith('/vendor/vision/')||url.pathname.startsWith('/models/');
  if(dynamic){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;})));return;}
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;if(event.request.mode==='navigate')return caches.match('/');return Response.error();}));
});

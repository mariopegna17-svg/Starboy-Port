import { access, readFile } from 'node:fs/promises';
const files=['public/index.html','public/styles.css','public/js/app.js','public/js/motion.js','public/js/sensors.js','public/js/tracking.js','public/js/environment-sensors.js','public/js/visits.js','public/js/vision.js','public/js/vision-worker.js','public/js/gesture.js','public/js/boot-sequence.js','public/js/first-boot.js','public/boot/sequence.json','public/apple-touch-icon.png','public/icon-maskable-512.png','public/vendor/starboy/animation_renderer.js','public/vendor/starboy/animation_renderer.wasm','public/vendor/starboy/anim_data.bin','node_modules/@mediapipe/tasks-vision/vision_bundle.mjs'];
for(const file of files)await access(new URL('../'+file,import.meta.url));
const wasm=await readFile(new URL('../public/vendor/starboy/animation_renderer.wasm',import.meta.url));
if(!WebAssembly.validate(wasm))throw new Error('El motor de ojos no es un WebAssembly válido.');
const boot=JSON.parse(await readFile(new URL('../public/boot/sequence.json',import.meta.url),'utf8'));
if(boot.version!==1||boot.size!==400||boot.fps!==30||boot.duration!==50500||boot.frames.length!==1515)throw new Error('La secuencia de encendido está incompleta.');
for(const [background,groups,phase] of boot.frames){
  if(!['seed','birth','eyes'].includes(phase)||background>=boot.palette.length)throw new Error('Fotograma de encendido inválido.');
  for(const [color,contours] of groups){
    if(!boot.palette[color])throw new Error('Color de encendido inválido.');
    for(const points of contours)if(points.length<6||points.length%2||points.some(n=>!Number.isFinite(n)||n<0||n>400))throw new Error('Contorno de encendido inválido.');
  }
}
console.log('App y motor de ojos listos. No se necesita compilar el cliente.');

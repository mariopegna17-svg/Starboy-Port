import { access, readFile } from 'node:fs/promises';
const files=['public/index.html','public/styles.css','public/js/app.js','public/vendor/starboy/animation_renderer.js','public/vendor/starboy/animation_renderer.wasm','public/vendor/starboy/anim_data.bin','node_modules/@mediapipe/tasks-vision/vision_bundle.mjs'];
for(const file of files)await access(new URL('../'+file,import.meta.url));
const wasm=await readFile(new URL('../public/vendor/starboy/animation_renderer.wasm',import.meta.url));
if(!WebAssembly.validate(wasm))throw new Error('El motor de ojos no es un WebAssembly válido.');
console.log('App y motor de ojos listos. No se necesita compilar el cliente.');

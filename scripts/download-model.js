import { mkdir, writeFile, readFile, rename, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory=new URL('../public/models/',import.meta.url);
const target=new URL('gesture_recognizer.task',directory);
const expected='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
try{const existing=await readFile(target);if(digest(existing)!==expected)throw new Error('checksum');console.log('Modelo de gestos disponible y verificado.');}
catch{
  await mkdir(directory,{recursive:true});
  const response=await fetch('https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`No se pudo descargar el modelo oficial: HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(digest(bytes)!==expected)throw new Error('La suma SHA-256 del modelo no coincide con la versión verificada.');
  const temporary=new URL('gesture_recognizer.task.tmp',directory);
  try{await writeFile(temporary,bytes);await rename(temporary,target);}catch(error){await unlink(temporary).catch(()=>{});throw error;}
  console.log(`Modelo oficial de gestos preparado (${bytes.length} bytes).`);
}

import { mkdir, writeFile, readFile, rename, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory=new URL('../public/models/',import.meta.url);
const models=[
  {name:'gesture_recognizer',file:'gesture_recognizer.task',sha:'97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482',label:'gestos'},
  {name:'face_landmarker',file:'face_landmarker.task',sha:'64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',label:'rostro'}
];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(directory,{recursive:true});
for(const model of models){
  const target=new URL(model.file,directory);
  try{const existing=await readFile(target);if(digest(existing)!==model.sha)throw new Error('checksum');console.log(`Modelo de ${model.label} disponible y verificado.`);continue;}catch{}
  const response=await fetch(`https://storage.googleapis.com/mediapipe-models/${model.name}/${model.name}/float16/1/${model.file}`,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`No se pudo descargar el modelo oficial de ${model.label}: HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(digest(bytes)!==model.sha)throw new Error(`La suma SHA-256 del modelo de ${model.label} no coincide con la versión verificada.`);
  const temporary=new URL(`${model.file}.tmp`,directory);
  try{await writeFile(temporary,bytes);await rename(temporary,target);}catch(error){await unlink(temporary).catch(()=>{});throw error;}
  console.log(`Modelo oficial de ${model.label} preparado (${bytes.length} bytes).`);
}

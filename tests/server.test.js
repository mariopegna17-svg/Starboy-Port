import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createApp } from '../src/server.js';

test('el servidor sirve la app, el motor WASM y el healthcheck, sin exponer el código del servidor',async t=>{
  const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const origin=`http://127.0.0.1:${server.address().port}`;
  const home=await fetch(origin);assert.equal(home.status,200);assert.match(await home.text(),/Tu mascota Starboy/);
  const wasm=await fetch(origin+'/vendor/starboy/animation_renderer.wasm');assert.equal(wasm.headers.get('content-type'),'application/wasm');assert.equal(WebAssembly.validate(await wasm.arrayBuffer()),true);
  assert.deepEqual(await (await fetch(origin+'/healthz')).json(),{status:'ok',app:'starboy-port'});
  assert.equal((await fetch(origin+'/..%2fpackage.json')).status,403);assert.equal((await fetch(origin+'/src/server.js')).status,404);
});

function inbox(ws){const queue=[],waiters=[];ws.on('message',data=>{const message=JSON.parse(data.toString());const index=waiters.findIndex(w=>w.filter(message));if(index>=0){const waiter=waiters.splice(index,1)[0];clearTimeout(waiter.timeout);waiter.resolve(message);}else queue.push(message);});return filter=>new Promise((resolve,reject)=>{const index=queue.findIndex(filter);if(index>=0){resolve(queue.splice(index,1)[0]);return;}const waiter={filter,resolve,timeout:setTimeout(()=>{const i=waiters.indexOf(waiter);if(i>=0)waiters.splice(i,1);reject(new Error('Mensaje no recibido'));},2500)};waiters.push(waiter);});}
test('dos mascotas se encuentran, comparten acciones y abandonan una sala real por WebSocket',async t=>{
  const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`ws://127.0.0.1:${server.address().port}/meet`;
  const a=new WebSocket(origin),b=new WebSocket(origin),c=new WebSocket(origin);const readA=inbox(a),readB=inbox(b),readC=inbox(c);t.after(async()=>{for(const ws of [a,b,c])ws.terminate();await new Promise(resolve=>server.close(resolve));});await Promise.all([once(a,'open'),once(b,'open'),once(c,'open')]);
  const profile=(id,palette)=>({id,name:id,palette,shape:1,trait:'playful'});
  a.send(JSON.stringify({type:'join',room:'STAR42',profile:profile('a',5)}));await readA(m=>m.type==='joined');
  b.send(JSON.stringify({type:'join',room:'STAR42',profile:profile('b',20)}));await readB(m=>m.type==='joined');assert.equal((await readA(m=>m.type==='peers'&&m.peers.length===1)).peers[0].name,'b');
  c.send(JSON.stringify({type:'join',room:'OTHER42',profile:profile('c',40)}));await readC(m=>m.type==='joined');
  a.send(JSON.stringify({type:'action',action:'swap',to:'b'}));const swap=await readB(m=>m.type==='action');assert.equal(swap.from.palette,5);assert.equal(swap.action,'swap');
  b.send(JSON.stringify({type:'leave'}));await readA(m=>m.type==='peers'&&m.peers.length===0);
  a.send(JSON.stringify({type:'join',room:'bad!',profile:profile('a',5)}));assert.equal((await readA(m=>m.type==='error')).type,'error');
});

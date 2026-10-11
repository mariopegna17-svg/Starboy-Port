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

test('las visitas comparten universo y acciones, conservan los cambios de ojos y terminan al salir o desconectarse',async t=>{
  const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`ws://127.0.0.1:${server.address().port}/meet`;
  const host=new WebSocket(url),guest=new WebSocket(url),third=new WebSocket(url),outside=new WebSocket(url);
  const sockets=[host,guest,third,outside],reads=sockets.map(inbox),[readHost,readGuest,readThird,readOutside]=reads;
  const observed=sockets.map(()=>[]);sockets.forEach((ws,index)=>ws.on('message',raw=>observed[index].push(JSON.parse(raw.toString()))));
  t.after(async()=>{for(const ws of sockets)ws.terminate();await new Promise(resolve=>server.close(resolve));});
  await Promise.all(sockets.map(ws=>once(ws,'open')));
  const profile=(id,palette)=>({id,name:id,palette,shape:1,trait:'playful',mood:'happy'});
  const send=(ws,data)=>ws.send(JSON.stringify(data));
  for(const [index,ws] of sockets.entries()) {
    send(ws,{type:'join',room:index===3?'AWAY42':'VISIT42',profile:profile(['host','guest','third','outside'][index],index*10)});
    await reads[index](message=>message.type==='joined');
  }
  send(guest,{type:'visit',to:'outside'});assert.match((await readGuest(m=>m.type==='visit-error')).message,/sala/);
  send(guest,{type:'visit',to:'host'});
  const live=await readHost(m=>m.type==='visits'&&m.visits.length===1);
  assert.equal(live.visits[0].guest.id,'guest');assert.equal(live.visits[0].host.id,'host');
  await readGuest(m=>m.type==='visits'&&m.visits.length===1);await readThird(m=>m.type==='visits'&&m.visits.length===1);
  send(third,{type:'visit',to:'host'});assert.match((await readThird(m=>m.type==='visit-error')).message,/ya está de visita/);
  send(host,{type:'join',room:'VISIT42',profile:{...profile('host',37),name:'Nuevo nombre',mood:'loved'}});
  await readHost(m=>m.type==='joined');
  const refresh=await readGuest(m=>m.type==='visits'&&m.visits[0]?.host.palette===37);
  assert.equal(refresh.visits[0].host.name,'Nuevo nombre');assert.equal(refresh.visits[0].host.mood,'loved');
  assert.equal(refresh.visits[0].guest.palette,10);
  send(guest,{type:'visit-action',action:'pet',to:'third'});
  const care=await readHost(m=>m.type==='visit-action');
  assert.equal(care.from.id,'guest');assert.equal(care.to.id,'host');assert.equal(care.action,'pet');
  assert.deepEqual(await readGuest(m=>m.type==='visit-action'),care);
  send(guest,{type:'action',action:'wave',to:'third'});await readThird(m=>m.type==='action'&&m.from.id==='guest');
  assert.equal(observed[2].some(m=>m.type==='visit-action'),false);assert.equal(observed[3].some(m=>m.type==='visits'&&m.visits.length),false);
  send(outside,{type:'visit-action',action:'pet'});await readOutside(m=>m.type==='visit-error');
  const afterLeave=inbox(guest);send(host,{type:'leave-visit'});
  assert.deepEqual((await afterLeave(m=>m.type==='visits'&&m.visits.length===0)).visits,[]);
  send(host,{type:'join',room:'VISIT42',profile:profile('host',38)});await readHost(m=>m.type==='joined');
  await readGuest(m=>m.type==='peers'&&m.peers.some(p=>p.id==='host'&&p.palette===38));
  send(guest,{type:'visit',to:'host'});await readHost(m=>m.type==='visits'&&m.visits[0]?.host.palette===38);
  const afterDisconnect=inbox(guest);host.terminate();await readGuest(m=>m.type==='peers'&&m.peers.length===1&&m.peers[0].id==='third');
  assert.deepEqual((await afterDisconnect(m=>m.type==='visits'&&m.visits.length===0)).visits,[]);
  send(guest,{type:'visit',to:'third'});await readThird(m=>m.type==='visits'&&m.visits[0]?.guest.id==='guest'&&m.visits[0].host.id==='third');
  const afterGuestExit=inbox(third);send(guest,{type:'leave'});await readThird(m=>m.type==='peers'&&m.peers.length===0);
  assert.deepEqual((await afterGuestExit(m=>m.type==='visits'&&m.visits.length===0)).visits,[]);
});

test('la misma mascota no puede suplantar a otro participante en una sala',async t=>{
  const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`ws://127.0.0.1:${server.address().port}/meet`,first=new WebSocket(url),duplicate=new WebSocket(url);
  const readFirst=inbox(first),readDuplicate=inbox(duplicate);
  t.after(async()=>{first.terminate();duplicate.terminate();await new Promise(resolve=>server.close(resolve));});
  await Promise.all([once(first,'open'),once(duplicate,'open')]);
  const profile={id:'same-pet',name:'Original',palette:5,shape:0,trait:'curious'};
  first.send(JSON.stringify({type:'join',room:'SAFE42',profile}));await readFirst(m=>m.type==='joined');
  duplicate.send(JSON.stringify({type:'join',room:'SAFE42',profile:{...profile,name:'Duplicado'}}));
  assert.match((await readDuplicate(m=>m.type==='error')).message,/otra ventana/);
  first.send(JSON.stringify({type:'join',room:'SAFE42',profile:{...profile,palette:12}}));await readFirst(m=>m.type==='joined');
  assert.deepEqual((await readFirst(m=>m.type==='peers')).peers,[]);
});

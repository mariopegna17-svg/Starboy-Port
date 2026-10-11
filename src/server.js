import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.wasm':'application/wasm', '.bin':'application/octet-stream', '.task':'application/octet-stream' };
const vision = path.join(root, 'node_modules/@mediapipe/tasks-vision');

export function createApp() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Permissions-Policy','camera=(self), microphone=(self), accelerometer=(self), gyroscope=(self)');
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    if (pathname === '/healthz') { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({status:'ok', app:'starboy-port'})); return; }
    const isVision = pathname.startsWith('/vendor/vision/');
    const base = isVision ? vision : path.join(root,'public');
    const relative = isVision ? pathname.slice('/vendor/vision/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      if (!(await stat(file)).isFile()) throw new Error('not a file');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': pathname === '/sw.js' || pathname === '/' || pathname.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  const wss = new WebSocketServer({noServer:true, maxPayload:4096});
  const rooms = new Map();
  // A visit connects two live sockets; pet IDs and saved collections never move.
  const visits = new Map();
  const moods = new Set(['happy','curious','sleepy','asleep','hungry','anxious','cold','hot','dizzy','angry','sad','playful','loved']);
  const visitActions = new Set(['pet','feed','play','calm','thumbs','wave']);
  server.on('upgrade',(req,socket,head)=>{
    if (new URL(req.url,'http://localhost').pathname !== '/meet') { socket.destroy(); return; }
    // Only accept browsers on this app's origin. Non-browser test clients omit Origin.
    if (req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) { socket.destroy(); return; } }
      catch { socket.destroy(); return; }
    }
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  const send = (ws,data)=>{if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(data));};
  const peers = ws => [...(rooms.get(ws.room)||[])].filter(p=>p!==ws && p.profile).map(p=>p.profile);
  const visitFor = ws=>{
    if(visits.has(ws))return {guest:ws,host:visits.get(ws)};
    for(const [guest,host] of visits)if(host===ws)return {guest,host};
    return null;
  };
  const snapshot = room=>[...visits].filter(([guest,host])=>guest.room===room&&host.room===room).map(([guest,host])=>({guest:guest.profile,host:host.profile}));
  const broadcastVisits = room=>{const list=snapshot(room);for(const ws of rooms.get(room)||[])send(ws,{type:'visits',visits:list});};
  const roster = room=>{for(const ws of rooms.get(room)||[])send(ws,{type:'peers',peers:peers(ws)});broadcastVisits(room);};
  const removeVisit = ws=>{const visit=visitFor(ws);if(!visit)return false;visits.delete(visit.guest);return true;};
  const leave = ws=>{
    if(!ws.room)return;
    const room=ws.room;removeVisit(ws);rooms.get(room)?.delete(ws);ws.room=null;
    if(!rooms.get(room)?.size)rooms.delete(room);else roster(room);
  };
  wss.on('connection',ws=>{
    ws.alive=true; ws.on('pong',()=>ws.alive=true); ws.windowAt=Date.now();ws.messages=0;
    ws.on('message',raw=>{
      if(Date.now()-ws.windowAt>10000){ws.windowAt=Date.now();ws.messages=0;}
      if(++ws.messages>50){ws.close(1008,'Too many messages');return;}
      let data;try{data=JSON.parse(raw.toString());}catch{return;}
      if(data.type==='join'){
        const room=String(data.room||'').trim().toUpperCase();
        if(!/^[A-Z0-9]{4,12}$/.test(room)){send(ws,{type:'error',message:'Usa un código de 4 a 12 letras o números.'});return;}
        const p=data.profile;
        if(!p || typeof p.id!=='string' || !/^[A-Za-z0-9_-]{1,64}$/.test(p.id) || !Number.isInteger(p.palette) || p.palette<0 || p.palette>99 || !Number.isInteger(p.shape) || p.shape<0 || p.shape>3){send(ws,{type:'error',message:'No se pudo compartir esta mascota.'});return;}
        if([...rooms.get(room)||[]].some(peer=>peer!==ws&&peer.profile?.id===p.id)){send(ws,{type:'error',message:'Esta mascota ya está en la sala desde otra ventana.'});return;}
        if((rooms.get(room)?.size||0)-(ws.room===room?1:0)>=8){send(ws,{type:'error',message:'Esta sala está llena.'});return;}
        // Refreshing an outfit or expression must not eject an active visitor.
        if(ws.room!==room||ws.profile?.id!==p.id)leave(ws);
        ws.room=room;ws.profile={id:p.id,name:String(p.name||'Starboy').slice(0,24),palette:p.palette,shape:p.shape,trait:['curious','shy','playful','dreamy'].includes(p.trait)?p.trait:'curious',mood:moods.has(p.mood)?p.mood:'happy'};
        if(!rooms.has(room))rooms.set(room,new Set());rooms.get(room).add(ws);send(ws,{type:'joined',room,id:ws.profile.id});roster(room);
      }else if(data.type==='action' && ws.room && ['wave','play','swap'].includes(data.action)){
        for(const peer of rooms.get(ws.room)||[]){if(peer!==ws && (!data.to || peer.profile?.id===data.to))send(peer,{type:'action',action:data.action,from:ws.profile});}
      }else if(data.type==='visit'){
        const host=typeof data.to==='string'?[...rooms.get(ws.room)||[]].find(peer=>peer.profile?.id===data.to):null;
        if(!ws.room||!host||host===ws){send(ws,{type:'visit-error',message:'Elige otra mascota conectada en tu sala.'});return;}
        const current=visitFor(ws);
        if(current?.guest===ws&&current.host===host){broadcastVisits(ws.room);return;}
        if(current||visitFor(host)){send(ws,{type:'visit-error',message:'Una de las mascotas ya está de visita. Salid primero para abrir otro portal.'});return;}
        visits.set(ws,host);broadcastVisits(ws.room);
      }else if(data.type==='leave-visit'){
        if(removeVisit(ws))broadcastVisits(ws.room);
      }else if(data.type==='visit-action'){
        const visit=visitFor(ws);
        if(!visit||!visitActions.has(data.action)){send(ws,{type:'visit-error',message:'Esta acción necesita una visita activa.'});return;}
        const other=visit.guest===ws?visit.host:visit.guest;
        const message={type:'visit-action',action:data.action,from:ws.profile,to:other.profile,host:visit.host.profile,guest:visit.guest.profile};
        send(visit.host,message);send(visit.guest,message);
      }else if(data.type==='leave'){leave(ws);}
    });
    ws.on('close',()=>leave(ws)); ws.on('error',()=>leave(ws));
  });
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},30000);
  heartbeat.unref();
  server.on('close',()=>{clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();});
  return server;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createApp();server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Starboy escucha en el puerto ${server.address().port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
}

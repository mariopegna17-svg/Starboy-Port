export class Meetings {
  constructor({profile,status,peers,action}){this.callbacks={profile,status,peers,action};this.room='';this.ws=null;this.retry=0;this.timer=null;}
  join(room){this.leave(false);this.room=room.trim().toUpperCase();this.retry=0;this.connect();}
  connect(){
    if(!this.room)return;this.callbacks.status('connecting',this.room);
    const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/meet`);this.ws=ws;
    ws.onopen=()=>{if(this.ws!==ws)return;this.retry=0;ws.send(JSON.stringify({type:'join',room:this.room,profile:this.callbacks.profile()}));};
    ws.onmessage=event=>{if(this.ws!==ws)return;let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='joined')this.callbacks.status('connected',message.room);
      if(message.type==='peers')this.callbacks.peers(message.peers);
      if(message.type==='action')this.callbacks.action(message);
      if(message.type==='error'){this.callbacks.status('error',message.message);this.leave(false);}
    };
    ws.onclose=()=>{if(this.ws!==ws)return;this.callbacks.peers([]);if(this.room&&this.retry<5){this.retry++;this.callbacks.status('connecting',this.room);this.timer=setTimeout(()=>this.connect(),Math.min(1000*2**this.retry,15000));}else this.callbacks.status('disconnected','La sala se desconectó. Vuelve a entrar cuando tengas conexión.');};
    ws.onerror=()=>{};
  }
  refresh(){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type:'join',room:this.room,profile:this.callbacks.profile()}));}
  send(action,to){if(this.ws?.readyState!==WebSocket.OPEN)return false;this.ws.send(JSON.stringify({type:'action',action,to}));return true;}
  leave(notify=true){clearTimeout(this.timer);this.room='';const ws=this.ws;this.ws=null;if(ws){ws.onclose=null;ws.close();}if(notify){this.callbacks.status('disconnected','');this.callbacks.peers([]);}}
}

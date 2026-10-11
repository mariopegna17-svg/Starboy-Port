export class Meetings {
  constructor({profile,status,peers,action,visits,visitAction}) {
    this.callbacks={profile,status,peers,action,visits,visitAction};
    this.room='';this.id='';this.ws=null;this.retry=0;this.timer=null;this.visits=[];
  }
  join(room) {
    this.leave(false);this.room=room.trim().toUpperCase();this.retry=0;this.connect();
  }
  setVisits(list=[]) {
    this.visits=Array.isArray(list)?list:[];this.callbacks.visits?.(this.visits);
  }
  connect() {
    if(!this.room)return;
    this.callbacks.status('connecting',this.room);
    const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/meet`);this.ws=ws;
    ws.onopen=()=>{
      if(this.ws!==ws)return;
      this.retry=0;ws.send(JSON.stringify({type:'join',room:this.room,profile:this.callbacks.profile()}));
    };
    ws.onmessage=event=>{
      if(this.ws!==ws)return;
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='joined'){this.id=message.id||this.callbacks.profile().id;this.callbacks.status('connected',message.room);}
      if(message.type==='peers')this.callbacks.peers(message.peers);
      if(message.type==='visits')this.setVisits(message.visits);
      if(message.type==='action')this.callbacks.action(message);
      if(message.type==='visit-action')this.callbacks.visitAction?.(message);
      if(message.type==='visit-error')this.callbacks.status('visit-error',message.message);
      if(message.type==='error'){this.callbacks.status('error',message.message);this.leave(false);}
    };
    ws.onclose=()=>{
      if(this.ws!==ws)return;
      this.setVisits();this.callbacks.peers([]);
      if(this.room&&this.retry<5){
        this.retry++;this.callbacks.status('connecting',this.room);
        this.timer=setTimeout(()=>this.connect(),Math.min(1000*2**this.retry,15000));
      }else this.callbacks.status('disconnected','La sala se desconectó. Vuelve a entrar cuando tengas conexión.');
    };
    ws.onerror=()=>{};
  }
  refresh() {
    if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type:'join',room:this.room,profile:this.callbacks.profile()}));
  }
  send(action,to) {
    if(this.ws?.readyState!==WebSocket.OPEN)return false;
    this.ws.send(JSON.stringify({type:'action',action,to}));return true;
  }
  visit(to) {
    if(this.ws?.readyState!==WebSocket.OPEN||typeof to!=='string'||to===this.id)return false;
    this.ws.send(JSON.stringify({type:'visit',to}));return true;
  }
  leaveVisit() {
    if(this.ws?.readyState!==WebSocket.OPEN)return false;
    this.ws.send(JSON.stringify({type:'leave-visit'}));return true;
  }
  sendVisitAction(action) {
    if(this.ws?.readyState!==WebSocket.OPEN||!this.visits.some(visit=>visit.host?.id===this.id||visit.guest?.id===this.id))return false;
    this.ws.send(JSON.stringify({type:'visit-action',action}));return true;
  }
  leave(notify=true) {
    clearTimeout(this.timer);this.timer=null;this.room='';this.id='';
    const ws=this.ws;this.ws=null;
    if(ws){ws.onclose=null;ws.close();}
    this.setVisits();this.callbacks.peers([]);
    if(notify)this.callbacks.status('disconnected','');
  }
}

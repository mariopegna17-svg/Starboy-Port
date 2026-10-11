const STATES=['kpdhpvcju','lbxslfnxg','mcpfwucsm','nqzbkezbg'];
const BLINKS=['ajezs','bajhvf','cwiocc'];
const IDLE=['jjuy','ptenbyrcn','qmuusxmtv','rzufjwypm'];
const EXPRESSIONS=['uxonq','vidcr','wxaqs','xnbvl','ssjbxfj','tsjgjpc'];
let module, data, strings=new Map();
const string=value=>{if(strings.has(value))return strings.get(value);const ptr=module._malloc(value.length+1);for(let i=0;i<value.length;i++)module.HEAPU8[ptr+i]=value.charCodeAt(i);module.HEAPU8[ptr+value.length]=0;strings.set(value,ptr);return ptr;};
const paths=(id,scratch)=>{
  module._w11(id);const count=module._w12(id,scratch,16384);if(!count)return [];
  const values=new Float32Array(module.HEAPF32.buffer,scratch,count),result=[];let offset=1;
  for(let group=0;group<values[0];group++){
    const points=values[offset],blend=values[offset+1];const path=new Path2D();const start=offset+6;
    if(!points||!Number.isFinite(values[start])||!Number.isFinite(values[start+1])){offset+=6+points*2;continue;}
    path.moveTo(values[start],values[start+1]);
    for(let i=1;i+1<points;i+=3){const end=(i+2)%points;path.bezierCurveTo(values[start+i*2],values[start+i*2+1],values[start+(i+1)*2],values[start+(i+1)*2+1],values[start+end*2],values[start+end*2+1]);}
    const rgb=[2,3,4].map(n=>Math.round(Math.max(0,Math.min(1,values[offset+n]))*255));
    result.push({path,blend,fill:`rgba(${rgb.join(',')},${Math.max(0,Math.min(1,values[offset+5]))})`});offset+=6+points*2;
  }
  return result;
};
function paint(ctx,draws){let clip=null;for(const draw of draws){ctx.fillStyle=draw.fill;if(draw.blend===2&&clip){ctx.save();ctx.clip(clip,'evenodd');ctx.fill(draw.path,'evenodd');ctx.restore();}else{ctx.globalCompositeOperation=draw.blend===1?'destination-over':'source-over';ctx.fill(draw.path,'evenodd');ctx.globalCompositeOperation='source-over';}clip||=new Path2D();clip.addPath(draw.path);}}
function instance(palette,shape){const id=module._w0(),pointer=module._malloc(data.length);module.HEAPU8.set(data,pointer);const success=module._w1(id,pointer,data.length);module._free(pointer);if(!success){module._w15(id);throw new Error('No se pudo iniciar el motor.');}module._w3(id,string(STATES[shape]),0,1);module._w5(id,palette);module._w6(id,1);for(const trigger of IDLE)module._w4(id,string(trigger),1);return id;}

export class Eyes {
  constructor(canvas,pet){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.pet=pet;this.gaze={x:0,y:0};this.target={x:0,y:0};this.id=-1;this.engine='loading';this.last=0;this.nextBlink=0;this.nextExpression=0;this.mood='happy';this.stars=[];this.cached=null;this.dirty=true;this.running=true;this.onFrame=null;this.resize=()=>{const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);this.ratio=ratio;this.dirty=true;};this.resize();window.addEventListener('resize',this.resize);document.addEventListener('visibilitychange',()=>{this.last=performance.now();this.dirty=true;});}
  async init(){
    try{module=await window.eyeEngineReady;if(!module)throw new Error('Motor no disponible');const response=await fetch('/vendor/starboy/anim_data.bin');if(!response.ok)throw new Error('Datos no disponibles');data=new Uint8Array(await response.arrayBuffer());this.scratch=module._malloc(16384*4);this.id=instance(this.pet.palette,this.pet.shape);this.engine='original';module._w8(this.id,1000);}
    catch(error){console.warn('Se usa el motor de reserva:',error.message);this.engine='fallback';}
    this.canvas.dataset.engine=this.engine;requestAnimationFrame(time=>this.frame(time));return this.engine;
  }
  setLook(palette,shape){if(this.id>=0){try{module._w5(this.id,palette);module._w3(this.id,string(STATES[shape]),0,1);}catch(error){this.useFallback(error);}}this.dirty=true;}
  look(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.target={x:Math.max(-.6,Math.min(.6,x)),y:Math.max(-.6,Math.min(.6,y))};}
  spark(kind='star'){for(let i=0;i<12;i++)this.stars.push({x:innerWidth/2+(Math.random()-.5)*innerWidth*.55,y:innerHeight*.5,vx:(Math.random()-.5)*.09,vy:-.025-Math.random()*.055,life:1,kind,size:7+Math.random()*10});}
  frame(time){
    if(!this.running)return;requestAnimationFrame(t=>this.frame(t));
    const delta=Math.min(Math.max(time-this.last,0),50);this.last=time;if(document.hidden||this.suspended)return;
    if(this.pet.settings.reducedMotion&&time-(this.paintedAt||0)<100&&!this.dirty&&!this.stars.length)return;
    this.paintedAt=time;const dt=Math.floor(delta),ease=1-Math.exp(-delta/150);this.gaze.x+=(this.target.x-this.gaze.x)*ease;this.gaze.y+=(this.target.y-this.gaze.y)*ease;
    if(this.id>=0){
      try{
        if(dt>0)module._w8(this.id,dt);
        module._w7(this.id,this.gaze.x,-this.gaze.y);
        if(time>this.nextBlink){module._w4(this.id,string(BLINKS[Math.floor(Math.random()*BLINKS.length)]),1);this.nextBlink=time+2800+Math.random()*4200;}
        if(time>this.nextExpression&&!this.pet.settings.reducedMotion){module._w4(this.id,string(EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)]),1);this.nextExpression=time+6000+Math.random()*7000;}
      }catch(error){this.useFallback(error);}
    }
    this.render(time,delta);this.dirty=false;this.onFrame?.(time);
  }
  render(time,delta){
    const ctx=this.ctx,w=innerWidth,h=innerHeight;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    const reduced=this.pet.settings.reducedMotion;const breathe=reduced?1:1+Math.sin(time/2100)*.015;
    const immersive=document.querySelector('#universe')?.classList.contains('immersive');
    const scale=Math.min(w*.88/350,h*(immersive?.82:.62)/180)*breathe;
    let shakeX=0,shakeY=0,rotation=0;
    if(!reduced){if(this.mood==='cold')shakeX=Math.sin(time*.07)*3;if(this.mood==='dizzy')rotation=Math.sin(time*.003)*.06;if(this.mood==='playful')shakeY=Math.sin(time*.007)*9;}
    ctx.save();ctx.translate(w/2+shakeX,h*.48+shakeY);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.translate(-200,-200);
    if(this.id>=0){try{
      const draws=paths(this.id,this.scratch);
      if(draws.length){this.blankAt=null;paint(ctx,draws);}
      else{this.blankAt??=time;if(time-this.blankAt>450)this.fallback(ctx,time);}
    }catch(error){this.useFallback(error);this.fallback(ctx,time);}}else this.fallback(ctx,time);
    this.expression(ctx,time);ctx.restore();
    this.stars=this.stars.filter(p=>p.life>0);for(const p of this.stars){p.x+=p.vx*delta;p.y+=p.vy*delta;p.life-=delta/1800;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.kind==='heart'?'#ff8da8':'#e7ffb9';ctx.font=`${p.size}px sans-serif`;ctx.fillText(p.kind==='heart'?'♥':'✦',p.x,p.y);}ctx.globalAlpha=1;
    if(this.mood==='asleep'){ctx.fillStyle='#b7bdd0';ctx.font='16px monospace';ctx.fillText('z',w*.65,h*.26+Math.sin(time*.001)*5);ctx.font='23px monospace';ctx.fillText('Z',w*.69,h*.2);}
  }
  useFallback(error){console.warn('Recuperando los ojos:',error?.message);this.engine='fallback';this.id=-1;this.canvas.dataset.engine='fallback';}
  fallback(ctx,time){
    const hue=this.pet.palette*137.508%360,color=`hsl(${hue} 80% 70%)`;
    for(const x of [125,275]){ctx.save();ctx.translate(x,200);ctx.scale(1,.94+Math.sin(time*.002)*.025);ctx.fillStyle=color;ctx.beginPath();const round=this.pet.shape===0?42:50;ctx.roundRect(-round,-50,round*2,100,this.pet.shape===2?[10,40,35,35]:this.pet.shape===3?[50,50,18,18]:round);ctx.fill();ctx.fillStyle=`hsl(${hue} 45% 27%)`;ctx.beginPath();ctx.ellipse(this.gaze.x*20,this.gaze.y*15,22,30,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-8+this.gaze.x*10,-20+this.gaze.y*8,10,7,-.3,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  expression(ctx,time){
    const mood=this.mood;
    if(['sleepy','asleep'].includes(mood)){ctx.fillStyle='#050607';ctx.fillRect(35,80,330,mood==='asleep'?120:100);if(mood==='asleep')ctx.fillRect(35,214,330,100);}
    if(['angry','anxious','sad','hungry'].includes(mood)){
      ctx.fillStyle='#050607';for(const [x,sign] of [[125,1],[275,-1]]){ctx.save();ctx.translate(x,154);ctx.rotate((mood==='angry'?.16:-.12)*sign);ctx.fillRect(-65,-50,130,48);ctx.restore();}
    }
    if(mood==='sad'){ctx.fillStyle='rgba(146,208,255,.7)';for(const x of [83,316]){const y=235+(time/20%30);ctx.beginPath();ctx.ellipse(x,y,3,5,0,0,Math.PI*2);ctx.fill();}}
    if(mood==='loved'){ctx.fillStyle='rgba(255,129,164,.28)';for(const x of [75,325]){ctx.beginPath();ctx.ellipse(x,248,15,5,0,0,Math.PI*2);ctx.fill();}}
  }
  thumbnail(canvas,palette,shape){
    const ctx=canvas.getContext('2d');canvas.width=180;canvas.height=90;ctx.clearRect(0,0,180,90);ctx.save();ctx.translate(90,45);ctx.scale(.44,.44);ctx.translate(-200,-200);
    if(module&&data&&this.engine==='original'){const id=instance(palette,shape),scratch=module._malloc(16384*4);try{module._w8(id,1400);paint(ctx,paths(id,scratch));}finally{module._free(scratch);module._w15(id);}}
    else{const current=this.pet.palette,oldShape=this.pet.shape;this.pet.palette=palette;this.pet.shape=shape;this.fallback(ctx,0);this.pet.palette=current;this.pet.shape=oldShape;}ctx.restore();
  }
}

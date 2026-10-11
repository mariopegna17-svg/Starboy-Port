const STATES=['kpdhpvcju','lbxslfnxg','mcpfwucsm','nqzbkezbg'];
const BLINKS=['ajezs','bajhvf','cwiocc'];
const IDLE=['jjuy','ptenbyrcn','qmuusxmtv','rzufjwypm'];
const EXPRESSIONS=['uxonq','vidcr','wxaqs','xnbvl','ssjbxfj','tsjgjpc'];
const REACTIONS={
  pet:{duration:2600,affection:true,lean:.022,lift:2.5,blush:.55,kind:'heart',count:2},
  love:{duration:3400,affection:true,lean:.03,lift:3.5,blush:.8,kind:'heart',count:2},
  kiss:{duration:2900,affection:true,lean:.042,lift:4,blush:.7,kind:'heart',count:2},
  wave:{duration:1600,squint:.08,bounce:4,blush:.35,kind:'star',count:7},
  play:{duration:1800,squint:.06,bounce:7,blush:.2,kind:'star',count:10},
  calm:{duration:2600,squint:.18,bounce:0,blush:.45,kind:'star',count:5},
  feed:{duration:1800,squint:.13,bounce:3,blush:.5,kind:'star',count:7},
  curious:{duration:1900,squint:.03,bounce:0,blush:.12,kind:'star',count:3}
};
const smooth=value=>{const n=Math.max(0,Math.min(1,value));return n*n*(3-2*n);};
function heart(ctx,x,y,size){ctx.beginPath();ctx.moveTo(x,y+size*.8);ctx.bezierCurveTo(x-size*1.1,y,x-size*.85,y-size*.8,x,y-size*.3);ctx.bezierCurveTo(x+size*.85,y-size*.8,x+size*1.1,y,x,y+size*.8);ctx.closePath();}
function sparkle(ctx,size){ctx.beginPath();for(let i=0;i<8;i++){const angle=i*Math.PI/4-Math.PI/2,r=i%2?size*.28:size;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();}
function blush(ctx,strength){
  if(strength<=0)return;
  for(const x of [65,335]){
    ctx.save();ctx.translate(x,264);ctx.scale(1,.4);
    const glow=ctx.createRadialGradient(0,0,0,0,0,25);
    glow.addColorStop(0,`rgba(239,137,163,${strength*.18})`);glow.addColorStop(.45,`rgba(239,137,163,${strength*.07})`);glow.addColorStop(1,'rgba(239,137,163,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
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
  constructor(canvas,pet){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.pet=pet;this.gaze={x:0,y:0};this.target={x:0,y:0};this.id=-1;this.engine='loading';this.last=0;this.nextBlink=0;this.nextExpression=0;this.mood='happy';this.stars=[];this.reaction=null;this.blinkReaction=null;this.cached=null;this.dirty=true;this.running=true;this.onFrame=null;this.frameId=null;
    this.resize=()=>{const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);this.ratio=ratio;this.dirty=true;};
    this.onVisibility=()=>{this.last=performance.now();this.dirty=true;};
    this.resize();window.addEventListener('resize',this.resize);document.addEventListener('visibilitychange',this.onVisibility);
  }
  async init(){
    try{module=await window.eyeEngineReady;if(!this.running)return 'stopped';if(!module)throw new Error('Motor no disponible');const response=await fetch('/vendor/starboy/anim_data.bin');if(!response.ok)throw new Error('Datos no disponibles');data=new Uint8Array(await response.arrayBuffer());if(!this.running)return 'stopped';this.scratch=module._malloc(16384*4);this.id=instance(this.pet.palette,this.pet.shape);this.engine='original';module._w8(this.id,1000);}
    catch(error){console.warn('Se usa el motor de reserva:',error.message);this.releaseEngine();this.engine='fallback';}
    if(!this.running)return 'stopped';this.canvas.dataset.engine=this.engine;this.frameId=requestAnimationFrame(time=>this.frame(time));return this.engine;
  }
  setLook(palette,shape){if(this.id>=0){try{module._w5(this.id,palette);module._w3(this.id,string(STATES[shape]),0,1);}catch(error){this.useFallback(error);}}this.dirty=true;}
  look(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.target={x:Math.max(-.6,Math.min(.6,x)),y:Math.max(-.6,Math.min(.6,y))};}
  react(type='pet'){
    const now=performance.now(),previous=this.reactionState(now);
    if(type==='blink'){this.blinkReaction={startedAt:now,duration:340};this.nextBlink=Math.max(this.nextBlink,now+1200);this.dirty=true;return true;}
    const profile=REACTIONS[type];if(!profile)return false;
    const reduced=this.pet.settings.reducedMotion,duration=reduced?900:profile.duration;
    this.reaction={type,profile,startedAt:now,duration,initial:previous.strength,direction:previous.direction??(this.gaze.x<0?-1:1)};
    // Let the original renderer close its eyelids; preserve the pupils and eye shape.
    if(profile.affection&&!reduced&&previous.strength<.1){
      if(this.id>=0){try{module._w4(this.id,string(BLINKS[1]),1);}catch(error){this.useFallback(error);}}
      if(this.id<0)this.blinkReaction={startedAt:now,duration:420,eyelids:true};
    }
    this.spark(profile.kind,profile.count);this.nextExpression=now+duration+1500;this.nextBlink=Math.max(this.nextBlink,now+(profile.affection?duration+500:650));this.dirty=true;return true;
  }
  reactionState(time){
    const reaction=this.reaction;if(!reaction)return {strength:0};
    const age=Math.max(0,time-reaction.startedAt),progress=age/reaction.duration;
    if(progress>=1){this.reaction=null;return {strength:0};}
    const rise=reaction.initial+(1-reaction.initial)*smooth(progress/.16),fade=1-smooth((progress-.55)/.45);
    return {...reaction,strength:rise*fade,progress,age};
  }
  spark(kind='star',count=12){
    if(kind==='heart'){this.affectionHearts(count);return;}
    const reduced=this.pet.settings.reducedMotion;
    for(let i=0;i<Math.min(count,reduced?4:16);i++)this.stars.push({x:innerWidth/2+(Math.random()-.5)*innerWidth*.55,y:innerHeight*(.47+(Math.random()-.5)*.18),vx:reduced?0:(Math.random()-.5)*.04,vy:reduced?0:-.018-Math.random()*.036,age:0,lifetime:reduced?800:1400+Math.random()*650,kind,size:6+Math.random()*8,angle:(Math.random()-.5)*.7,spin:reduced?0:(Math.random()-.5)*.0004});
    this.stars=this.stars.slice(-(reduced?12:48));this.dirty=true;
  }
  affectionHearts(count=2){
    const reduced=this.pet.settings.reducedMotion,now=performance.now(),limit=Math.min(count,reduced?1:2);
    const active=this.stars.filter(p=>p.affection&&now-p.startedAt-p.delay<p.lifetime).slice(0,limit);
    // Repeated strokes keep the current hearts, rather than restarting a burst.
    for(const side of [-1,1]){
      if(active.length>=limit)break;if(active.some(p=>p.side===side))continue;
      active.push({affection:true,kind:'heart',side,startedAt:now,delay:reduced?0:260+(side===1?340:0),lifetime:reduced?900:1900,age:0,size:reduced?4.5:5.5});
    }
    this.stars=this.stars.filter(p=>!p.affection).concat(active);
    this.dirty=true;
  }
  drawAffectionHearts(ctx,time,reduced){
    for(const p of this.stars){
      if(!p.affection)continue;p.age=time-p.startedAt-p.delay;
      const progress=p.age/p.lifetime;if(progress<0||progress>=1)continue;
      const envelope=smooth(progress/.24)*(1-smooth((progress-.48)/.52)),travel=reduced?0:smooth(progress);
      ctx.save();ctx.globalAlpha=envelope*.65;ctx.fillStyle='#ed9cb0';ctx.translate(200+p.side*(174+travel*7),164-travel*24);ctx.rotate(reduced?0:p.side*.12);heart(ctx,0,0,p.size);ctx.fill();ctx.restore();
    }
  }
  frame(time){
    if(!this.running)return;this.frameId=requestAnimationFrame(t=>this.frame(t));
    const delta=Math.min(Math.max(time-this.last,0),50);this.last=time;if(document.hidden||this.suspended)return;
    if(this.pet.settings.reducedMotion&&time-(this.paintedAt||0)<100&&!this.dirty&&!this.stars.length)return;
    this.paintedAt=time;const dt=Math.floor(delta),ease=1-Math.exp(-delta/150);this.gaze.x+=(this.target.x-this.gaze.x)*ease;this.gaze.y+=(this.target.y-this.gaze.y)*ease;
    if(this.id>=0){
      try{
        if(dt>0)module._w8(this.id,dt);
        module._w7(this.id,this.gaze.x,-this.gaze.y);
        if(time>this.nextBlink){module._w4(this.id,string(BLINKS[Math.floor(Math.random()*BLINKS.length)]),1);this.nextBlink=time+2800+Math.random()*4200;}
        if(time>this.nextExpression&&!this.pet.settings.reducedMotion&&!this.reaction){module._w4(this.id,string(EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)]),1);this.nextExpression=time+6000+Math.random()*7000;}
      }catch(error){this.useFallback(error);}
    }
    this.render(time,delta);this.dirty=false;this.onFrame?.(time);
  }
  render(time,delta){
    const ctx=this.ctx,w=innerWidth,h=innerHeight;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    const reduced=this.pet.settings.reducedMotion;const breathe=reduced?1:1+Math.sin(time/2100)*.015;
    const reaction=this.reactionState(time),warmth=reaction.strength,profile=reaction.profile;
    let blink=0;if(this.blinkReaction){const progress=(time-this.blinkReaction.startedAt)/this.blinkReaction.duration;if(progress>=1)this.blinkReaction=null;else blink=progress<.4?smooth(progress/.4):1-smooth((progress-.4)/.6);}
    const clippedBlink=this.blinkReaction?.eyelids?blink:0;
    const immersive=document.querySelector('#universe')?.classList.contains('immersive');
    const scale=Math.min(w*.88/350,h*(immersive?.82:.62)/180)*breathe;
    let shakeX=0,shakeY=0,rotation=0;
    if(!reduced){if(this.mood==='cold')shakeX=Math.sin(time*.07)*3;if(this.mood==='dizzy')rotation=Math.sin(time*.003)*.06;if(this.mood==='playful')shakeY=Math.sin(time*.007)*9;if(profile){if(profile.affection){shakeY-=profile.lift*warmth;rotation+=profile.lean*reaction.direction*warmth;}else{shakeY-=Math.sin(reaction.progress*Math.PI*3)*profile.bounce*warmth;if(reaction.type==='wave')rotation+=Math.sin(reaction.progress*Math.PI*3)*.035*warmth;if(reaction.type==='curious')rotation+=.06*warmth;}}}
    ctx.save();ctx.translate(w/2+shakeX,h*.48+shakeY);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.translate(-200,-200);
    ctx.save();ctx.translate(200,200);ctx.scale(reduced||profile?.affection?1:1+warmth*.02,1-Math.min(.93,(clippedBlink?0:blink)*.92+(reduced?0:warmth*(profile?.squint||0))));ctx.translate(-200,-200);
    if(this.id>=0){try{
      const draws=paths(this.id,this.scratch);
      if(draws.length){this.blankAt=null;paint(ctx,draws);}
      else{this.blankAt??=time;if(time-this.blankAt>450)this.fallback(ctx,time,clippedBlink);}
    }catch(error){this.useFallback(error);this.fallback(ctx,time,clippedBlink);}}else this.fallback(ctx,time,clippedBlink);
    this.expression(ctx,time);ctx.restore();
    const restingBlush=this.mood==='loved'?.2:0;
    blush(ctx,restingBlush+warmth*((profile?.blush||0)-restingBlush));
    this.drawAffectionHearts(ctx,time,reduced);
    ctx.restore();
    for(const p of this.stars){
      if(p.affection)continue;
      p.age+=delta;if(!reduced){p.x+=p.vx*delta;p.y+=p.vy*delta;p.angle+=p.spin*delta;}
      const progress=p.age/p.lifetime,envelope=smooth(progress/.14)*(1-smooth((progress-.55)/.45));
      if(progress>=1)continue;ctx.save();ctx.globalAlpha=envelope*.9;ctx.fillStyle=p.kind==='heart'?'#ff9eb7':'#e7ffb9';ctx.translate(p.x,p.y);ctx.rotate(reduced?0:p.angle);ctx.scale(reduced?1:.65+envelope*.35,reduced?1:.65+envelope*.35);if(p.kind==='heart')heart(ctx,0,0,p.size);else sparkle(ctx,p.size);ctx.fill();ctx.restore();
    }
    this.stars=this.stars.filter(p=>p.age<p.lifetime);
    if(this.mood==='asleep'){ctx.fillStyle='#b7bdd0';ctx.font='16px monospace';ctx.fillText('z',w*.65,h*.26+(reduced?0:Math.sin(time*.001)*5));ctx.font='23px monospace';ctx.fillText('Z',w*.69,h*.2);}
  }
  releaseEngine(){
    if(module&&this.id>=0){try{module._w15(this.id);}catch{}}this.id=-1;
    if(module&&this.scratch!=null){try{module._free(this.scratch);}catch{}}this.scratch=null;
  }
  useFallback(error){console.warn('Recuperando los ojos:',error?.message);this.releaseEngine();this.engine='fallback';this.canvas.dataset.engine='fallback';}
  destroy(){
    this.running=false;if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;
    window.removeEventListener('resize',this.resize);document.removeEventListener('visibilitychange',this.onVisibility);
    this.releaseEngine();this.stars=[];this.reaction=null;this.blinkReaction=null;this.onFrame=null;
  }
  fallback(ctx,time,blink=0){
    const hue=this.pet.palette*137.508%360,color=`hsl(${hue} 80% 70%)`;
    for(const x of [125,275]){ctx.save();ctx.translate(x,200);ctx.scale(1,.94+(this.pet.settings.reducedMotion?0:Math.sin(time*.002)*.025));if(blink>0){ctx.beginPath();ctx.rect(-55,-50+49*blink,110,100-98*blink);ctx.clip();}ctx.fillStyle=color;ctx.beginPath();const round=this.pet.shape===0?42:50;ctx.roundRect(-round,-50,round*2,100,this.pet.shape===2?[10,40,35,35]:this.pet.shape===3?[50,50,18,18]:round);ctx.fill();ctx.fillStyle=`hsl(${hue} 45% 27%)`;ctx.beginPath();ctx.ellipse(this.gaze.x*20,this.gaze.y*15,22,30,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-8+this.gaze.x*10,-20+this.gaze.y*8,10,7,-.3,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  expression(ctx,time){
    const mood=this.mood;
    if(['sleepy','asleep'].includes(mood)){ctx.fillStyle='#050607';ctx.fillRect(35,80,330,mood==='asleep'?120:100);if(mood==='asleep')ctx.fillRect(35,214,330,100);}
    if(['angry','anxious','sad','hungry'].includes(mood)){
      ctx.fillStyle='#050607';for(const [x,sign] of [[125,1],[275,-1]]){ctx.save();ctx.translate(x,154);ctx.rotate((mood==='angry'?.16:-.12)*sign);ctx.fillRect(-65,-50,130,48);ctx.restore();}
    }
    if(mood==='sad'){ctx.fillStyle='rgba(146,208,255,.7)';for(const x of [83,316]){const y=235+(time/20%30);ctx.beginPath();ctx.ellipse(x,y,3,5,0,0,Math.PI*2);ctx.fill();}}
  }
  thumbnail(canvas,palette,shape){
    const ctx=canvas.getContext('2d');canvas.width=180;canvas.height=90;ctx.clearRect(0,0,180,90);ctx.save();ctx.translate(90,45);ctx.scale(.44,.44);ctx.translate(-200,-200);
    if(module&&data&&this.engine==='original'){const id=instance(palette,shape),scratch=module._malloc(16384*4);try{module._w8(id,1400);paint(ctx,paths(id,scratch));}finally{module._free(scratch);module._w15(id);}}
    else{const current=this.pet.palette,oldShape=this.pet.shape;this.pet.palette=palette;this.pet.shape=shape;this.fallback(ctx,0);this.pet.palette=current;this.pet.shape=oldShape;}ctx.restore();
  }
}

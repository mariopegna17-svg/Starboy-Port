import {MotionPlayer,MoodBlend,ease,neutralPose} from './motion.js';
const STATES=['kpdhpvcju','lbxslfnxg','mcpfwucsm','nqzbkezbg'];
const BLINKS=['ajezs','bajhvf','cwiocc'];
const IDLE=['jjuy','ptenbyrcn','qmuusxmtv','rzufjwypm'];
const REACTIONS={
  pet:{duration:2600,affection:true,lean:.022,lift:2.5,blush:.55,kind:'heart',count:2},
  love:{duration:3400,affection:true,lean:.03,lift:3.5,blush:.8,kind:'heart',count:2},
  kiss:{duration:2900,affection:true,lean:.042,lift:4,blush:.7,kind:'heart',count:2},
  wave:{duration:2200,motion:'wave',blush:.3,kind:'star',count:4},
  play:{duration:2300,motion:'play',blush:.2,kind:'star',count:5},
  calm:{duration:3300,motion:'sigh',blush:.4,kind:'heart',count:1},
  feed:{duration:2900,motion:'feed',blush:.35,kind:'star',count:3},
  curious:{duration:2600,motion:'curious',blush:.1,kind:'star',count:0},
  celebrate:{duration:2600,motion:'celebrate',blush:.3,kind:'star',count:5},
  surprise:{duration:1700,grow:.035,bounce:0,blush:.1,kind:'star',count:2},
  nod:{duration:1500,motion:'nod',blush:.15,kind:'star',count:0},
  nope:{duration:1700,motion:'nope',blush:.1,kind:'star',count:0},
  sleep:{duration:2800,motion:'sleep',blush:0,kind:'star',count:0},
  wake:{duration:3200,motion:'wake',blush:.2,kind:'star',count:1},
  welcome:{duration:2700,motion:'welcome',blush:.3,kind:'heart',count:1},
  return:{duration:2000,motion:'welcome',blush:.2,kind:'star',count:0},
  discover:{duration:2400,motion:'proud',blush:.2,kind:'star',count:3},
  thumbs:{duration:2400,motion:'proud',blush:.15,kind:'star',count:0},
  middle:{duration:3300,motion:'sigh',blush:0,kind:'star',count:0},
  shake:{duration:2100,motion:'startle',blush:0,kind:'star',count:0},
  'look-left':{duration:1900,gaze:{x:-.42,y:0},bounce:0,blush:0,kind:'star',count:0},
  'look-right':{duration:1900,gaze:{x:.42,y:0},bounce:0,blush:0,kind:'star',count:0},
  'look-up':{duration:1900,gaze:{x:0,y:-.35},bounce:0,blush:0,kind:'star',count:0},
  'look-down':{duration:1900,gaze:{x:0,y:.35},bounce:0,blush:0,kind:'star',count:0}
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
    if(!points||values.subarray(start,start+points*2).some(value=>!Number.isFinite(value)||Math.abs(value)>10000)){offset+=6+points*2;continue;}
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
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.pet=pet;this.gaze={x:0,y:0};this.target={x:0,y:0};this.id=-1;this.engine='loading';this.last=0;this.nextBlink=0;this._mood='happy';this.moodBlend=new MoodBlend();this.motion=new MotionPlayer();this.motion.clear(performance.now());this.attentionUntil=0;this.attentionWeight=0;this.idleAllowed=null;this._suspended=false;this.stars=[];this.reaction=null;this.blinkReaction=null;this.dirty=true;this.running=true;this.onFrame=null;this.frameId=null;
    this.resize=()=>{const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);this.ratio=ratio;this.dirty=true;};
    this.onVisibility=()=>{const now=performance.now();this.last=now;this.resetMotion(now);if(!document.hidden&&!this.suspended&&this.pet.hatched&&this.idleAllowed?.()!==false)this.react('return');};
    this.resize();window.addEventListener('resize',this.resize);document.addEventListener('visibilitychange',this.onVisibility);
  }
  get mood(){return this._mood;}
  set mood(value){if(value===this._mood)return;this._mood=value;this.moodBlend.set(value,performance.now());if(value==='asleep')this.closeForSleep();this.dirty=true;}
  closeForSleep(){this.sleepRemaining=280;if(this.id>=0){try{module._w4(this.id,string(BLINKS[1]),1);}catch(error){this.useFallback(error);}}}
  recoverDrawing(time){
    this.recoveryPending=false;this.transparentSince=null;this.nextProbe=time+400;this.resize();
    if(this.id<0)return;
    try{
      if((this.recoveries||0)>=2)throw new Error('El motor dejó de dibujar los ojos.');
      this.recoveries=(this.recoveries||0)+1;this.releaseEngine();this.scratch=module._malloc(16384*4);this.id=instance(this.pet.palette,this.pet.shape);
      for(let elapsed=0;elapsed<1000;elapsed+=25)module._w8(this.id,25);
      if(this.mood==='asleep'){this.closeForSleep();for(let elapsed=0;elapsed<280;elapsed+=20)module._w8(this.id,20);this.sleepRemaining=0;}
    }catch(error){this.useFallback(error);}
  }
  checkDrawing(time){
    // Valid native paths can still paint nothing. Probe the eye layer before
    // particles and blush, and rebuild only after a sustained empty picture.
    if(this.id<0||time<(this.nextProbe||0))return;this.nextProbe=time+400;
    if(!this.probe){this.probe=document.createElement('canvas');this.probe.width=64;this.probe.height=32;this.probeCtx=this.probe.getContext('2d',{willReadFrequently:true});this.probeCtx.imageSmoothingQuality='high';}
    const ctx=this.probeCtx;ctx.clearRect(0,0,64,32);ctx.drawImage(this.canvas,0,0,64,32);
    const pixels=ctx.getImageData(0,0,64,32).data;let visible=false;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0){visible=true;break;}
    if(visible)this.transparentSince=null;else{this.transparentSince??=time;if(time-this.transparentSince>=800)this.recoveryPending=true;}
  }
  get suspended(){return this._suspended;}
  set suspended(value){if(Boolean(value)===this._suspended)return;this._suspended=Boolean(value);this.resetMotion(performance.now());}
  resetMotion(time){this.motion.clear(time);this.reaction=null;this.blinkReaction=null;this.stars=[];this.advancedAt=time;this.nextBlink=time+2500;this.dirty=true;}
  async init(){
    try{module=await window.eyeEngineReady;if(!this.running)return 'stopped';if(!module)throw new Error('Motor no disponible');const response=await fetch('/vendor/starboy/anim_data.bin');if(!response.ok)throw new Error('Datos no disponibles');data=new Uint8Array(await response.arrayBuffer());if(!this.running)return 'stopped';this.scratch=module._malloc(16384*4);this.id=instance(this.pet.palette,this.pet.shape);this.engine='original';module._w8(this.id,1000);if(this.mood==='asleep')this.closeForSleep();}
    catch(error){console.warn('Se usa el motor de reserva:',error.message);this.releaseEngine();this.engine='fallback';}
    if(!this.running)return 'stopped';this.canvas.dataset.engine=this.engine;this.frameId=requestAnimationFrame(time=>this.frame(time));return this.engine;
  }
  setLook(palette,shape){if(this.id>=0){try{module._w5(this.id,palette);module._w3(this.id,string(STATES[shape]),0,1);if(this.mood==='asleep')this.closeForSleep();}catch(error){this.useFallback(error);}}this.dirty=true;}
  look(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.target={x:Math.max(-.6,Math.min(.6,x)),y:Math.max(-.6,Math.min(.6,y))};this.attentionUntil=performance.now()+1200;}
  motionPose(time){const pose=this.pet.settings.reducedMotion?neutralPose():this.motion.pose(time);if(this.motion.current?.source!=='reaction'){pose.gazeX*=1-this.attentionWeight;pose.gazeY*=1-this.attentionWeight;}return pose;}
  expressionPose(reaction){const pose=neutralPose();if(this.pet.settings.reducedMotion)return pose;if(reaction.profile?.affection){pose.y-=reaction.profile.lift*reaction.strength;pose.tilt+=reaction.profile.lean*reaction.direction*reaction.strength;}pose.scale+=(reaction.profile?.grow||0)*reaction.strength;return pose;}
  poseAt(time){const pose=this.motionPose(time),expression=this.expressionPose(this.reactionState(time));for(const key of Object.keys(pose))pose[key]+=expression[key];return pose;}
  visibleGaze(time){const reaction=this.reactionState(time),pose=this.motionPose(time),offset=reaction.profile?.gaze,clamp=value=>Math.max(-.6,Math.min(.6,value));return {x:clamp(this.gaze.x+pose.gazeX+(offset?.x||0)*reaction.strength),y:clamp(this.gaze.y+pose.gazeY+(offset?.y||0)*reaction.strength)};}
  blink(time=performance.now()){
    if(this.mood==='asleep')return;
    if(this.id>=0){try{module._w4(this.id,string(BLINKS[1]),1);}catch(error){this.useFallback(error);}}
    this.blinkReaction={startedAt:time,duration:420,eyelids:true};this.nextBlink=Math.max(this.nextBlink,time+1600);this.dirty=true;
  }
  react(type='pet'){
    const now=performance.now(),previous=this.reactionState(now);
    if(type==='blink'){this.blink(now);return true;}
    const profile=REACTIONS[type];if(!profile)return false;
    const reduced=this.pet.settings.reducedMotion,duration=reduced?900:profile.duration;
    const initial=this.poseAt(now);
    this.reaction={type,profile,startedAt:now,duration,initial:previous.strength,direction:previous.direction??(this.gaze.x<0?-1:1)};
    const expression=this.expressionPose({...this.reaction,strength:previous.strength});for(const key of Object.keys(initial))initial[key]-=expression[key];
    if(!reduced)this.motion.play(profile.motion||'',now,{duration,direction:this.reaction.direction,initial});else this.motion.clear(now);
    // Let the original renderer close its eyelids; preserve the pupils and eye shape.
    if(profile.affection&&!reduced&&previous.strength<.1){
      this.blink(now);
    }
    this.spark(profile.kind,profile.count);this.nextBlink=Math.max(this.nextBlink,now+(profile.affection?duration+500:650));this.dirty=true;return true;
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
    this.last=time;if(document.hidden||this.suspended)return;
    if(this.recoveryPending||this.ctx.isContextLost?.())this.recoverDrawing(time);
    if(this.pet.settings.reducedMotion&&time-(this.paintedAt||0)<100&&!this.dirty&&!this.stars.length)return;
    const delta=Math.min(Math.max(time-(this.advancedAt??time-16),0),100);this.advancedAt=time;
    this.paintedAt=time;const dt=Math.floor(delta),follow=1-Math.exp(-delta/150);this.gaze.x+=(this.target.x-this.gaze.x)*follow;this.gaze.y+=(this.target.y-this.gaze.y)*follow;
    this.attentionWeight+=((time<this.attentionUntil?1:0)-this.attentionWeight)*follow;
    const reaction=this.reactionState(time);
    const events=this.motion.tick(time,{mood:this.mood,traits:this.pet.behaviors||[this.pet.trait],blocked:this.pet.hatched===false||this.idleAllowed?.()===false,reduced:this.pet.settings.reducedMotion,busy:!!reaction.profile});
    if(events.length)this.blink(time);
    if(time>this.nextBlink&&this.mood!=='asleep'&&!this.pet.settings.reducedMotion){this.blink(time);this.nextBlink=time+4000+Math.random()*4000;}
    if(this.id>=0){
      try{
        const sleeping=this.mood==='asleep',step=sleeping?Math.min(dt,this.sleepRemaining||0):dt;
        // Small native steps also cover reduced frame rates and camera stalls.
        for(let left=step;left>0;left-=25)module._w8(this.id,Math.min(left,25));if(sleeping)this.sleepRemaining=Math.max(0,(this.sleepRemaining||0)-step);
        const gaze=sleeping?{x:0,y:0}:this.visibleGaze(time);module._w7(this.id,gaze.x,-gaze.y);
      }catch(error){this.useFallback(error);}
    }
    this.render(time,delta);this.dirty=false;this.onFrame?.(time);
  }
  render(time,delta){
    const ctx=this.ctx,w=innerWidth,h=innerHeight;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    const reduced=this.pet.settings.reducedMotion,weights=reduced?{[this.mood]:1}:this.moodBlend.at(time),pose=this.poseAt(time);
    const sleeping=weights.asleep||0;const breathe=reduced?1:1+Math.sin(time/(sleeping>.5?3600:2300))*(.012-sleeping*.007);
    const reaction=this.reactionState(time),warmth=reaction.strength,profile=reaction.profile;
    let blink=0;if(this.blinkReaction){const progress=(time-this.blinkReaction.startedAt)/this.blinkReaction.duration;if(progress>=1)this.blinkReaction=null;else blink=progress<.4?smooth(progress/.4):1-smooth((progress-.4)/.6);}
    const clippedBlink=this.blinkReaction?.eyelids?blink:0;
    const immersive=document.querySelector('#universe')?.classList.contains('immersive');
    const scale=Math.min(w*.88/350,h*(immersive?.82:.62)/180)*breathe*(1+Math.max(-.02,Math.min(.05,pose.scale)));
    let shakeX=pose.x,shakeY=pose.y,rotation=pose.tilt;
    if(!reduced){rotation+=Math.sin(time*.0024)*.045*(weights.dizzy||0);shakeY+=Math.sin(time*.0025)*1.5*((weights.happy||0)+(weights.loved||0));shakeY+=Math.sin(time*.003)*1.8*(weights.playful||0);shakeY+=Math.sin(time*.0015)*1.2*sleeping;}
    rotation=Math.max(-.085,Math.min(.085,rotation));shakeX=Math.max(-6,Math.min(6,shakeX));shakeY=Math.max(-10,Math.min(10,shakeY));
    ctx.save();ctx.translate(w/2+shakeX,h*.48+shakeY);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.translate(-200,-200);
    ctx.save();
    if(this.id>=0){try{
      const draws=paths(this.id,this.scratch);
      if(draws.length){this.blankAt=null;paint(ctx,draws);}
      else{this.blankAt??=time;if(time-this.blankAt>450){this.recoveryPending=true;this.fallback(ctx,time,clippedBlink);}}
    }catch(error){this.useFallback(error);this.fallback(ctx,time,clippedBlink);}}else this.fallback(ctx,time,clippedBlink);
    this.expression(ctx,time,weights);ctx.restore();this.checkDrawing(time);
    const restingBlush=(weights.loved||0)*.2;
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
    if(sleeping>.01){ctx.save();ctx.fillStyle='#b7bdd0';for(const [i,label] of ['z','Z'].entries()){const progress=((time+i*1700)%4800)/4800;ctx.globalAlpha=sleeping*(reduced?1:smooth(progress/.2)*(1-smooth((progress-.7)/.3)));ctx.font=`${16+i*7}px monospace`;ctx.fillText(label,w*(.65+i*.04),h*(.26-i*.04)-(reduced?0:progress*12));}ctx.restore();}
  }
  releaseEngine(){
    if(module&&this.id>=0){try{module._w15(this.id);}catch{}}this.id=-1;
    if(module&&this.scratch!=null){try{module._free(this.scratch);}catch{}}this.scratch=null;
  }
  useFallback(error){console.warn('Recuperando los ojos:',error?.message);this.releaseEngine();this.engine='fallback';this.canvas.dataset.engine='fallback';}
  destroy(){
    this.running=false;if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;
    window.removeEventListener('resize',this.resize);document.removeEventListener('visibilitychange',this.onVisibility);
    this.releaseEngine();this.motion.clear();this.probe=null;this.probeCtx=null;this.stars=[];this.reaction=null;this.blinkReaction=null;this.onFrame=null;
  }
  fallback(ctx,time,blink=0){
    const gaze=this.visibleGaze(time),reduced=this.pet.settings.reducedMotion;
    const asleep=reduced?(this.mood==='asleep'?1:0):(this.moodBlend.at(time).asleep||0);
    const hue=this.pet.palette*137.508%360,color=`hsl(${hue} 80% 70%)`;
    for(const x of [125,275]){
      ctx.save();ctx.translate(x,200);ctx.scale(1,.94+(reduced?0:Math.sin(time*.002)*.025));
      const round=this.pet.shape===0?42:50;
      ctx.save();ctx.globalAlpha*=1-asleep;
      if(blink>0){ctx.beginPath();ctx.rect(-55,-50+49*blink,110,100-98*blink);ctx.clip();}
      ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-round,-50,round*2,100,this.pet.shape===2?[10,40,35,35]:this.pet.shape===3?[50,50,18,18]:round);ctx.fill();
      ctx.fillStyle=`hsl(${hue} 45% 27%)`;ctx.beginPath();ctx.ellipse(gaze.x*20,gaze.y*15,22,30,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-8+gaze.x*10,-20+gaze.y*8,10,7,-.3,0,Math.PI*2);ctx.fill();ctx.restore();
      if(asleep>.001){ctx.globalAlpha*=asleep;ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-round*.82,9);ctx.quadraticCurveTo(0,25,round*.82,9);ctx.stroke();}
      ctx.restore();
    }
  }
  expression(ctx,time,weights){
    const sleepy=weights.sleepy||0;ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
    if(sleepy>.01)ctx.fillRect(35,20,330,160*sleepy);
    const negative=['angry','anxious','sad','hungry'].reduce((sum,mood)=>sum+(weights[mood]||0),0);
    if(negative>.01){const tilt=((weights.angry||0)*.16-(negative-(weights.angry||0))*.12);for(const [x,sign] of [[125,1],[275,-1]]){ctx.save();ctx.translate(x,154-(1-negative)*35);ctx.rotate(tilt*sign);ctx.fillRect(-65,-50,130,48);ctx.restore();}}
    ctx.restore();
    if((weights.sad||0)>.01){for(const [i,x] of [83,316].entries()){const progress=((time+i*850)%2200)/2200,reduced=this.pet.settings.reducedMotion;ctx.fillStyle=`rgba(146,208,255,${(weights.sad||0)*.7*(reduced?1:smooth(progress/.15)*(1-smooth((progress-.7)/.3)))})`;ctx.beginPath();ctx.ellipse(x,235+(reduced?8:progress*37),3,5,0,0,Math.PI*2);ctx.fill();}}
  }
  thumbnail(canvas,palette,shape){
    const ctx=canvas.getContext('2d');canvas.width=180;canvas.height=90;ctx.clearRect(0,0,180,90);ctx.save();ctx.translate(90,45);ctx.scale(.44,.44);ctx.translate(-200,-200);
    if(module&&data&&this.engine==='original'){const id=instance(palette,shape),scratch=module._malloc(16384*4);try{module._w8(id,1400);paint(ctx,paths(id,scratch));}finally{module._free(scratch);module._w15(id);}}
    else{const current=this.pet.palette,oldShape=this.pet.shape;this.pet.palette=palette;this.pet.shape=shape;this.fallback(ctx,0);this.pet.palette=current;this.pet.shape=oldShape;}ctx.restore();
  }
}

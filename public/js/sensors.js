import {Vision} from './vision.js';
import {GestureGate,FaceGate,gestureName} from './gesture.js';
import {GazeTracker} from './tracking.js';

const NOTES={camera:'Sigue tu cabeza y reconoce manos, sonrisas, besos y parpadeos.',microphone:'El ruido fuerte lo pone nervioso.',motion:'Inclina o agita suavemente el iPhone.'};
const stopTracks=stream=>stream?.getTracks().forEach(track=>track.stop());

export class Sensors {
  constructor(callbacks){
    this.callbacks=callbacks;this.state={microphone:'off',camera:'off',motion:'off'};this.streams={};this.generation={microphone:0,camera:0,motion:0};
    this.video=document.querySelector('#camera-video')||document.createElement('video');
    this.video.muted=true;this.video.playsInline=true;this.video.setAttribute('playsinline','');
    this.lightCanvas=document.createElement('canvas');this.lightCanvas.width=this.lightCanvas.height=16;
    this.lightCtx=this.lightCanvas.getContext('2d',{willReadFrequently:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
  }
  status(name,state,message=NOTES[name]){this.state[name]=state;this.callbacks.status?.(name,state,message);}
  async toggle(name){if(['on','loading'].includes(this.state[name]))this.stop(name);else await this[name]();}
  watch(name,stream,generation){
    for(const track of stream.getTracks())track.addEventListener('ended',()=>{
      if(generation!==this.generation[name])return;
      this.stop(name);this.status(name,'error','El dispositivo interrumpió este sensor. Toca Activar para volver a conectarlo.');
    },{once:true});
  }
  async microphone(){
    const generation=++this.generation.microphone;this.status('microphone','loading');
    let context,stream;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('El micrófono necesita HTTPS y un navegador compatible.');
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Audio no disponible.');
      context=new Context();this.audioContext=context;
      // Safari requires resume() to originate from the activation tap.
      await context.resume();if(generation!==this.generation.microphone){await context.close().catch(()=>{});return;}
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
      if(generation!==this.generation.microphone){stopTracks(stream);return;}
      this.streams.microphone=stream;this.watch('microphone',stream,generation);
      const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=512;source.connect(analyser);
      const values=new Uint8Array(analyser.fftSize);
      context.onstatechange=()=>{if(generation===this.generation.microphone&&['interrupted','suspended'].includes(context.state)){this.stop('microphone');this.status('microphone','paused','Sonido pausado. Toca Reanudar para escuchar el ambiente.');}};
      this.status('microphone','on','Solo se mide el volumen; no se graba ni se envía audio.');
      this.noiseTimer=setInterval(()=>{
        if(document.hidden)return;analyser.getByteTimeDomainData(values);
        const rms=Math.sqrt(values.reduce((sum,v)=>sum+((v-128)/128)**2,0)/values.length);
        this.callbacks.noise?.(Math.min(100,rms*400));
      },200);
    }catch(error){
      stopTracks(stream);await context?.close().catch(()=>{});
      if(generation!==this.generation.microphone)return;
      this.stop('microphone');this.status('microphone','error',this.explain(error,'micrófono'));
    }
  }
  async motion(){
    const generation=++this.generation.motion;this.status('motion','loading');
    try{
      if(!window.DeviceMotionEvent)throw new Error('Este navegador no ofrece movimiento. Usa «Sacudir» en Ambiente.');
      if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('Permiso de movimiento denegado.');
      if(generation!==this.generation.motion)return;this.lastVector=null;this.shakeAt=0;this.gravityOrigin=null;
      this.motionHandler=event=>{
        const a=event.accelerationIncludingGravity||event.acceleration;
        if(!a||![a.x,a.y,a.z].every(Number.isFinite))return;
        const vector=[a.x,a.y,a.z];
        if(this.lastVector&&Math.hypot(...vector.map((v,i)=>v-this.lastVector[i]))>19&&Date.now()-this.shakeAt>5000){this.shakeAt=Date.now();this.callbacks.motion?.();}
        this.lastVector=vector;
        const angle=(screen.orientation?.angle??window.orientation??0)*Math.PI/180;
        const rotated=[a.x*Math.cos(angle)-a.y*Math.sin(angle),a.x*Math.sin(angle)+a.y*Math.cos(angle)];
        if(this.motionAngle!==angle){this.motionAngle=angle;this.gravityOrigin=null;}
        this.gravityOrigin ||=rotated;
        if(!this.tracker||performance.now()-Math.max(this.tracker.faceAt,this.tracker.handAt)>1000)this.callbacks.gaze?.((rotated[0]-this.gravityOrigin[0])/20,-(rotated[1]-this.gravityOrigin[1])/25);
      };
      window.addEventListener('devicemotion',this.motionHandler);this.status('motion','on','Mueve suavemente el iPhone; agítalo para marearlo.');
    }catch(error){if(generation===this.generation.motion)this.status('motion','error',this.explain(error,'movimiento'));}
  }
  async camera(){
    const generation=++this.generation.camera;this.status('camera','loading','Preparando cámara y gestos. Puedes cancelar mientras carga.');
    let stream,vision;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('La cámara necesita HTTPS.');
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:480},height:{ideal:360},frameRate:{ideal:15}},audio:false});}
      catch(error){if(error.name!=='OverconstrainedError'||generation!==this.generation.camera)throw error;stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}
      if(generation!==this.generation.camera){stopTracks(stream);return;}
      this.streams.camera=stream;this.watch('camera',stream,generation);
      this.video.srcObject=stream;await this.video.play();
      if(generation!==this.generation.camera)return;
      vision=new Vision();this.vision=vision;await vision.init();
      if(generation!==this.generation.camera){vision.close();return;}
      this.gate=new GestureGate();this.faceGate=new FaceGate();this.tracker=new GazeTracker();this.lastVideoTime=-1;this.lightFrames=0;this.brightness=null;
      this.status('camera','on',vision.faceEnabled?'Sigue tu cabeza. Prueba una sonrisa, un beso, OK, una pinza o saludar con la mano.':'Gestos de mano activos. El modelo facial no está disponible; vuelve a activar con conexión para seguir tu cabeza.');
      this.schedule(generation);
    }catch(error){
      if(generation!==this.generation.camera){stopTracks(stream);vision?.close();return;}
      this.stop('camera');this.status('camera','error',this.explain(error,'cámara'));
    }
  }
  schedule(generation){this.cameraTimer=setTimeout(()=>this.detect(generation),this.vision?.mode==='worker'?80:180);}
  async detect(generation){
    if(generation!==this.generation.camera||document.hidden)return;
    try{
      if(this.video.readyState>=2&&this.video.currentTime!==this.lastVideoTime){
        this.lastVideoTime=this.video.currentTime;
        const result=await this.vision.recognize(this.video,performance.now());
        if(generation!==this.generation.camera)return;
        const now=performance.now(),gaze=this.tracker.update(result,now);
        if(this.state.motion!=='on'||now-Math.max(this.tracker.faceAt,this.tracker.handAt)<=1000)this.callbacks.gaze?.(gaze.x,gaze.y);
        if(result.handsFresh!==false){const action=this.gate.read(gestureName(result),result.landmarks?.[0],now);if(action)this.callbacks.gesture?.(action);}
        if(result.faceFresh!==false){const action=this.faceGate.read(result.face,now);if(action)this.callbacks.gesture?.(action);}
        this.lightCtx.drawImage(this.video,0,0,16,16);const pixels=this.lightCtx.getImageData(0,0,16,16).data;
        let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
        const brightness=sum/(pixels.length/4)/255;this.brightness=this.brightness===null?brightness:this.brightness*.85+brightness*.15;
        if(++this.lightFrames>12)this.callbacks.light?.(this.brightness);
      }
      this.schedule(generation);
    }catch(error){if(generation!==this.generation.camera)return;this.stop('camera');this.status('camera','error',this.explain(error,'cámara'));}
  }
  explain(error,name){
    if(error.name==='NotAllowedError')return `Permiso de ${name} denegado. Habilítalo en los ajustes de Safari y vuelve a tocar Activar.`;
    if(error.name==='NotFoundError')return `No se encontró ${name} en este dispositivo.`;
    if(error.name==='NotReadableError')return 'Otro proceso está usando la cámara o el micrófono. Ciérralo y vuelve a activar el sensor.';
    if(error.name==='TimeoutError')return 'La descarga de gestos tardó demasiado. Comprueba la conexión y vuelve a activar la cámara.';
    return error.message||`No se pudo activar ${name}.`;
  }
  stop(name){
    ++this.generation[name];
    if(name==='camera'){
      clearTimeout(this.cameraTimer);this.vision?.close();this.vision=null;
      this.video.pause();this.video.srcObject=null;this.tracker=null;this.callbacks.gaze?.(0,0);
    }
    if(name==='microphone'){clearInterval(this.noiseTimer);this.audioContext?.close().catch(()=>{});this.audioContext=null;this.callbacks.noise?.(0);}
    if(name==='motion'){window.removeEventListener('devicemotion',this.motionHandler);this.callbacks.gaze?.(0,0);}
    stopTracks(this.streams[name]);delete this.streams[name];this.status(name,'off');
  }
  pause(){for(const name of Object.keys(this.state))if(['loading','on'].includes(this.state[name])){this.stop(name);this.status(name,'paused','Pausado al salir de la app. Toca Reanudar para volver a activarlo.');}}
  stopAll(){for(const name of Object.keys(this.state))this.stop(name);}
}

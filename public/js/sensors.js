export class Sensors {
  constructor({noise,motion,gesture,status,gaze,light}){this.callbacks={noise,motion,gesture,status,gaze,light};this.state={microphone:'off',camera:'off',motion:'off'};this.streams={};this.generation={microphone:0,camera:0,motion:0};this.video=document.createElement('video');this.video.muted=true;this.video.playsInline=true;this.video.setAttribute('playsinline','');this.video.setAttribute('aria-hidden','true');this.video.style.cssText='position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;bottom:0;left:0';document.body.append(this.video);this.lightCanvas=document.createElement('canvas');this.lightCanvas.width=16;this.lightCanvas.height=16;this.lightCtx=this.lightCanvas.getContext('2d',{willReadFrequently:true});}
  status(name,state,message=''){this.state[name]=state;this.callbacks.status?.(name,state,message);}
  async toggle(name){if(this.state[name]==='on'||this.state[name]==='loading'){this.stop(name);return;}await this[name]();}
  async microphone(){
    const generation=++this.generation.microphone;this.status('microphone','loading');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('El micrófono necesita HTTPS y un navegador compatible.');
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Audio no disponible.');
      // Resume from the user's tap before the permission promise completes (Safari).
      this.audioContext=new Context();await this.audioContext.resume();
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
      if(generation!==this.generation.microphone){stream.getTracks().forEach(t=>t.stop());return;}
      this.streams.microphone=stream;const source=this.audioContext.createMediaStreamSource(stream),analyser=this.audioContext.createAnalyser();analyser.fftSize=512;source.connect(analyser);this.analyser=analyser;const values=new Uint8Array(analyser.fftSize);this.status('microphone','on','Solo se mide el volumen; no se graba ni se envía audio.');
      this.noiseTimer=setInterval(()=>{if(document.hidden)return;analyser.getByteTimeDomainData(values);const rms=Math.sqrt(values.reduce((sum,v)=>sum+((v-128)/128)**2,0)/values.length);this.callbacks.noise?.(Math.min(100,rms*400));},200);
    }catch(error){if(generation!==this.generation.microphone)return;this.stop('microphone');this.status('microphone','error',this.explain(error,'micrófono'));}
  }
  async motion(){
    const generation=++this.generation.motion;this.status('motion','loading');
    try{
      if(!window.DeviceMotionEvent)throw new Error('Este navegador no ofrece movimiento. Usa «Sacudir» en Ambiente.');
      if(typeof DeviceMotionEvent.requestPermission==='function' && await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('Permiso de movimiento denegado.');
      if(generation!==this.generation.motion)return;this.lastVector=null;this.shakeAt=0;
      this.motionHandler=event=>{
        const a=event.accelerationIncludingGravity||event.acceleration;if(!a||a.x==null)return;
        const vector=[a.x,a.y,a.z];if(this.lastVector){const delta=Math.hypot(...vector.map((v,i)=>v-this.lastVector[i]));if(delta>19&&Date.now()-this.shakeAt>5000){this.shakeAt=Date.now();this.callbacks.motion?.();}}
        this.lastVector=vector;this.callbacks.gaze?.(Math.max(-.5,Math.min(.5,a.x/20)),Math.max(-.4,Math.min(.4,-a.y/25)));
      };window.addEventListener('devicemotion',this.motionHandler);this.status('motion','on','Mueve suavemente el iPhone; agítalo para marearlo.');
    }catch(error){if(generation===this.generation.motion)this.status('motion','error',this.explain(error,'movimiento'));}
  }
  async camera(){
    const generation=++this.generation.camera;this.status('camera','loading','Preparando la cámara y el reconocimiento de gestos…');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('La cámara necesita HTTPS.');
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:480},height:{ideal:360},frameRate:{ideal:15,max:20}},audio:false});
      if(generation!==this.generation.camera){stream.getTracks().forEach(t=>t.stop());return;}
      this.streams.camera=stream;this.video.srcObject=stream;await this.video.play();
      const {FilesetResolver,GestureRecognizer}=await import('/vendor/vision/vision_bundle.mjs');
      const vision=await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
      const model=await fetch('/models/gesture_recognizer.task',{method:'HEAD'});
      const options={baseOptions:{modelAssetPath:model.ok?'/models/gesture_recognizer.task':'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55};
      const recognizer=await GestureRecognizer.createFromOptions(vision,options);
      if(generation!==this.generation.camera){recognizer.close();return;}
      this.recognizer=recognizer;this.status('camera','on','Gestos procesados en este dispositivo. La imagen no sale del navegador.');this.lastGesture='';this.lastGestureAt=0;this.lastVideoTime=-1;this.gestureCandidate='';this.gestureFrames=0;
      this.cameraTimer=setInterval(()=>this.detect(),160);
    }catch(error){if(generation!==this.generation.camera)return;this.stop('camera');this.status('camera','error',this.explain(error,'cámara o modelo de gestos'));}
  }
  detect(){
    if(document.hidden||!this.recognizer||this.video.readyState<2||this.video.currentTime===this.lastVideoTime)return;
    this.lastVideoTime=this.video.currentTime;
    try{
      const result=this.recognizer.recognizeForVideo(this.video,performance.now());const landmarks=result.landmarks?.[0];let gesture=result.gestures?.[0]?.[0];let name=gesture?.score>.65?gesture.categoryName:'';
      if(landmarks){
        const wrist=landmarks[0],distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),extended=(tip,pip)=>distance(landmarks[tip],wrist)>distance(landmarks[pip],wrist)*1.18;
        if(extended(12,10)&&![extended(8,6),extended(16,14),extended(20,18)].some(Boolean))name='Middle_Finger';
        this.callbacks.gaze?.((.5-landmarks[9].x)*1.1,(landmarks[9].y-.5)*.8);
      }
      const mapped={Thumb_Up:'thumbs',Thumb_Down:'middle',Middle_Finger:'middle',Open_Palm:'pet',Victory:'play',ILoveYou:'pet',Closed_Fist:'calm'}[name];
      if(mapped===this.gestureCandidate)this.gestureFrames++;else{this.gestureCandidate=mapped;this.gestureFrames=1;}
      if(mapped&&this.gestureFrames>=3&&Date.now()-this.lastGestureAt>4500){this.lastGestureAt=Date.now();this.lastGesture=mapped;this.callbacks.gesture?.(mapped);}
      this.lightCtx.drawImage(this.video,0,0,16,16);const pixels=this.lightCtx.getImageData(0,0,16,16).data;let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;this.callbacks.light?.(sum/(pixels.length/4)/255);
    }catch(error){this.stop('camera');this.status('camera','error','No se pudo procesar la cámara. Puedes usar los gestos manuales.');console.warn(error.message);}
  }
  explain(error,name){if(error.name==='NotAllowedError')return `Permiso de ${name} denegado. Puedes habilitarlo en los ajustes de Safari.`;if(error.name==='NotFoundError')return `No se encontró ${name} en este dispositivo.`;return error.message||`No se pudo activar ${name}.`;
  }
  stop(name){++this.generation[name];if(name==='camera')clearInterval(this.cameraTimer);if(name==='microphone')clearInterval(this.noiseTimer);
    this.streams[name]?.getTracks().forEach(t=>t.stop());delete this.streams[name];
    if(name==='camera'){this.recognizer?.close();this.recognizer=null;this.video.srcObject=null;}
    if(name==='microphone'){this.audioContext?.close().catch(()=>{});this.audioContext=null;this.callbacks.noise?.(0);}
    if(name==='motion'){window.removeEventListener('devicemotion',this.motionHandler);this.callbacks.gaze?.(0,0);}
    this.status(name,'off');
  }
  stopAll(){for(const name of ['camera','microphone','motion'])this.stop(name);}
}

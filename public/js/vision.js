import {faceState} from './gesture.js';
const modelPromises=new Map();
const abortError=()=>new DOMException('Activación cancelada.','AbortError');
async function model(name){
  if(!modelPromises.has(name)){
    modelPromises.set(name,(async()=>{
      const response=await fetch(`/models/${name}.task`,{signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw new Error('No se pudo descargar el modelo de cámara. Comprueba la conexión y vuelve a activarla.');
      return response.arrayBuffer();
    })().catch(error=>{modelPromises.delete(name);throw error;}));
  }
  return modelPromises.get(name);
}
export class Vision {
  constructor(){this.pending=new Map();this.nextId=0;this.closed=false;this.mode='loading';this.faceEnabled=false;this.frameCount=0;this.hands={landmarks:[],gestures:[]};this.face=null;}
  async init(){
    const [buffer,faceBuffer]=await Promise.all([model('gesture_recognizer'),model('face_landmarker').catch(()=>null)]);if(this.closed)throw abortError();
    if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'){
      try{
        this.worker=new Worker('/js/vision-worker.js');
        this.worker.onmessage=({data})=>{const pending=this.pending.get(data.id);if(!pending)return;this.pending.delete(data.id);clearTimeout(pending.timer);data.error?pending.reject(new Error(data.error)):pending.resolve(data.result);};
        this.worker.onerror=()=>this.rejectPending(new Error('El reconocimiento de gestos se interrumpió.'));
        const copy=buffer.slice(0),faceCopy=faceBuffer?.slice(0);
        const init=await this.request({type:'init',model:copy,faceModel:faceCopy},faceCopy?[copy,faceCopy]:[copy],45000);
        this.faceEnabled=init.faceEnabled;
        this.mode='worker';return;
      }catch(error){
        this.worker?.terminate();this.worker=null;
        if(this.closed)throw abortError();
        console.info('Reconocimiento compatible en este navegador:',error.message);
      }
    }
    // Older Safari versions lack worker canvases. Use a low inference rate.
    const {FilesetResolver,GestureRecognizer,FaceLandmarker}=await import('/vendor/vision/vision_bundle.mjs');
    if(this.closed)throw abortError();
    const files=await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
    if(this.closed)throw abortError();
    const recognizer=await GestureRecognizer.createFromOptions(files,{
      baseOptions:{modelAssetBuffer:new Uint8Array(buffer),delegate:'CPU'},runningMode:'VIDEO',numHands:2,
      minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55
    });
    if(this.closed){recognizer.close();throw abortError();}
    this.recognizer=recognizer;
    if(faceBuffer){
      try{
        const detector=await FaceLandmarker.createFromOptions(files,{
          baseOptions:{modelAssetBuffer:new Uint8Array(faceBuffer),delegate:'CPU'},runningMode:'VIDEO',numFaces:1,
          outputFaceBlendshapes:true,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5
        });
        if(this.closed){detector.close();throw abortError();}
        this.faceDetector=detector;this.faceEnabled=true;
      }catch(error){if(this.closed)throw abortError();console.info('Seguimiento facial no disponible:',error.message);}
    }
    this.mode='compatible';
  }
  request(message,transfers=[],timeout=15000){
    if(this.closed)return Promise.reject(abortError());
    const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('El reconocimiento tardó demasiado. Vuelve a activar la cámara.'));},timeout);
      this.pending.set(id,{resolve,reject,timer});
      try{this.worker.postMessage({...message,id},transfers);}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
    });
  }
  async recognize(video,time){
    if(this.closed)throw abortError();
    if(this.worker){
      const frame=await createImageBitmap(video);
      if(this.closed){frame.close();throw abortError();}
      return this.request({type:'frame',frame,time},[frame]);
    }
    const faceFresh=this.faceEnabled&&this.frameCount++%2===0;
    if(faceFresh)this.face=faceState(this.faceDetector.detectForVideo(video,time));
    else this.hands=this.recognizer.recognizeForVideo(video,time);
    return {landmarks:this.hands.landmarks,gestures:this.hands.gestures,handsFresh:!faceFresh,face:this.face,faceFresh,faceEnabled:this.faceEnabled};
  }
  rejectPending(error){for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(error);}this.pending.clear();}
  close(){this.closed=true;this.worker?.terminate();this.worker=null;this.rejectPending(abortError());this.recognizer?.close();this.recognizer=null;this.faceDetector?.close();this.faceDetector=null;}
}

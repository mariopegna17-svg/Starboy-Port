// Classic worker: MediaPipe's WASM loader uses importScripts(). Inference stays
// away from the eye animation and touch controls.
let recognizer;
self.onmessage=async({data})=>{
  const {id,type}=data;
  try{
    if(type==='init'){
      const {FilesetResolver,GestureRecognizer}=await import('/vendor/vision/vision_bundle.mjs');
      const files=await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
      recognizer=await GestureRecognizer.createFromOptions(files,{
        baseOptions:{modelAssetBuffer:new Uint8Array(data.model),delegate:'CPU'},
        canvas:new OffscreenCanvas(320,240),runningMode:'VIDEO',numHands:1,
        minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55
      });
      self.postMessage({id});
    }else if(type==='frame'){
      try{
        const result=recognizer.recognizeForVideo(data.frame,data.time);
        self.postMessage({id,result:{landmarks:result.landmarks,gestures:result.gestures}});
      }finally{data.frame.close();}
    }
  }catch(error){self.postMessage({id,error:error.message||'No se pudo reconocer el gesto.'});}
};

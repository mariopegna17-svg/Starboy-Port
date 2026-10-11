// Classic worker: MediaPipe's WASM loader uses importScripts(). Inference stays
// away from the eye animation and touch controls.
let recognizer,faceDetector,faceState;
let frameCount=0,hands={landmarks:[],gestures:[]},face=null;
self.onmessage=async({data})=>{
  const {id,type}=data;
  try{
    if(type==='init'){
      const {FilesetResolver,GestureRecognizer,FaceLandmarker}=await import('/vendor/vision/vision_bundle.mjs');
      ({faceState}=await import('./gesture.js'));
      const files=await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
      recognizer=await GestureRecognizer.createFromOptions(files,{
        baseOptions:{modelAssetBuffer:new Uint8Array(data.model),delegate:'CPU'},
        canvas:new OffscreenCanvas(320,240),runningMode:'VIDEO',numHands:1,
        minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55
      });
      if(data.faceModel){
        try{
          faceDetector=await FaceLandmarker.createFromOptions(files,{
            baseOptions:{modelAssetBuffer:new Uint8Array(data.faceModel),delegate:'CPU'},canvas:new OffscreenCanvas(320,240),
            runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true,
            minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5
          });
        }catch(error){console.info('Seguimiento facial no disponible:',error.message);}
      }
      self.postMessage({id,result:{faceEnabled:!!faceDetector}});
    }else if(type==='frame'){
      try{
        // One inference per captured frame keeps touch and eyes responsive.
        // Fresh flags let callers avoid treating cached observations as new.
        const faceFresh=!!faceDetector&&frameCount++%2===0;
        if(faceFresh)face=faceState(faceDetector.detectForVideo(data.frame,data.time));
        else hands=recognizer.recognizeForVideo(data.frame,data.time);
        self.postMessage({id,result:{landmarks:hands.landmarks,gestures:hands.gestures,handsFresh:!faceFresh,face,faceFresh,faceEnabled:!!faceDetector}});
      }finally{data.frame.close();}
    }
  }catch(error){self.postMessage({id,error:error.message||'No se pudo reconocer el gesto.'});}
};

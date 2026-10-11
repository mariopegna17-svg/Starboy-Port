const ACTIONS={Thumb_Up:'thumbs',Thumb_Down:'middle',Middle_Finger:'middle',Open_Palm:'pet',Victory:'play',ILoveYou:'love',Closed_Fist:'calm',Okay:'calm',Pinch:'pet',Pointing_Up:'curious',Wave:'hello'};

// Held gestures fire once. Release or change the gesture to repeat.
export class GestureGate {
  constructor({cooldown=400}={}){this.candidate='';this.frames=0;this.latched='';this.emptyFrames=0;this.clock=0;this.lastAction=-Infinity;this.cooldown=cooldown;this.wave=[];}
  read(name,landmarks,time){
    const now=time??(this.clock+=160);
    if(name==='Open_Palm'&&Number.isFinite(landmarks?.[0]?.x)){
      this.wave.push({x:landmarks[0].x,time:now});this.wave=this.wave.filter(sample=>now-sample.time<1800);
      let turns=0,direction=0,anchor=this.wave[0].x;
      for(const sample of this.wave){const delta=sample.x-anchor;if(Math.abs(delta)<.045)continue;const next=Math.sign(delta);if(direction&&next!==direction)turns++;direction=next;anchor=sample.x;}
      if(turns>=2)name='Wave';
    }else this.wave=[];
    const action=ACTIONS[name]||'';
    if(!action){if(++this.emptyFrames>=3)this.latched='';this.candidate='';this.frames=0;return;}
    this.emptyFrames=0;
    if(action===this.candidate)this.frames++;else{this.candidate=action;this.frames=1;}
    if(this.frames>=3&&action!==this.latched&&now-this.lastAction>=this.cooldown){this.latched=action;this.lastAction=now;return action;}
  }
}
export function gestureName(result){
  const gesture=result.gestures?.[0]?.[0],landmarks=result.landmarks?.[0];
  const known=gesture?.score>.65?gesture.categoryName:'';
  if(ACTIONS[known]&&known!=='Open_Palm'&&known!=='Closed_Fist')return known;
  if(known==='Closed_Fist'&&gesture.score>.85)return known;
  if(!landmarks||landmarks.length<21)return ACTIONS[known]?known:'';
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
  const palm=Math.max(distance(landmarks[5],landmarks[17]),distance(landmarks[0],landmarks[9]),.001);
  const extended=(tip,pip)=>distance(landmarks[tip],landmarks[0])>distance(landmarks[pip],landmarks[0])*1.25;
  const fingers=[extended(8,6),extended(12,10),extended(16,14),extended(20,18)];
  const pinch=distance(landmarks[4],landmarks[8])/palm;
  // A closed ring with other fingers open is OK; with folded fingers it is a
  // pinch. These refinements never replace a recognized thumb or victory.
  if(palm>.015&&pinch<.24){if(fingers.slice(1).filter(Boolean).length>=2)return 'Okay';if(fingers.slice(1).filter(Boolean).length<=1)return 'Pinch';}
  if(ACTIONS[known])return known;
  if(fingers[0]&&!fingers.slice(1).some(Boolean))return 'Pointing_Up';
  if(fingers[1]&&![fingers[0],fingers[2],fingers[3]].some(Boolean))return 'Middle_Finger';
  return '';
}

// All landmarks/blendshapes remain local. x/y are 0..1 in the unmirrored image;
// yaw/pitch are -1..1. Signals are 0..1, independent of the user's face size.
export function faceState(result){
  const points=result.faceLandmarks?.[0];
  if(![1,10,33,152,234,263,454].every(index=>Number.isFinite(points?.[index]?.x)&&Number.isFinite(points?.[index]?.y)))return null;
  const categories=result.faceBlendshapes?.[0]?.categories||[];
  const scores=Object.fromEntries(categories.map(({categoryName,score})=>[categoryName,score]));
  const value=name=>Math.max(0,Math.min(1,scores[name]||0));
  const left=points[33],right=points[263],nose=points[1],top=points[10],bottom=points[152];
  const midX=(left.x+right.x)/2,eyeY=(left.y+right.y)/2;
  const width=Math.max(Math.hypot(right.x-left.x,right.y-left.y),.025),height=Math.max(bottom.y-top.y,.025);
  const clamp=value=>Math.max(-1,Math.min(1,value));
  const face={x:Math.max(0,Math.min(1,(points[234].x+points[454].x)/2)),y:Math.max(0,Math.min(1,(top.y+bottom.y)/2)),
    yaw:clamp((nose.x-midX)/width*3),pitch:clamp(((nose.y-eyeY)/height-.22)*4),
    smile:(value('mouthSmileLeft')+value('mouthSmileRight'))/2,kiss:value('mouthPucker'),jawOpen:value('jawOpen'),
    blinkLeft:value('eyeBlinkLeft'),blinkRight:value('eyeBlinkRight')};
  face.eyesClosed=(face.blinkLeft+face.blinkRight)/2;return face;
}

export class FaceGate {
  constructor(){this.candidate='';this.frames=0;this.latched='';this.released=0;this.clock=0;this.lastAction=-Infinity;}
  read(face,time){
    const now=time??(this.clock+=320);
    const action=!face?'':face.kiss>.55&&face.jawOpen<.22?'kiss':face.eyesClosed>.58?'blink':face.smile>.5?'love':'';
    if(!action){if(++this.released>=2)this.latched='';this.candidate='';this.frames=0;return;}
    this.released=0;
    if(action===this.candidate)this.frames++;else{this.candidate=action;this.frames=1;}
    // A blink is short; requiring both eyes and a cooldown absorbs noise.
    if(this.frames>=(action==='blink'?1:2)&&action!==this.latched&&now-this.lastAction>=1800){this.latched=action;this.lastAction=now;return action;}
  }
}

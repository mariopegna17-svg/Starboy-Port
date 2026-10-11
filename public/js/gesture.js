const ACTIONS={Thumb_Up:'thumbs',Thumb_Down:'middle',Middle_Finger:'middle',Open_Palm:'pet',Victory:'play',ILoveYou:'pet',Closed_Fist:'calm'};

// Held gestures fire once. Release or change the gesture to repeat.
export class GestureGate {
  constructor(){this.candidate='';this.frames=0;this.latched='';this.emptyFrames=0;}
  read(name){
    const action=ACTIONS[name]||'';
    if(!action){if(++this.emptyFrames>=3)this.latched='';this.candidate='';this.frames=0;return;}
    this.emptyFrames=0;
    if(action===this.candidate)this.frames++;else{this.candidate=action;this.frames=1;}
    if(this.frames>=3&&action!==this.latched){this.latched=action;return action;}
  }
}
export function gestureName(result){
  const gesture=result.gestures?.[0]?.[0],landmarks=result.landmarks?.[0];
  const known=gesture?.score>.65?gesture.categoryName:'';
  if(ACTIONS[known])return known;
  if(!landmarks||landmarks.length<21)return '';
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const extended=(tip,pip)=>distance(landmarks[tip],landmarks[0])>distance(landmarks[pip],landmarks[0])*1.25;
  return extended(12,10)&&![extended(8,6),extended(16,14),extended(20,18)].some(Boolean)?'Middle_Finger':'';
}

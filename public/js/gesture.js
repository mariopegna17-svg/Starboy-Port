export const GESTURES={
  Thumb_Up:{action:'thumbs',label:'Pulgar arriba'},Thumb_Down:{action:'middle',label:'Pulgar abajo'},Middle_Finger:{action:'middle',label:'Dedo medio'},
  Open_Palm:{action:'pet',label:'Palma abierta'},Victory:{action:'play',label:'Victoria'},ILoveYou:{action:'love',label:'Te quiero'},Closed_Fist:{action:'calm',label:'Puño'},
  Okay:{action:'calm',label:'OK'},Pinch:{action:'pet',label:'Pinza'},Pointing_Up:{action:'look-up',label:'Señalar arriba'},Wave:{action:'hello',label:'Saludar con la mano'},
  Rock_On:{action:'play',label:'Cuernos'},Shaka:{action:'hello',label:'Llamada (pulgar y meñique)'},L_Shape:{action:'curious',label:'L (pulgar e índice)'},
  Three:{action:'feed',label:'Tres dedos (índice, medio y anular; o pulgar, índice y medio)'},Four:{action:'calm',label:'Cuatro dedos, con el pulgar doblado'},Pinkie:{action:'love',label:'Meñique'},Vulcan:{action:'curious',label:'Saludo vulcano'},Crossed_Fingers:{action:'love',label:'Dedos cruzados'},
  Point_Left:{action:'look-left',label:'Señalar a la izquierda'},Point_Right:{action:'look-right',label:'Señalar a la derecha'},Point_Down:{action:'look-down',label:'Señalar abajo'},
  Swipe_Left:{action:'look-left',label:'Deslizar la palma a la izquierda'},Swipe_Right:{action:'look-right',label:'Deslizar la palma a la derecha'},Swipe_Up:{action:'look-up',label:'Subir la palma'},Swipe_Down:{action:'look-down',label:'Bajar la palma'},
  Hand_Heart:{action:'love',label:'Corazón con ambas manos'},Double_Thumb_Up:{action:'celebrate',label:'Dos pulgares arriba'},Double_Victory:{action:'celebrate',label:'Dos victorias'},Double_Open_Palm:{action:'hello',label:'Dos palmas abiertas'},Fist_Bump:{action:'play',label:'Juntar dos puños'},Clap:{action:'celebrate',label:'Aplaudir'},
  Smile:{action:'love',label:'Sonreír'},Kiss:{action:'kiss',label:'Lanzar un beso'},Blink:{action:'blink',label:'Cerrar los dos ojos'},
  Wink_Left:{action:'love',label:'Guiño de un ojo'},Wink_Right:{action:'love',label:'Guiño del otro ojo'},Raised_Brows:{action:'surprise',label:'Levantar las cejas'},Open_Mouth:{action:'surprise',label:'Boca abierta'},Puff_Cheeks:{action:'play',label:'Inflar las mejillas'},Frown:{action:'calm',label:'Fruncir el ceño'},Head_Tilt:{action:'love',label:'Inclinar la cabeza'},Head_Nod:{action:'nod',label:'Asentir dos veces'},Head_Shake:{action:'nope',label:'Negar con la cabeza'}
};
const ACTIONS=Object.fromEntries(Object.entries(GESTURES).map(([name,gesture])=>[name,gesture.action]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
const center=points=>({x:(points[0].x+points[9].x)/2,y:(points[0].y+points[9].y)/2});
function angle(a,b,c){
  const u=[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)],v=[c.x-b.x,c.y-b.y,(c.z??0)-(b.z??0)];
  const length=Math.hypot(...u)*Math.hypot(...v);return length>1e-8?Math.acos(Math.max(-1,Math.min(1,u.reduce((sum,n,i)=>sum+n*v[i],0)/length)))*180/Math.PI:0;
}
function handPose(points){
  if(points?.length!==21||points.some(p=>!p||![p.x,p.y,p.z??0].every(Number.isFinite)))return null;
  const palm=Math.max(distance(points[5],points[17]),distance(points[0],points[9]));if(palm<.025)return null;
  const fingers=[[5,6,8],[9,10,12],[13,14,16],[17,18,20]].map(([mcp,pip,tip])=>distance(points[tip],points[0])>distance(points[pip],points[0])*1.18&&angle(points[mcp],points[pip],points[tip])>145);
  const thumb=angle(points[2],points[3],points[4])>145&&distance(points[4],points[2])>distance(points[3],points[2])*1.35&&distance(points[4],points[5])>palm*.65;
  const thumbFolded=distance(points[4],points[5])<palm*.55||distance(points[4],points[17])<distance(points[3],points[17])*1.05;
  return {points,palm,fingers,thumb,thumbFolded};
}
function pointing(points){
  const dx=points[8].x-points[5].x,dy=points[8].y-points[5].y;
  // The capture is unmirrored; screen directions are mirrored like a selfie.
  if(Math.abs(dx)>Math.abs(dy)*1.3)return dx>0?'Point_Left':'Point_Right';
  return dy>Math.abs(dx)*.7?'Point_Down':'Pointing_Up';
}
export function gestureName(result,index=0){
  const gesture=result.gestures?.[index]?.[0],points=result.landmarks?.[index];
  const known=gesture?.score>.65?gesture.categoryName:'';
  if(['Thumb_Up','Thumb_Down','Middle_Finger','ILoveYou'].includes(known))return known;
  if(known==='Closed_Fist'&&gesture.score>.85)return known;
  const pose=handPose(points);if(!pose)return ACTIONS[known]?known:'';
  const {palm,fingers,thumb,thumbFolded}=pose,count=fingers.filter(Boolean).length,pinch=distance(points[4],points[8])/palm;
  if(pinch<.24&&distance(points[8],points[5])>palm*.28){if(fingers.slice(1).filter(Boolean).length>=2)return 'Okay';if(fingers.slice(1).filter(Boolean).length<=1)return 'Pinch';}
  if(count===4&&distance(points[12],points[16])>palm*.45&&distance(points[8],points[12])<palm*.3&&distance(points[16],points[20])<palm*.3)return 'Vulcan';
  if(fingers[0]&&fingers[1]&&!fingers[2]&&!fingers[3]){
    const base={x:points[5].x-points[9].x,y:points[5].y-points[9].y},tips={x:points[8].x-points[12].x,y:points[8].y-points[12].y};
    if(base.x*tips.x+base.y*tips.y<-palm*palm*.025&&distance(points[8],points[12])<palm*.35)return 'Crossed_Fingers';
  }
  if(count===4&&thumbFolded)return 'Four';
  if((count===3&&fingers[0]&&fingers[1]&&fingers[2]&&!thumb)||(count===2&&fingers[0]&&fingers[1]&&thumb))return 'Three';
  if(count===2&&fingers[0]&&fingers[3]&&thumbFolded)return 'Rock_On';
  if(count===1&&fingers[3]){if(thumb)return 'Shaka';if(thumbFolded)return 'Pinkie';}
  if(count===1&&fingers[0]&&thumb)return 'L_Shape';
  if(known==='Pointing_Up')return pointing(points);
  if(ACTIONS[known])return known;
  if(count===1&&fingers[0])return pointing(points);
  if(count===1&&fingers[1])return 'Middle_Finger';
  if(count===2&&fingers[0]&&fingers[1])return 'Victory';
  if(count===4)return 'Open_Palm';
  return '';
}
export function pairedGestureName(result){
  const a=handPose(result.landmarks?.[0]),b=handPose(result.landmarks?.[1]);if(!a||!b)return '';
  const palm=(a.palm+b.palm)/2,separation=distance(center(a.points),center(b.points))/palm;if(separation<.25)return '';
  const names=[gestureName(result,0),gestureName(result,1)];
  if(names.every(name=>name==='Thumb_Up'))return 'Double_Thumb_Up';
  if(names.every(name=>name==='Victory'))return 'Double_Victory';
  const ring=hand=>distance(hand.points[4],hand.points[8])>hand.palm*.55&&distance(hand.points[8],hand.points[5])>hand.palm*.7&&hand.fingers.slice(1).filter(Boolean).length<=1;
  if(ring(a)&&ring(b)&&distance(a.points[4],b.points[4])<palm*.6&&distance(a.points[8],b.points[8])<palm*.65&&((a.points[4].y+b.points[4].y)-(a.points[8].y+b.points[8].y))/2>palm*.2)return 'Hand_Heart';
  if(names.every(name=>name==='Closed_Fist')&&separation<1.7)return 'Fist_Bump';
  if(names.every(name=>['Open_Palm','Four'].includes(name)))return 'Double_Open_Palm';
  return '';
}
function oscillations(samples,axis,threshold){
  if(samples.length<4)return 0;let turns=0,direction=0,anchor=samples[0][axis];
  for(const sample of samples){const delta=sample[axis]-anchor;if(Math.abs(delta)<threshold)continue;const next=Math.sign(delta);if(direction&&next!==direction)turns++;direction=next;anchor=sample[axis];}
  return turns;
}

// Require a stable pose. Holding it never repeats an action; changing or
// releasing it re-arms the gate. Motion history contains fresh observations only.
export class GestureGate {
  constructor({cooldown=400}={}){this.candidate='';this.frames=0;this.latched='';this.emptyFrames=0;this.clock=0;this.lastAction=-Infinity;this.cooldown=cooldown;this.wave=[];this.motion='';this.primary=null;this.pair=[];this.pairAt=-Infinity;this.pairMotion='';this.lastGesture='';}
  readResult(result,time){
    const pair=pairedGestureName(result);
    if(pair==='Double_Open_Palm'){
      this.pairAt=time;
      const points=result.landmarks,distanceNow=distance(center(points[0]),center(points[1])),palm=(handPose(points[0]).palm+handPose(points[1]).palm)/2;
      this.pair.push({distance:distanceNow/palm,time});this.pair=this.pair.filter(p=>time-p.time<1600);
      // Two palms approach and separate: a clap, not simply two nearby hands.
      if(this.pair.length>=4){const values=this.pair.map(p=>p.distance),min=Math.min(...values),at=values.indexOf(min);if(at>0&&at<values.length-1&&min<1.35&&values[0]-min>.7&&values.at(-1)-min>.7)this.pairMotion='Clap';}
    }else if(pair||(result.landmarks?.length||0)>1||time-this.pairAt>600){this.pair=[];this.pairMotion='';}
    if(pair)return this.read(this.pairMotion||pair,null,time);
    const hands=result.landmarks||[],options=hands.map((points,index)=>({points,name:gestureName(result,index)})).filter(option=>option.name&&handPose(option.points));
    if(this.primary)options.sort((a,b)=>distance(center(a.points),this.primary)-distance(center(b.points),this.primary));
    const selected=options[0];if(selected)this.primary=center(selected.points);
    return this.read(selected?.name||'',selected?.points,time);
  }
  read(name,landmarks,time){
    const now=time??(this.clock+=160);
    if(name==='Open_Palm'&&Number.isFinite(landmarks?.[0]?.x)&&Number.isFinite(landmarks[0].y)){
      this.wave.push({x:landmarks[0].x,y:landmarks[0].y,time:now});this.wave=this.wave.filter(sample=>now-sample.time<1800);
      if(oscillations(this.wave,'x',.055)>=2)this.motion='Wave';
      else if(!this.motion&&this.wave.length>=4){
        const first=this.wave[0],last=this.wave.at(-1),dx=last.x-first.x,dy=last.y-first.y,recent=this.wave.slice(-3);
        const settled=Math.max(...recent.map(p=>p.x))-Math.min(...recent.map(p=>p.x))+Math.max(...recent.map(p=>p.y))-Math.min(...recent.map(p=>p.y))<.035;
        if(settled&&last.time-first.time>=300&&last.time-first.time<=1600){if(Math.abs(dx)>.22&&Math.abs(dx)>Math.abs(dy)*1.6)this.motion=dx>0?'Swipe_Left':'Swipe_Right';else if(Math.abs(dy)>.22&&Math.abs(dy)>Math.abs(dx)*1.6)this.motion=dy>0?'Swipe_Down':'Swipe_Up';}
      }
      if(this.motion)name=this.motion;
    }else{this.wave=[];this.motion='';}
    const action=ACTIONS[name]||'';
    if(!action){if(++this.emptyFrames>=3){this.latched='';this.primary=null;}this.candidate='';this.frames=0;return;}
    this.emptyFrames=0;
    if(name===this.candidate)this.frames++;else{this.candidate=name;this.frames=1;}
    if(this.frames>=3&&name!==this.latched&&now-this.lastAction>=this.cooldown){this.latched=name;this.lastAction=now;this.lastGesture=name;return action;}
  }
}

// All landmarks/blendshapes remain local. x/y are 0..1 in the unmirrored image;
// yaw/pitch are -1..1. Signals are 0..1, independent of the user's face size.
export function faceState(result){
  const points=result.faceLandmarks?.[0];
  if(![1,10,33,152,234,263,454].every(index=>Number.isFinite(points?.[index]?.x)&&Number.isFinite(points?.[index]?.y)))return null;
  const categories=result.faceBlendshapes?.[0]?.categories||[],scores=Object.fromEntries(categories.map(({categoryName,score})=>[categoryName,score]));
  const value=name=>Number.isFinite(scores[name])?Math.max(0,Math.min(1,scores[name])):0;
  const left=points[33],right=points[263],nose=points[1],top=points[10],bottom=points[152];
  const midX=(left.x+right.x)/2,eyeY=(left.y+right.y)/2;
  const width=Math.max(Math.hypot(right.x-left.x,right.y-left.y),.025),height=Math.max(bottom.y-top.y,.025),clamp=value=>Math.max(-1,Math.min(1,value));
  const face={x:Math.max(0,Math.min(1,(points[234].x+points[454].x)/2)),y:Math.max(0,Math.min(1,(top.y+bottom.y)/2)),
    yaw:clamp((nose.x-midX)/width*3),pitch:clamp(((nose.y-eyeY)/height-.22)*4),roll:Math.atan2(right.y-left.y,right.x-left.x),
    smile:(value('mouthSmileLeft')+value('mouthSmileRight'))/2,kiss:value('mouthPucker'),jawOpen:value('jawOpen'),
    blinkLeft:value('eyeBlinkLeft'),blinkRight:value('eyeBlinkRight'),brows:Math.max(value('browInnerUp'),(value('browOuterUpLeft')+value('browOuterUpRight'))/2),
    puff:value('cheekPuff'),frown:(value('browDownLeft')+value('browDownRight'))/2};
  face.eyesClosed=(face.blinkLeft+face.blinkRight)/2;return face;
}
export class FaceGate {
  constructor(){this.candidate='';this.frames=0;this.latched='';this.released=0;this.clock=0;this.lastAction=-Infinity;this.lastGesture='';this.history=[];this.motion='';this.motionUntil=0;}
  read(face,time){
    const now=time??(this.clock+=320);
    if(face&&[face.yaw,face.pitch,face.x,face.y].every(Number.isFinite)){
      const previous=this.history.at(-1);
      if(previous&&Math.hypot(face.x-previous.x,face.y-previous.y)>.12){this.history=[];this.motion='';this.motionUntil=0;}
      this.history.push({yaw:face.yaw,pitch:face.pitch,x:face.x,y:face.y,time:now});this.history=this.history.filter(sample=>now-sample.time<1800);
      const range=axis=>Math.max(...this.history.map(p=>p[axis]))-Math.min(...this.history.map(p=>p[axis]));
      if(now>=this.motionUntil){
        if(range('yaw')>.55&&oscillations(this.history,'yaw',.18)>=2){this.motion='Head_Shake';this.motionUntil=now+700;this.history=[];}
        else if(range('pitch')>.4&&oscillations(this.history,'pitch',.13)>=2){this.motion='Head_Nod';this.motionUntil=now+700;this.history=[];}
      }
    }else{this.history=[];this.motion='';this.motionUntil=0;}
    const name=!face?'':face.kiss>.55&&face.jawOpen<.22?'Kiss':face.eyesClosed>.58?'Blink':face.blinkLeft>.7&&face.blinkRight<.2?'Wink_Left':face.blinkRight>.7&&face.blinkLeft<.2?'Wink_Right':
      now<this.motionUntil?this.motion:face.smile>.5?'Smile':face.puff>.55?'Puff_Cheeks':face.jawOpen>.65?'Open_Mouth':face.brows>.6?'Raised_Brows':face.frown>.6?'Frown':Math.abs(face.roll)>.3&&Math.abs(face.roll)<.7?'Head_Tilt':'';
    if(!name){if(++this.released>=2)this.latched='';this.candidate='';this.frames=0;return;}
    this.released=0;
    if(name===this.candidate)this.frames++;else{this.candidate=name;this.frames=1;}
    if(this.frames>=(name==='Blink'?1:2)&&name!==this.latched&&now-this.lastAction>=1800){this.latched=name;this.lastAction=now;this.lastGesture=name;return ACTIONS[name];}
  }
}

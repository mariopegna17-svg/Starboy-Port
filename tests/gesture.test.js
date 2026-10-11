import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureGate,gestureName,pairedGestureName,FaceGate,faceState} from '../public/js/gesture.js';

test('un gesto sostenido solo dispara una acción y se puede repetir tras retirar la mano',()=>{
  const gate=new GestureGate(),actions=[];
  for(let i=0;i<60;i++){const action=gate.read('Victory');if(action)actions.push(action);}
  assert.deepEqual(actions,['play']);
  for(let i=0;i<3;i++)gate.read('');
  for(let i=0;i<3;i++){const action=gate.read('Victory');if(action)actions.push(action);}
  assert.deepEqual(actions,['play','play']);
});
test('los gestos fugaces no disparan acciones y un cambio estable sí lo hace',()=>{
  const gate=new GestureGate();
  assert.equal(gate.read('Thumb_Up'),undefined);assert.equal(gate.read('Victory'),undefined);
  assert.equal(gate.read('Thumb_Up'),undefined);assert.equal(gate.read('Thumb_Up'),undefined);assert.equal(gate.read('Thumb_Up'),'thumbs');
  for(let i=0;i<2;i++)assert.equal(gate.read('Open_Palm'),undefined);
  assert.equal(gate.read('Open_Palm'),'pet');
});
test('la geometría personalizada no sustituye un gesto oficial reconocido',()=>{
  const landmarks=hand(['middle']);
  assert.equal(gestureName({landmarks:[landmarks],gestures:[[{categoryName:'Thumb_Up',score:.9}]]}),'Thumb_Up');
  assert.equal(gestureName({landmarks:[landmarks],gestures:[]}),'Middle_Finger');
});

function hand(extended=[],pinch=false,thumb=false){
  const landmarks=Array.from({length:21},()=>({x:0,y:.5,z:0}));landmarks[0]={x:0,y:.85,z:0};
  landmarks[1]={x:-.13,y:.73,z:0};landmarks[2]={x:-.2,y:.66,z:0};landmarks[3]={x:thumb?-.29:-.15,y:thumb?.57:.59,z:0};landmarks[4]={x:thumb?-.38:-.07,y:thumb?.48:.55,z:0};
  for(const [finger,mcp,x] of [['index',5,-.14],['middle',9,-.04],['ring',13,.05],['little',17,.14]]){
    const open=extended.includes(finger);landmarks[mcp]={x,y:.53,z:0};landmarks[mcp+1]={x,y:open?.36:.42,z:0};landmarks[mcp+2]={x,y:open?.24:.54,z:0};landmarks[mcp+3]={x,y:open?.12:.57,z:0};
  }
  if(pinch){landmarks[8]={x:-.14,y:.36,z:0};landmarks[4]={x:landmarks[8].x+.035,y:landmarks[8].y,z:0};}return landmarks;
}
test('OK, pinza y señalar tienen formas distintas y conservan gestos oficiales',()=>{
  const result=landmarks=>({landmarks:[landmarks],gestures:[]});
  assert.equal(gestureName(result(hand(['middle','ring','little'],true))),'Okay');
  assert.equal(gestureName(result(hand([],true))),'Pinch');
  assert.equal(gestureName(result(hand(['index']))),'Pointing_Up');
  const thumb=result(hand([],true));thumb.gestures=[[{categoryName:'Thumb_Up',score:.95}]];
  assert.equal(gestureName(thumb),'Thumb_Up');
  thumb.gestures=[[{categoryName:'Closed_Fist',score:.95}]];assert.equal(gestureName(thumb),'Closed_Fist');
});
test('saludar requiere oscilaciones reales de la mano y un saludo sostenido no se repite',()=>{
  const gate=new GestureGate(),actions=[];
  const sequence=[.3,.3,.3,.4,.5,.6,.5,.4,.3,.4,.5,.6,.5,.4,.3,.4,.5,.6,.5,.4,.3];
  sequence.forEach((x,index)=>{const action=gate.read('Open_Palm',[{x,y:.5}],index*160);if(action)actions.push(action);});
  assert.deepEqual(actions,['pet','hello']);
});
test('el cooldown evita que clasificación inestable alterne reacciones demasiado rápido',()=>{
  const gate=new GestureGate();for(let i=0;i<3;i++)gate.read('Thumb_Up',null,100+i*100);
  assert.equal(gate.read('Victory',null,320),undefined);assert.equal(gate.read('Victory',null,340),undefined);assert.equal(gate.read('Victory',null,360),undefined);
  assert.equal(gate.read('Victory',null,800),'play');
});
test('sonrisa y beso son estables, una boca abierta no cuenta como beso',()=>{
  const gate=new FaceGate();
  assert.equal(gate.read({smile:.8,kiss:0,eyesClosed:0}),undefined);
  assert.equal(gate.read({smile:.8,kiss:0,eyesClosed:0}),'love');
  for(let i=0;i<10;i++)assert.equal(gate.read({smile:.8,kiss:0,eyesClosed:0}),undefined);
  gate.read(null);gate.read(null);
  assert.equal(gate.read({smile:0,kiss:.9,jawOpen:.6,eyesClosed:0}),undefined);
  assert.equal(gate.read({smile:0,kiss:.9,jawOpen:.05,eyesClosed:0}),undefined);
  assert.equal(gate.read({smile:0,kiss:.9,jawOpen:.05,eyesClosed:0}),'kiss');
});
test('parpadeo breve produce una reacción y requiere volver a abrir los ojos',()=>{
  const gate=new FaceGate();assert.equal(gate.read({eyesClosed:.85}),'blink');
  for(let i=0;i<10;i++)assert.equal(gate.read({eyesClosed:.85}),undefined);
  gate.read({eyesClosed:0});gate.read({eyesClosed:0});assert.equal(gate.read({eyesClosed:.85}),'blink');
});
test('la cabeza se normaliza y utiliza blendshapes del rostro detectado',()=>{
  assert.equal(faceState({faceLandmarks:[]}),null);
  assert.equal(faceState({faceLandmarks:[[{x:NaN,y:.5}]]}),null);
  const points=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
  Object.assign(points[33],{x:.4,y:.35});Object.assign(points[263],{x:.6,y:.35});Object.assign(points[1],{x:.52,y:.45});
  Object.assign(points[10],{y:.2});Object.assign(points[152],{y:.8});Object.assign(points[234],{x:.3});Object.assign(points[454],{x:.7});
  const face=faceState({faceLandmarks:[points],faceBlendshapes:[{categories:[{categoryName:'mouthSmileLeft',score:.8},{categoryName:'mouthSmileRight',score:.6},{categoryName:'mouthPucker',score:.3}]}]});
  assert.equal(face.x,.5);assert.equal(face.y,.5);assert.ok(Math.abs(face.yaw-.3)<1e-9);assert.equal(face.smile,.7);assert.equal(face.kiss,.3);assert.ok(Math.abs(face.pitch)<=1);
});

const result=(points,name='')=>({landmarks:[points],gestures:name?[[{categoryName:name,score:.95}]]:[]});
function transform(points,{rotation=0,mirror=false,scale=1,x=.5,y=.5}={}){
  const cos=Math.cos(rotation),sin=Math.sin(rotation);return points.map(p=>({x:x+scale*(p.x*cos-(p.y-.5)*sin)*(mirror?-1:1),y:y+scale*(p.x*sin+(p.y-.5)*cos),z:p.z*scale}));
}
test('nuevas poses de dedos conservan su identidad al girar, reflejar y alejar la mano',()=>{
  const vulcan=hand(['index','middle','ring','little']);vulcan[12].x=-.09;vulcan[16].x=.13;
  const crossed=hand(['index','middle']);crossed[8].x=-.01;crossed[12].x=-.1;
  const poses=[['Rock_On',hand(['index','little'])],['Shaka',hand(['little'],false,true)],['L_Shape',hand(['index'],false,true)],['Three',hand(['index','middle','ring'])],['Three',hand(['index','middle'],false,true)],['Four',hand(['index','middle','ring','little'])],['Pinkie',hand(['little'])],['Vulcan',vulcan],['Crossed_Fingers',crossed]];
  for(const [name,points] of poses)for(const rotation of [0,.8,-1.3])for(const mirror of [false,true])assert.equal(gestureName(result(transform(points,{rotation,mirror,scale:.6}))),name,`${name}, giro ${rotation}, reflejo ${mirror}`);
});
test('señalar orienta la mirada y una pinza no se confunde con un puño sin clasificación',()=>{
  for(const [rotation,name] of [[0,'Pointing_Up'],[Math.PI/2,'Point_Left'],[Math.PI,'Point_Down'],[-Math.PI/2,'Point_Right']])assert.equal(gestureName(result(transform(hand(['index']),{rotation}))),name);
  assert.equal(gestureName(result(hand())),'');assert.equal(gestureName(result(hand(),'Closed_Fist')),'Closed_Fist');
  assert.equal(gestureName(result(hand([],true))),'Pinch');
  const invalid=hand(['index']);invalid[8].x=NaN;assert.equal(gestureName(result(invalid)),'');
  assert.equal(gestureName(result(transform(hand(['index']),{scale:.04}))), '');
});
function pair(name,spacing=.5){
  const pose=name==='Victory'?hand(['index','middle']):name==='Open_Palm'?hand(['index','middle','ring','little'],false,true):hand();
  const left=transform(pose,{scale:.28,x:.5-spacing/2}),right=transform(pose,{scale:.28,x:.5+spacing/2,mirror:true});
  return {landmarks:[left,right],gestures:[[{categoryName:name,score:.95}],[{categoryName:name,score:.95}]]};
}
test('dos manos forman gestos conjuntos y cambiar su orden no repite la celebración',()=>{
  assert.equal(pairedGestureName(pair('Thumb_Up')),'Double_Thumb_Up');assert.equal(pairedGestureName(pair('Victory')),'Double_Victory');assert.equal(pairedGestureName(pair('Open_Palm')),'Double_Open_Palm');
  assert.equal(pairedGestureName(pair('Closed_Fist')),'');assert.equal(pairedGestureName(pair('Closed_Fist',.1)),'Fist_Bump');
  const gate=new GestureGate(),hands=pair('Thumb_Up'),actions=[];
  for(let i=0;i<20;i++){if(i%2){hands.landmarks.reverse();hands.gestures.reverse();}const action=gate.readResult(hands,i*160);if(action)actions.push(action);}
  assert.deepEqual(actions,['celebrate']);for(let i=0;i<3;i++)gate.readResult({landmarks:[]},4000+i*160);
  for(let i=0;i<3;i++){const action=gate.readResult(hands,5000+i*160);if(action)actions.push(action);}assert.deepEqual(actions,['celebrate','celebrate']);
});
test('un corazón necesita dos manos con índices y pulgares separados y unidos por sus extremos',()=>{
  const left=transform(hand(),{scale:.4,x:.44}),right=transform(hand(),{scale:.4,x:.56,mirror:true});
  left[5]={x:.4,y:.5,z:0};right[5]={x:.6,y:.5,z:0};left[8]={x:.48,y:.35,z:0};right[8]={x:.52,y:.35,z:0};left[4]={x:.485,y:.5,z:0};right[4]={x:.515,y:.5,z:0};
  const heart={landmarks:[left,right],gestures:[]};assert.equal(pairedGestureName(heart),'Hand_Heart');
  assert.equal(pairedGestureName({...heart,landmarks:[right,left]}),'Hand_Heart');
  right[4].x=.8;assert.equal(pairedGestureName(heart),'');
});
test('los deslizamientos requieren desplazamiento y detener la palma; el ruido no cuenta',()=>{
  const sequence=[.3,.3,.3,.4,.5,.6,.6,.6,.6,.6,.6,.6];
  for(const [axis,reverse,expected] of [['x',false,'look-left'],['x',true,'look-right'],['y',false,'look-down'],['y',true,'look-up']]){
    const gate=new GestureGate(),actions=[];sequence.forEach((position,i)=>{const point={x:.5,y:.5};point[axis]=reverse?1-position:position;const action=gate.read('Open_Palm',[point],i*160);if(action)actions.push(action);});assert.deepEqual(actions,['pet',expected]);
  }
  const gate=new GestureGate(),actions=[];for(let i=0;i<30;i++){const action=gate.read('Open_Palm',[{x:.5+Math.sin(i)*.008,y:.5}],i*160);if(action)actions.push(action);}assert.deepEqual(actions,['pet']);
});
test('aplaudir necesita acercar y separar dos palmas y solo dispara una celebración',()=>{
  const palm=.323*.28;
  for(const sequence of [[3,3,3,2,1,2,3,3,3,3,3,3],[3,3,3,2,1,null,2,3,3,3,3,3]]){
    const gate=new GestureGate(),actions=[];sequence.forEach((spacing,i)=>{const action=gate.readResult(spacing===null?{landmarks:[]}:pair('Open_Palm',spacing*palm),i*160);if(action)actions.push(action);});assert.deepEqual(actions,['hello','celebrate']);
  }
});
test('una mano sin gesto no oculta la otra y cambiar el orden de detección no repite la acción',()=>{
  const gate=new GestureGate(),unknown=transform(hand(),{scale:.28,x:.25}),thumb=transform(hand(),{scale:.28,x:.75}),hands={landmarks:[unknown,thumb],gestures:[[{categoryName:'None',score:.9}],[{categoryName:'Thumb_Up',score:.95}]]},actions=[];
  for(let i=0;i<20;i++){if(i%2){hands.landmarks.reverse();hands.gestures.reverse();}const action=gate.readResult(hands,i*160);if(action)actions.push(action);}assert.deepEqual(actions,['thumbs']);
});
const neutralFace={x:.5,y:.5,yaw:0,pitch:0,roll:0,smile:0,kiss:0,jawOpen:0,blinkLeft:0,blinkRight:0,eyesClosed:0,brows:0,puff:0,frown:0};
test('guiños, cejas, boca, mejillas, ceño y cabeza inclinada requieren una expresión estable',()=>{
  for(const [changes,action,name] of [[{blinkLeft:.9},'love','Wink_Left'],[{blinkRight:.9},'love','Wink_Right'],[{brows:.9},'surprise','Raised_Brows'],[{jawOpen:.8},'surprise','Open_Mouth'],[{puff:.8},'play','Puff_Cheeks'],[{frown:.8},'calm','Frown'],[{roll:.4},'love','Head_Tilt']]){
    const gate=new FaceGate(),face={...neutralFace,...changes};assert.equal(gate.read(face,0),undefined);assert.equal(gate.read(face,200),action);assert.equal(gate.lastGesture,name);
    for(let i=0;i<15;i++)assert.equal(gate.read(face,400+i*200),undefined);
  }
});
test('una sonrisa conserva el cariño aunque también contraiga o levante las cejas',()=>{
  const gate=new FaceGate(),smile={...neutralFace,smile:.8,brows:.9,frown:.85};assert.equal(gate.read(smile,0),undefined);assert.equal(gate.read(smile,200),'love');assert.equal(gate.lastGesture,'Smile');
});
test('asentir y negar requieren cambios de dirección; seguir un rostro que cruza la imagen no cuenta',()=>{
  for(const [axis,sequence,expected] of [['pitch',[0,.35,0,-.25,0,.3,0],'nod'],['yaw',[0,.45,0,-.45,0,.4,0],'nope']]){
    const gate=new FaceGate(),actions=[];sequence.forEach((value,i)=>{const action=gate.read({...neutralFace,[axis]:value},i*160);if(action)actions.push(action);});assert.deepEqual(actions,[expected]);
  }
  const gate=new FaceGate();for(let i=0;i<20;i++)assert.equal(gate.read({...neutralFace,yaw:i*.05,pitch:i*.03},i*160),undefined);
  const crossing=new FaceGate();[0,.4,0,-.4,0,.4,0].forEach((yaw,i)=>assert.equal(crossing.read({...neutralFace,yaw,x:i%2?.75:.25},i*160),undefined));
});

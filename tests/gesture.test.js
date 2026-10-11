import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureGate,gestureName,FaceGate,faceState} from '../public/js/gesture.js';

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
  const landmarks=Array.from({length:21},()=>({x:0,y:0,z:0}));landmarks[12]={x:1,y:1,z:0};
  assert.equal(gestureName({landmarks:[landmarks],gestures:[[{categoryName:'Thumb_Up',score:.9}]]}),'Thumb_Up');
  assert.equal(gestureName({landmarks:[landmarks],gestures:[]}),'Middle_Finger');
});

function hand(extended=[],pinch=false){
  const landmarks=Array.from({length:21},()=>({x:0,y:.5,z:0}));
  landmarks[0]={x:0,y:1,z:0};landmarks[5]={x:-.2,y:.6,z:0};landmarks[17]={x:.2,y:.6,z:0};landmarks[9]={x:0,y:.6,z:0};
  for(const [finger,tip,pip] of [['index',8,6],['middle',12,10],['ring',16,14],['little',20,18]]){
    landmarks[pip]={x:0,y:.45,z:0};landmarks[tip]={x:0,y:extended.includes(finger)?0:.65,z:0};
  }
  landmarks[4]={x:pinch?landmarks[8].x+.035:.3,y:landmarks[8].y,z:0};return landmarks;
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
  sequence.forEach((x,index)=>{const action=gate.read('Open_Palm',[{x}],index*160);if(action)actions.push(action);});
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

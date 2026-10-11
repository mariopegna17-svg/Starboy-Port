import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureGate,gestureName} from '../public/js/gesture.js';

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

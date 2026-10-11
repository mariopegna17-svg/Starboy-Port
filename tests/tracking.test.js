import test from 'node:test';
import assert from 'node:assert/strict';
import {GazeTracker} from '../public/js/tracking.js';

test('el rostro dirige la mirada y tiene prioridad sobre la mano',()=>{
  const tracker=new GazeTracker();
  const gaze=tracker.update({face:{x:.25,y:.6,yaw:0,pitch:0},faceFresh:true},1000);
  assert.ok(gaze.x>0&&gaze.y>0);
  const withHand=tracker.update({faceFresh:false,handsFresh:true,landmarks:[Array.from({length:21},()=>({x:.9,y:.1}))]},1100);
  assert.ok(withHand.x>0&&withHand.y>0);
});
test('perder el rostro permite seguir la mano y luego volver al centro',()=>{
  const tracker=new GazeTracker();tracker.update({face:{x:.2,y:.4},faceFresh:true},1000);
  tracker.update({faceFresh:true,face:null,handsFresh:true,landmarks:[Array.from({length:21},()=>({x:.9,y:.6}))]},1800);
  assert.ok(tracker.target.x<0);
  tracker.update({faceFresh:true,face:null,landmarks:[]},3000);assert.deepEqual(tracker.target,{x:0,y:0});
});
test('ruido no finito no contamina las coordenadas de los ojos',()=>{
  const tracker=new GazeTracker();const gaze=tracker.update({face:{x:NaN,y:.5},faceFresh:true},1000);
  assert.ok(Number.isFinite(gaze.x)&&Number.isFinite(gaze.y));
});

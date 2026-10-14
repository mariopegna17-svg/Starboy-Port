import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTIONS,MotionPlayer,MoodBlend,sampleMotion,neutralPose} from '../public/js/motion.js';

test('todas las secuencias vuelven a reposo y mantienen movimientos pequeños y finitos',()=>{
  for(const name of Object.keys(MOTIONS)){
    assert.deepEqual(sampleMotion(name,0),neutralPose());assert.deepEqual(sampleMotion(name,1),neutralPose());
    for(let i=0;i<=100;i++){const pose=sampleMotion(name,i/100);assert.ok(Object.values(pose).every(Number.isFinite),name);assert.ok(Math.abs(pose.tilt)<=.05&&Math.abs(pose.y)<=6&&Math.abs(pose.x)<=2&&Math.abs(pose.scale)<=.01,name);}
  }
});
test('una caricia o comida interrumpe la mirada espontánea sin saltar ni acumular animaciones',()=>{
  const motion=new MotionPlayer();motion.play('scan',0,{source:'idle'});const visible=motion.pose(900);
  motion.play('feed',900);assert.deepEqual(motion.pose(900),visible);assert.equal(motion.current.source,'reaction');
  motion.tick(2000,{busy:true});assert.equal(motion.current.name,'feed');
  motion.tick(3800,{busy:true});assert.deepEqual(motion.pose(3800),neutralPose());assert.equal(motion.current,null);
});
test('las personalidades tienen momentos diferentes y no repiten la misma secuencia seguida',()=>{
  const names=new Set();for(const trait of ['curious','playful','dreamy','shy']){
    const motion=new MotionPlayer({random:()=>0});motion.tick(0,{traits:[trait]});const first=motion.current.name;names.add(first);
    motion.tick(motion.nextIdle,{traits:[trait]});assert.notEqual(motion.current.name,first);
  }assert.equal(names.size,4);
});
test('menús, sueño, cuidados y movimiento reducido no inician gestos espontáneos',()=>{
  for(const options of [{blocked:true},{busy:true},{mood:'asleep'},{reduced:true}]){
    const motion=new MotionPlayer();assert.deepEqual(motion.tick(5000,options),[]);assert.equal(motion.current,null);
  }
  const motion=new MotionPlayer();motion.play('scan',0,{source:'idle'});const before=motion.pose(700);motion.tick(700,{blocked:true});assert.deepEqual(motion.pose(700),before);assert.deepEqual(motion.pose(960),neutralPose());
});
test('parpadeos de una secuencia no se repiten por fotograma ni se reproducen al volver tarde',()=>{
  const motion=new MotionPlayer();motion.play('feed',0);assert.deepEqual(motion.tick(1000,{busy:true}),['blink']);
  assert.deepEqual(motion.tick(1050,{busy:true}),[]);assert.deepEqual(motion.tick(2400,{busy:true}),['blink']);
  motion.clear(20000);assert.deepEqual(motion.tick(20000),[]);assert.equal(motion.current,null);
});
test('una emoción interrumpida parte de lo visible y todas las mezclas conservan su peso',()=>{
  const blend=new MoodBlend();blend.set('asleep',1000);const halfway=blend.at(1260);assert.equal(halfway.happy,.5);assert.equal(halfway.asleep,.5);
  blend.set('happy',1260);assert.deepEqual(blend.at(1260),halfway);
  for(let time=1260;time<=1780;time+=20)assert.ok(Math.abs(Object.values(blend.at(time)).reduce((sum,n)=>sum+n,0)-1)<.002);
  assert.deepEqual(blend.at(1780),{happy:1});
});

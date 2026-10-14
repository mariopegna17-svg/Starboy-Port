// Whole-eye poses keep the original paths and palette intact. Coordinates are
// gaze offsets, pixel translations, radians of tilt, and a uniform scale offset.
const KEYS=['gazeX','gazeY','x','y','tilt','scale'];
export const neutralPose=()=>Object.fromEntries(KEYS.map(key=>[key,0]));
export const ease=value=>{const n=Math.max(0,Math.min(1,value));return n*n*(3-2*n);};
const clip=(duration,frames,blinks=[])=>({duration,frames,blinks});
export const MOTIONS={
  scan:clip(3400,[[0,0,0,0,0,0,0],[.18,-.28,-.04,-1,-1,-.018,0],[.36,-.28,-.04,-1,-1,-.018,0],[.61,.3,-.1,1,-2,.022,0],[.76,.3,-.1,1,-2,.022,0],[1,0,0,0,0,0,0]],[.83]),
  peek:clip(2800,[[0,0,0,0,0,0,0],[.25,.24,.13,1,2,-.028,0],[.48,.24,.13,1,2,-.028,0],[.72,0,.04,0,-1,.012,0],[1,0,0,0,0,0,0]],[.58]),
  float:clip(4200,[[0,0,0,0,0,0,0],[.26,.08,-.15,1,-3,.012,.004],[.54,-.07,-.12,-1,-2,-.012,.004],[.75,-.07,-.12,-1,-2,-.012,.002],[1,0,0,0,0,0,0]],[.7]),
  hop:clip(1900,[[0,0,0,0,0,0,0],[.13,0,.08,0,2,-.008,0],[.3,0,-.12,0,-6,.018,0],[.47,0,0,0,0,0,0],[.64,.08,-.05,0,-3,-.012,0],[.8,0,0,0,0,0,0],[1,0,0,0,0,0,0]]),
  sigh:clip(3300,[[0,0,0,0,0,0,0],[.23,0,.06,0,-1,-.008,.006],[.58,0,.11,0,2,.018,0],[.8,0,.04,0,1,.008,0],[1,0,0,0,0,0,0]],[.35]),
  doze:clip(3900,[[0,0,0,0,0,0,0],[.28,.04,.16,0,2,.025,0],[.6,.04,.16,0,3,.03,0],[.83,0,.04,0,1,.01,0],[1,0,0,0,0,0,0]],[.28,.66]),
  curious:clip(2600,[[0,0,0,0,0,0,0],[.22,.18,-.12,0,-2,.042,0],[.44,.18,-.12,0,-2,.042,0],[.7,.12,.08,0,1,-.018,0],[1,0,0,0,0,0,0]],[.77]),
  hungry:clip(2800,[[0,0,0,0,0,0,0],[.25,-.12,.21,0,2,-.018,0],[.52,.14,.21,0,2,.018,0],[.75,0,.06,0,0,0,0],[1,0,0,0,0,0,0]],[.68]),
  shiver:clip(2100,[[0,0,0,0,0,0,0],[.18,0,.04,0,0,-.008,0],[.26,0,.04,2,0,.008,0],[.34,0,.04,-2,0,-.008,0],[.42,0,.04,2,0,.008,0],[.5,0,.04,-2,0,-.008,0],[.65,0,.04,0,1,0,0],[1,0,0,0,0,0,0]],[.73]),
  alert:clip(2600,[[0,0,0,0,0,0,0],[.2,-.18,0,-1,0,-.025,0],[.37,-.18,0,-1,0,-.025,0],[.55,.2,0,1,0,.025,0],[.7,.2,0,1,0,.025,0],[1,0,0,0,0,0,0]],[.8]),
  feed:clip(2900,[[0,0,0,0,0,0,0],[.16,0,.22,0,1,0,0],[.3,0,.1,0,-2,-.012,0],[.43,0,.03,0,1,.01,0],[.56,0,.03,0,-2,-.01,0],[.7,0,0,0,1,.01,0],[.84,0,0,0,-1,.02,0],[1,0,0,0,0,0,0]],[.32,.72]),
  play:clip(2300,[[0,0,0,0,0,0,0],[.12,0,.04,0,2,-.012,0],[.27,-.1,-.12,-1,-5,.025,0],[.44,.1,0,1,1,-.02,0],[.61,.1,-.08,1,-4,-.025,0],[.79,0,0,0,0,.01,0],[1,0,0,0,0,0,0]],[.83]),
  wave:clip(2200,[[0,0,0,0,0,0,0],[.2,.1,0,0,-1,-.04,0],[.42,.1,0,0,-1,.035,0],[.65,0,0,0,-1,-.023,0],[.82,0,0,0,0,.012,0],[1,0,0,0,0,0,0]],[.76]),
  celebrate:clip(2600,[[0,0,0,0,0,0,0],[.13,0,.05,0,2,-.015,0],[.29,-.12,-.1,-1,-5,.045,0],[.45,0,0,0,1,0,0],[.61,.12,-.1,1,-4,-.04,0],[.8,0,0,0,0,.012,0],[1,0,0,0,0,0,0]],[.84]),
  welcome:clip(2700,[[0,0,0,0,0,0,0],[.22,0,-.08,0,-2,-.02,.005],[.47,0,0,0,1,.025,0],[.71,0,0,0,-1,-.012,0],[1,0,0,0,0,0,0]],[.2]),
  wake:clip(3200,[[0,0,0,0,0,0,0],[.22,0,-.18,0,-2,-.018,.007],[.44,.14,-.08,1,-1,.023,.005],[.65,0,0,0,1,-.01,0],[.82,0,0,0,0,.005,0],[1,0,0,0,0,0,0]],[.62]),
  sleep:clip(2800,[[0,0,0,0,0,0,0],[.25,0,.15,0,2,.015,0],[.55,0,.18,0,3,.03,0],[.82,0,.05,0,1,.01,0],[1,0,0,0,0,0,0]]),
  proud:clip(2400,[[0,0,0,0,0,0,0],[.24,0,-.06,0,-2,-.022,.006],[.48,0,0,0,1,.015,.004],[.73,0,0,0,-1,-.008,0],[1,0,0,0,0,0,0]],[.67]),
  startle:clip(2100,[[0,0,0,0,0,0,0],[.14,0,-.1,0,-4,-.035,.009],[.36,0,0,1,1,.025,0],[.64,0,0,0,-1,-.015,0],[1,0,0,0,0,0,0]],[.73]),
  nod:clip(1500,[[0,0,0,0,0,0,0],[.2,0,.04,0,3,0,0],[.38,0,-.02,0,-1,0,0],[.6,0,.04,0,2,0,0],[.8,0,0,0,-1,0,0],[1,0,0,0,0,0,0]]),
  nope:clip(1700,[[0,0,0,0,0,0,0],[.2,-.08,0,-1,0,-.03,0],[.42,.08,0,1,0,.03,0],[.65,-.05,0,-1,0,-.02,0],[.82,0,0,0,0,.008,0],[1,0,0,0,0,0,0]])
};
export function sampleMotion(name,progress,direction=1){
  const frames=MOTIONS[name]?.frames;if(!frames||progress<=0||progress>=1)return neutralPose();
  let i=1;while(i<frames.length-1&&progress>frames[i][0])i++;
  const a=frames[i-1],b=frames[i],weight=ease((progress-a[0])/(b[0]-a[0])),pose={};
  KEYS.forEach((key,j)=>{pose[key]=(a[j+1]+(b[j+1]-a[j+1])*weight)*(['gazeX','x','tilt'].includes(key)?direction:1);});return pose;
}
const PERSONALITIES={curious:['scan','curious','peek'],playful:['hop','play','curious'],dreamy:['float','doze','sigh'],shy:['peek','sigh','curious']};
const MOOD_MOTIONS={hungry:['hungry','peek'],cold:['shiver','sigh'],hot:['sigh','doze'],anxious:['alert','sigh'],sad:['sigh','peek'],angry:['nope','sigh'],sleepy:['doze','sigh'],playful:['hop','play'],loved:['sigh','proud']};
export class MotionPlayer {
  constructor({random=Math.random}={}){this.random=random;this.current=null;this.nextIdle=0;this.lastIdle='';}
  play(name,time,{duration=MOTIONS[name]?.duration||260,source='reaction',direction=1,initial=this.pose(time)}={}){
    this.current={name,startedAt:time,duration,source,direction,initial,event:0};this.nextIdle=time+duration+1800;return this.current;
  }
  pose(time){
    if(!this.current)return neutralPose();const progress=Math.max(0,(time-this.current.startedAt)/this.current.duration);
    if(progress>=1)return neutralPose();const pose=sampleMotion(this.current.name,progress,this.current.direction),settle=1-ease((time-this.current.startedAt)/260);
    for(const key of KEYS)pose[key]+=this.current.initial[key]*settle;return pose;
  }
  tick(time,{mood='happy',traits=['curious'],blocked=false,reduced=false,busy=false}={}){
    if(reduced){this.clear(time);return [];}
    if(this.current&&time-this.current.startedAt>=this.current.duration)this.current=null;
    if(blocked||busy||mood==='asleep'){
      this.nextIdle=Math.max(this.nextIdle,time+1800);
      if(this.current?.source==='idle')this.play('',time,{duration:260,source:'settle'});
    }else if(!this.current&&time>=this.nextIdle){
      const trait=traits[Math.floor(this.random()*traits.length)]||'curious';
      let choices=MOOD_MOTIONS[mood]||PERSONALITIES[trait]||PERSONALITIES.curious;choices=choices.filter(name=>name!==this.lastIdle);
      const name=choices[Math.floor(this.random()*choices.length)];this.lastIdle=name;this.play(name,time,{source:'idle',direction:this.random()<.5?-1:1});
      this.nextIdle=time+MOTIONS[name].duration+4000+this.random()*4500;
    }
    const events=[];if(this.current){const progress=(time-this.current.startedAt)/this.current.duration,blinks=MOTIONS[this.current.name]?.blinks||[];while(this.current.event<blinks.length&&progress>=blinks[this.current.event]){this.current.event++;events.push('blink');}}
    return events;
  }
  clear(time=0){this.current=null;this.nextIdle=time+2200;}
}
// A rapid mood change starts from the visible blend, rather than jumping back
// to the previous mood. The pet's actual state and stored data are untouched.
export class MoodBlend {
  constructor(mood='happy'){this.current={[mood]:1};this.from=this.current;this.target=mood;this.startedAt=0;}
  set(mood,time){if(this.target===mood)return;this.from=this.at(time);this.target=mood;this.startedAt=time;}
  at(time){const weight=ease((time-this.startedAt)/520),keys=new Set([...Object.keys(this.from),this.target]),values={};for(const key of keys){const value=(this.from[key]||0)*(1-weight)+(key===this.target?weight:0);if(value>.001)values[key]=value;}this.current=values;return values;}
}

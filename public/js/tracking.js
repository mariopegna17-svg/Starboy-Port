const clamp=value=>Math.max(-.6,Math.min(.6,value));

// Prefer the person's face. Hand gestures must not pull the eyes away from it.
export class GazeTracker {
  constructor(){this.faceAt=-Infinity;this.handAt=-Infinity;this.target={x:0,y:0};this.current={x:0,y:0};}
  update(result,time){
    const face=result.face;
    if(result.faceFresh!==false&&face&&Number.isFinite(face.x)&&Number.isFinite(face.y)){
      this.faceAt=time;
      this.target={x:clamp((.5-face.x)*2-(face.yaw||0)*.12),y:clamp((face.y-.5)*1.5+(face.pitch||0)*.08)};
    }
    const hand=result.landmarks?.[0]?.[9];
    if(time-this.faceAt>700&&result.handsFresh!==false&&hand&&Number.isFinite(hand.x)&&Number.isFinite(hand.y)){
      this.handAt=time;this.target={x:clamp((.5-hand.x)*1.1),y:clamp((hand.y-.5)*.8)};
    }
    if(time-Math.max(this.faceAt,this.handAt)>1000)this.target={x:0,y:0};
    for(const axis of ['x','y']){
      const delta=this.target[axis]-this.current[axis];
      if(Math.abs(delta)>.008)this.current[axis]+=delta*.55;
    }
    return this.current;
  }
}

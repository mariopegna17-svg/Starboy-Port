/** Resample traced contours for smooth movement between the recorded frames. */
function outline(points){
  const count=points.length/2,lengths=[0];let length=0;
  for(let i=0;i<count;i++){const next=(i+1)%count;length+=Math.hypot(points[next*2]-points[i*2],points[next*2+1]-points[i*2+1]);lengths.push(length);}
  if(length<2)return points;
  const samples=length<20?16:96,output=[];let edge=0;
  for(let i=0;i<samples;i++){
    const at=i*length/samples;while(edge<count-1&&lengths[edge+1]<at)edge++;
    const next=(edge+1)%count,t=(at-lengths[edge])/(lengths[edge+1]-lengths[edge]||1);
    output.push(points[edge*2]+(points[next*2]-points[edge*2])*t,points[edge*2+1]+(points[next*2+1]-points[edge*2+1])*t);
  }
  // Suppress camera/threshold noise without rounding away narrow eyelids.
  return output.map((value,i)=>value*.8+output[(i-2+output.length)%output.length]*.1+output[(i+2)%output.length]*.1);
}
const alignments=new WeakMap();
function blend(a,b,t){
  if(a.length!==b.length)return a;
  let cache=alignments.get(a);if(!cache){cache=new WeakMap();alignments.set(a,cache);}
  let aligned=cache.get(b);
  if(!aligned){
    let shift=0,best=Infinity;
    for(let offset=0;offset<b.length;offset+=2){let distance=0;for(let i=0;i<a.length;i+=2)distance+=(a[i]-b[(i+offset)%b.length])**2+(a[i+1]-b[(i+offset+1)%b.length])**2;if(distance<best){best=distance;shift=offset;}}
    aligned=best/a.length>600?a:b.map((_,i)=>b[(i+shift)%b.length]);
    cache.set(b,aligned);
  }
  return a.map((value,i)=>value+(aligned[i]-value)*t);
}

/** Canvas reconstruction traced from the supplied physical first-boot video. */
export class BootSequence {
  constructor(screen, {blocked = () => false} = {}) {
    this.screen = screen;
    this.canvas = screen.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.blocked = blocked;
    this.elapsed = 0;
    this.data = null;
    this.lastFrame = -1;
    this.finish = null;
    this.outlines=new Map();
  }

  async load() {
    if (this.data) return;
    const response = await fetch('/boot/sequence.json');
    if (!response.ok) throw new Error('No se pudo cargar el primer encendido.');
    const data = await response.json();
    if (data.version !== 1 || data.size !== 400 || !Array.isArray(data.frames) || !data.frames.length || !(data.fps > 0) || !(data.duration > 0)) {
      throw new Error('La secuencia de encendido no es válida.');
    }
    this.data = data;
    this.canvas.width = this.canvas.height = data.size * Math.min(devicePixelRatio || 1, 2);
  }

  async play() {
    let cancelled=false,cancelLoading;
    const cancellation=new Promise(resolve=>{cancelLoading=()=>{cancelled=true;resolve();};});
    this.finish=cancelLoading;
    try{await Promise.race([this.load(),cancellation]);}
    finally{if(this.finish===cancelLoading)this.finish=null;}
    if(cancelled||document.hidden)return false;
    this.lastFrame = -1;
    this.screen.hidden = false;
    this.draw(this.elapsed);
    return new Promise(resolve => {
      let last = null, animation;
      const resetClock = () => { last = null; };
      const leave = () => complete(false);
      // Release the first-boot lock while hidden so another visible tab can
      // start. This page retains its cursor and resumes if still unwatched.
      const visibility = () => { if(document.hidden)leave();else resetClock(); };
      const complete = watched => {
        cancelAnimationFrame(animation);
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('resize', resetClock);
        window.removeEventListener('pagehide', leave);
        this.finish = null;
        this.screen.dataset.state = watched ? 'complete' : 'interrupted';
        this.screen.hidden = true;
        resolve(watched);
      };
      this.finish = leave;
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('resize', resetClock);
      window.addEventListener('pagehide', leave, {once: true});
      const tick = time => {
        if (document.hidden || this.blocked()) {
          last = null;
          this.screen.dataset.state = 'paused';
        } else {
          this.screen.dataset.state = 'playing';
          // A suspended or stalled page cannot count unseen frames as watched.
          if (last !== null) this.elapsed += Math.min(Math.max(time - last, 0), 100);
          last = time;
          this.draw(this.elapsed);
          if (this.elapsed >= this.data.duration) { complete(true); return; }
        }
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
    });
  }

  draw(elapsed) {
    const {size, fps, frames, palette} = this.data;
    const index = Math.min(frames.length - 1, Math.floor(elapsed * fps / 1000));
    this.lastFrame = index;
    const [background, , phase] = frames[index];
    const next=frames[Math.min(index+1,frames.length-1)],fraction=Math.max(0,Math.min(1,elapsed*fps/1000-index));
    const prepare=frameIndex=>{
      if(!this.outlines.has(frameIndex))this.outlines.set(frameIndex,frames[frameIndex][1].map(([color,contours])=>[color,contours.map(outline)]));
      return this.outlines.get(frameIndex);
    };
    const current=prepare(index),following=prepare(Math.min(index+1,frames.length-1));
    for(const key of this.outlines.keys())if(key<index-1||key>index+1)this.outlines.delete(key);
    this.screen.dataset.phase = phase;
    const ctx = this.ctx, ratio = this.canvas.width / size;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = background < 0 ? '#000' : palette[background];
    ctx.fillRect(0, 0, size, size);
    // Filmed eyelids are subpixel curves and disappear in the traced masks.
    // Reconstruct these final poses cleanly from the supplied reference.
    if(elapsed>=41800){this.finalEyes(elapsed);ctx.restore();return;}
    for (const [color, contours] of current) {
      const other=next[2]===phase?following.find(group=>group[0]===color)?.[1]:null;
      ctx.beginPath();
      for (let contour=0;contour<contours.length;contour++) {
        const points=other?.length===contours.length?blend(contours[contour],other[contour],fraction):contours[contour];
        const last = points.length - 2;
        ctx.moveTo((points[last] + points[0]) / 2, (points[last + 1] + points[1]) / 2);
        for (let offset = 0; offset < points.length; offset += 2) {
          const next = (offset + 2) % points.length;
          ctx.quadraticCurveTo(points[offset], points[offset + 1], (points[offset] + points[next]) / 2, (points[offset + 1] + points[next + 1]) / 2);
        }
        ctx.closePath();
      }
      ctx.fillStyle = palette[color];
      ctx.shadowColor=phase==='birth'?palette[color]:'transparent';ctx.shadowBlur=phase==='birth'?3*ratio:0;
      ctx.fill('evenodd');
      if(phase==='eyes'){
        ctx.strokeStyle=palette[color];ctx.lineWidth=1;ctx.lineJoin='round';ctx.stroke();
      }
    }
    ctx.restore();
  }

  finalEyes(elapsed){
    elapsed=Math.min(elapsed,50500);
    const ctx=this.ctx,opening=Math.max(0,Math.min(1,(elapsed-48250)/220));
    const ease=opening*opening*(3-2*opening);
    const poses=[[48250,122,275],[48500,122,275],[49000,93,220],[49500,172,302],[50000,155,300],[50500,130,278]];
    let left=122,right=275;
    for(let i=0;i<poses.length-1;i++)if(elapsed>=poses[i][0]&&elapsed<=poses[i+1][0]){
      const t=(elapsed-poses[i][0])/(poses[i+1][0]-poses[i][0]);left=poses[i][1]+(poses[i+1][1]-poses[i][1])*t;right=poses[i][2]+(poses[i+1][2]-poses[i][2])*t;break;
    }
    const centerY=244-58*ease;
    for(const [index,x] of [left,right].entries()){
      ctx.save();ctx.translate(x,centerY);
      if(opening===0){
        ctx.beginPath();ctx.moveTo(-47,-4);ctx.bezierCurveTo(-29,7,29,7,47,-4);
        ctx.strokeStyle='#e3d285';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.stroke();
      }else{
        ctx.beginPath();ctx.ellipse(0,0,56,Math.max(1,72*ease),0,0,Math.PI*2);ctx.fillStyle='#e3d285';ctx.fill();ctx.clip();
        ctx.beginPath();ctx.ellipse(index===0?12:-28,2,32,36*ease,0,0,Math.PI*2);ctx.fillStyle=index===0?'#429b46':'#273fcc';ctx.fill();
      }
      ctx.restore();
    }
  }
}

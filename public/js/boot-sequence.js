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
    await this.load();
    if(document.hidden)return false;
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
    if (index === this.lastFrame) return;
    this.lastFrame = index;
    const [background, groups, phase] = frames[index];
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
    for (const [color, contours] of groups) {
      ctx.beginPath();
      for (const points of contours) {
        const last = points.length - 2;
        ctx.moveTo((points[last] + points[0]) / 2, (points[last + 1] + points[1]) / 2);
        for (let offset = 0; offset < points.length; offset += 2) {
          const next = (offset + 2) % points.length;
          ctx.quadraticCurveTo(points[offset], points[offset + 1], (points[offset] + points[next]) / 2, (points[offset + 1] + points[next + 1]) / 2);
        }
        ctx.closePath();
      }
      ctx.fillStyle = palette[color];
      ctx.fill('evenodd');
      if(phase==='eyes'){
        ctx.strokeStyle=palette[color];ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.stroke();
      }
    }
    ctx.restore();
  }
}

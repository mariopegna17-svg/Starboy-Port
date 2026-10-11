export const FIRST_BOOT_KEY = 'starboy.first-boot.v1';

/**
 * Keeps the physical device's first-boot sequence separate from a pet's life.
 * The renderer must resolve true only after the actual sequence has finished.
 * An absent or interrupted renderer leaves the first-boot flag pending.
 */
export class FirstBoot {
  constructor(storage) {
    this.storage = storage;
    this.completed = false;
    this.running = null;
    try { this.completed = storage?.getItem(FIRST_BOOT_KEY) === 'complete'; }
    catch { /* The current session still supports a single playback. */ }
  }

  play(render) {
    if (this.completed || typeof render !== 'function') return Promise.resolve(false);
    if (this.running) return this.running;
    const locks = globalThis.navigator?.locks;
    const playback = locks?.request
      ? locks.request(FIRST_BOOT_KEY, () => this.perform(render))
      : this.perform(render);
    this.running = playback.finally(() => { this.running = null; });
    return this.running;
  }

  async perform(render) {
    // Another tab may have completed the sequence since this page was opened.
    try {
      if (this.storage?.getItem(FIRST_BOOT_KEY) === 'complete') {
        this.completed = true;
        return false;
      }
    } catch {}
    if (await render() !== true) return false;
    this.completed = true;
    try { this.storage?.setItem(FIRST_BOOT_KEY, 'complete'); }
    catch { /* Storage denial cannot persist a flag across browser restarts. */ }
    return true;
  }
}

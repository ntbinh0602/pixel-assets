// Render the upstream library without changing any effect source files.
import { createFrame, clearFrame, createFx, createAct, actBounds, actSpan, composite, backdrop, drawActor, painterFor, stockActor, actorAlphaOf } from '../pixelfx/src/core/index.js';

export class Player {
  constructor(canvas, fx, aspect = 1.65) {
    Object.assign(this, { canvas, fx, aspect, ctx: canvas.getContext('2d'), actor: true, flip: false, opts: {}, speed: 1, playing: true, background: 'grid', wait: 0, acc: 0 });
    this.layout();
  }
  get acted() { return Boolean(this.actor && this.fx.mod.act); }
  get drawX() { return this.flip ? this.W - this.x : this.x; }
  get duration() {
    if (!this.acted) return this.fx.meta.duration;
    const s = actSpan(this.fx.mod);
    return (Number.isFinite(s.to) ? s.to : this.fx.meta.duration) - s.from + (this.fx.mod.act.hits ?? []).reduce((sum, h) => sum + (h.stop ?? 0), 0);
  }
  layout() {
    const m = this.fx.meta;
    const b = this.acted ? { ...actBounds(this.fx.mod) } : null;
    if (b) b.y1 = Math.min(b.y1, 22);
    const [w, h] = b ? [b.x1 - b.x0, b.y1 - b.y0] : m.size;
    const [ox, oy] = b ? [-b.x0, -b.y0] : m.origin;
    const screen = !b && m.size[0] >= 320 && Math.abs(m.size[0] / m.size[1] - 16 / 9) < .05;
    const pad = screen ? 1 : b ? 1.08 : 1.15;
    this.W = Math.ceil(Math.max(w * pad, h * pad * this.aspect));
    this.H = Math.ceil(this.W / this.aspect);
    this.x = Math.floor((this.W - w) / 2) + ox;
    this.y = b ? Math.max(oy + 2, this.H - b.y1 - 2) : Math.floor((this.H - h) / 2) + oy;
    this.canvas.width = this.W; this.canvas.height = this.H;
    this.frame = createFrame(this.W, this.H);
    this.img = this.ctx.createImageData(this.W, this.H);
    this.setBackground(this.background);
    this.restart();
  }
  setBackground(kind) { this.background = kind; this.bg = kind === 'ground' ? backdrop('ground', this.W, this.H, this.y) : null; this.dirty = true; }
  restart() {
    this.inst = (this.acted ? createAct : createFx)(this.fx.mod, { x: this.drawX, y: this.y, ...this.opts, flip: this.flip });
    this.elapsed = 0; this.wait = 0; this.acc = 0; this.dirty = true;
  }
  advance(dt) { this.inst.update(dt); this.elapsed += dt; this.dirty = true; }
  seek(fraction) {
    this.restart();
    const goal = Math.max(0, Math.min(1, fraction)) * this.duration;
    for (let t = 0; t < goal; t += 1 / 120) this.advance(Math.min(1 / 120, goal - t));
    this.render();
  }
  tick(dt) {
    if (this.playing) this.acc = Math.min(this.acc + dt * this.speed, .25);
    const step = 1 / this.fx.meta.fps;
    while (this.acc >= step) {
      this.acc -= step;
      if (!this.fx.meta.loop && this.inst.done()) {
        this.wait += step;
        if (this.wait > .6) this.restart();
      } else this.advance(step);
    }
    if (this.dirty) this.render();
  }
  render(transparent = false) {
    const f = clearFrame(this.frame);
    if (this.acted) this.inst.draw(f);
    else {
      this.inst.draw(f, 'back');
      if (this.fx.meta.actor && this.actor) {
        const t = this.fx.meta.loop ? this.inst.t % this.fx.meta.duration : Math.min(this.inst.t, this.fx.meta.duration);
        drawActor(painterFor(f).place(this.drawX, this.y, this.flip), this.inst.options.actor ?? stockActor(), actorAlphaOf(this.fx.mod, t, this.inst.options));
      }
      this.inst.draw(f, 'front');
    }
    composite(f, this.img.data, transparent ? null : this.bg);
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = false;
  }
}

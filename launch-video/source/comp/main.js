/* INKubator — "Coming soon" studio reel.
 * One GSAP master timeline keyed to the song's beat grid (window.BEATS).
 * Every visual is a pure function of time: renderFrame(t) seeks the paused
 * timeline and runs per-frame hooks, so frames render deterministically.
 * ?format=vertical switches to 1080x1920 with its own layout values. */
(() => {
  const P = new URLSearchParams(location.search);
  const V = P.get('format') === 'vertical';
  const W = V ? 1080 : 1920;
  const H = V ? 1920 : 1080;
  const BEATS = window.BEATS;
  const B = (i) => BEATS[i];
  const HB = (i) => (BEATS[i] + BEATS[i + 1]) / 2;
  const SHOTS = '../shots/';
  const pick = (h, v) => (V ? v : h);

  const stage = document.getElementById('stage');
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  const root = document.getElementById('pulse');
  const shakeEl = document.getElementById('shake');
  const bg = document.getElementById('bg');
  const flash = document.getElementById('flash');
  gsap.set([root, shakeEl], { transformOrigin: '50% 50%' });

  // Seeded randomness keeps every render identical
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = mulberry32(20261028);
  const rr = (a, b) => a + (b - a) * rand();

  // ---------------------------------------------------------------- helpers
  const el = (tag, cls, parent, style, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) Object.assign(e.style, style);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  const scene = (name, background) => {
    const s = el('div', 'scene', root);
    s.dataset.scene = name;
    if (background) s.style.background = background;
    return s;
  };
  const persp = (parent, p = 1600) => {
    const wrap = el('div', 'persp', parent, { perspective: `${p}px` });
    return el('div', 'cam', wrap);
  };
  const chars = (node, text) => {
    node.textContent = '';
    return [...text].map((ch) => el('span', 'c', node, null, ch === ' ' ? ' ' : ch));
  };
  const words = (node, text) => {
    node.textContent = '';
    const parts = text.split(' ');
    return parts.map((w, i) => el('span', 'w', node, null, w + (i < parts.length - 1 ? ' ' : '')));
  };
  /** Centered text block positioned by its center (x, y from stage center). */
  const label = (parent, cls, text, size, x, y, extra = {}) => {
    const n = el('div', `${cls} center`, parent, Object.assign({ fontSize: `${size}px`, textAlign: 'center' }, extra));
    if (text != null) n.innerHTML = text;
    gsap.set(n, { xPercent: -50, yPercent: -50, x, y });
    return n;
  };
  /** Framed product shot; image is 1440x900 logical (2880x1800 px). */
  const frame = (parent, src, w, h) => {
    const f = el('div', 'frame p3d', parent, { width: `${w}px`, height: `${h}px`, left: `${-w / 2}px`, top: `${-h / 2}px` });
    const img = el('img', '', f);
    img.src = SHOTS + src;
    img.style.width = `${w}px`;
    el('div', 'gloss', f);
    f.img = img;
    f.fw = w;
    f.fh = h;
    return f;
  };
  /** Image transform that fills the frame with a logical region (rx,ry,rw,rh). */
  const focus = (f, rx, ry, rw, rh) => {
    const k = f.fw / 1440; // logical px → displayed px at scale 1
    const scale = Math.max(1, Math.min(f.fw / (rw * k), f.fh / (rh * k)));
    const imgH = 900 * k * scale;
    let x = f.fw / 2 - (rx + rw / 2) * k * scale;
    let y = f.fh / 2 - (ry + rh / 2) * k * scale;
    x = Math.min(0, Math.max(f.fw - f.fw * scale, x));
    y = Math.min(0, Math.max(f.fh - imgH, y));
    return { scale, x, y };
  };

  // ---------------------------------------------------------------- timeline
  const tl = gsap.timeline({ paused: true });
  const ft = (t, target, from, to) => tl.fromTo(target, from, Object.assign({ immediateRender: false }, to), t);
  const to = (t, target, vars) => tl.to(target, vars, t);
  const set = (t, target, vars) => tl.set(target, vars, t);
  const show = (sc, a, b) => {
    set(a, sc, { autoAlpha: 1 });
    if (b != null) set(b, sc, { autoAlpha: 0 });
  };
  const flashAt = (t, color = '#ffffff', peak = 0.8, dur = 0.4) =>
    ft(t, flash, { opacity: peak, backgroundColor: color }, { opacity: 0, duration: dur, ease: 'power2.out' });
  const shake = (t, amp = 14) =>
    ft(t, shakeEl, { x: amp * 0.8, y: -amp * 0.6, rotation: amp * 0.02 }, { x: 0, y: 0, rotation: 0, duration: 0.45, ease: 'elastic.out(1, 0.35)' });
  const hooks = [];

  // Kick pulse on beats 1 and 3 of every bar after the drop
  for (let i = 0; i < BEATS.length; i += 2) {
    ft(B(i), root, { scale: i % 4 === 0 ? 1.018 : 1.01 }, { scale: 1, duration: 0.34, ease: 'power2.out' });
  }

  // ======================================================== S0 · Intro caret
  const s0 = scene('intro');
  const glow0 = el('div', 'layer', s0, { background: 'radial-gradient(ellipse at 50% 55%, rgb(70 38 22 / 0.55), rgb(11 11 11 / 0) 60%)', opacity: 0 });
  const line0 = label(s0, 'serif', null, pick(128, 92), 0, 0, { color: '#F6F2EA', whiteSpace: 'nowrap' });
  const introWords = ['Every', 'story', 'starts', 'here'].map((w) => el('span', 'w', line0, { display: 'none' }, `${w} `));
  introWords[3].innerHTML = 'here<span class="dot">.</span>';
  const caret0 = el('span', '', line0, { display: 'inline-block', width: `${pick(7, 6)}px`, height: '0.92em', background: 'var(--signal)', verticalAlign: '-0.12em', marginLeft: '0.06em' });
  show(s0, 0, 3.6);
  [0, 0.42, 0.84].forEach((t, i) => set(t, caret0, { opacity: i % 2 === 0 ? 1 : 0 }));
  set(0.98, caret0, { opacity: 1 });
  [1.022, 1.347, 1.672, 1.858].forEach((t, i) => {
    set(t, introWords[i], { display: 'inline-block' });
    ft(t, introWords[i], { y: 26, opacity: 0, filter: 'blur(10px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.42, ease: 'expo.out' });
  });
  ft(1.0, glow0, { opacity: 0 }, { opacity: 1, duration: 2.2, ease: 'sine.inOut' });
  [2.3, 2.75, 3.2].forEach((t, i) => set(t, caret0, { opacity: i % 2 === 0 ? 0 : 1 }));
  ft(1.9, line0, { scale: 1 }, { scale: 1.07, duration: 1.7, ease: 'sine.inOut' });
  to(3.05, line0, { opacity: 0, filter: 'blur(16px)', scale: 1.14, duration: 0.55, ease: 'power2.in' });

  // ======================================================== S1 · Page storm
  const s1 = scene('storm', 'radial-gradient(ellipse at 50% 50%, #2A2019 0%, #140F0C 55%, #0B0B0B 100%)');
  const cam1 = persp(s1, 900);
  const sheetSrc = ['page-1.png', 'page-2.png', 'page-title.png', 'page-1.png', 'page-2.png'];
  const sheets = [];
  for (let i = 0; i < 26; i += 1) {
    const w = rr(230, 330);
    const sh = el('div', 'p3d', cam1, {
      width: `${w}px`, height: `${w * (11 / 8.5)}px`, left: `${-w / 2}px`, top: `${-(w * 11 / 8.5) / 2}px`,
      background: '#FBF9F4', borderRadius: '3px', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.55)', overflow: 'hidden',
    });
    if (i % 3 !== 2) {
      const im = el('img', '', sh, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
      im.src = SHOTS + sheetSrc[i % sheetSrc.length];
    } else {
      // Plain manuscript sheet: ruled text lines
      for (let l = 0; l < 14; l += 1) el('div', '', sh, { height: '5px', margin: `${l ? 9 : 26}px 22px 0`, width: `${rr(55, 88)}%`, background: 'rgb(17 17 17 / 0.16)', borderRadius: '3px' });
    }
    let x = rr(-W * 0.62, W * 0.62);
    let y = rr(-H * 0.6, H * 0.6);
    if (Math.abs(x) < W * 0.16 && Math.abs(y) < H * 0.16) x += Math.sign(x || 1) * W * 0.22;
    sheets.push({ node: sh, x, y, z0: rr(-6200, -300), rx: rr(-35, 35), ry: rr(-40, 40), rz: rr(-25, 25), spin: rr(-14, 14) });
  }
  show(s1, 2.9, 8.35);
  ft(2.9, s1, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'sine.out' });
  to(7.55, s1, { opacity: 0, duration: 0.8, ease: 'power2.in' });
  hooks.push((t) => {
    if (t < 2.85 || t > 8.4) return;
    const tt = t - 2.9;
    const camZ = 950 * tt + 140 * tt * tt; // gentle acceleration
    const collapse = Math.max(0, Math.min(1, (t - 7.2) / 1.0));
    const pull = collapse * collapse;
    sheets.forEach((s) => {
      const z = s.z0 + camZ;
      const nearFade = Math.max(0, Math.min(1, (420 - z) / 320));
      const farFade = Math.max(0, Math.min(1, (z + 6600) / 2600));
      const x = s.x * (1 - pull * 0.85);
      const y = s.y * (1 - pull * 0.85);
      s.node.style.opacity = String(nearFade * farFade);
      s.node.style.visibility = nearFade * farFade > 0.01 ? 'visible' : 'hidden';
      s.node.style.transform = `translate3d(${x}px, ${y}px, ${Math.min(z, 420)}px) rotateX(${s.rx + s.spin * tt * 0.6}deg) rotateY(${s.ry + s.spin * tt}deg) rotateZ(${s.rz + s.spin * tt * 0.4 + pull * 180}deg)`;
    });
    cam1.style.transform = `rotateZ(${Math.sin(tt * 0.35) * 4 + pull * 20}deg)`;
  });
  const storm1 = label(s1, 'serif', null, pick(92, 66), 0, pick(0, 0), { color: '#F6F2EA', maxWidth: pick('1500px', '900px'), whiteSpace: V ? 'normal' : 'nowrap', textShadow: '0 4px 40px rgb(0 0 0 / 0.6)' });
  const storm1Chars = chars(storm1, 'Somewhere between the first idea');
  gsap.set(storm1Chars, { opacity: 0 });
  ft(3.55, storm1Chars, { y: 40, opacity: 0, filter: 'blur(12px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.022 });
  to(5.0, storm1, { opacity: 0, y: -30, filter: 'blur(10px)', duration: 0.45, ease: 'power2.in' });
  const storm2 = label(s1, 'serif', null, pick(92, 66), 0, 0, { color: '#F6F2EA', whiteSpace: 'nowrap', textShadow: '0 4px 40px rgb(0 0 0 / 0.6)' });
  const storm2Chars = chars(storm2, 'and the final draft…');
  gsap.set(storm2Chars, { opacity: 0 });
  ft(5.3, storm2Chars, { y: 40, opacity: 0, filter: 'blur(12px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.03 });
  to(7.0, storm2, { opacity: 0, scale: 0.92, filter: 'blur(12px)', duration: 0.6, ease: 'power2.in' });

  // ======================================================== S2 · Ink drop
  const s2 = scene('drop', '#0B0B0B');
  const whisper = label(s2, 'serif', 'There’s a better place to write.', pick(56, 46), 0, pick(-40, -60), { color: 'rgb(246 242 234 / 0.75)', whiteSpace: 'nowrap' });
  const dropSvg = '<svg viewBox="0 0 64 88" width="100%" height="100%"><path d="M32 2 C32 2 4 40 4 58 a28 28 0 0 0 56 0 C60 40 32 2 32 2 Z" fill="#FF4B36"/></svg>';
  const drop2 = el('div', 'center', s2, { width: '46px', height: '64px' });
  drop2.innerHTML = dropSvg;
  gsap.set(drop2, { xPercent: -50, yPercent: -50, opacity: 0 });
  const rings2 = [0, 1, 2].map(() => {
    const r = el('div', 'center', s2, { width: '160px', height: '160px', borderRadius: '50%', border: '3px solid #FF4B36' });
    gsap.set(r, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
    return r;
  });
  const flood = el('div', 'center', s2, { width: `${Math.hypot(W, H) * 1.15}px`, height: `${Math.hypot(W, H) * 1.15}px`, borderRadius: '50%', background: '#F6F2EA' });
  gsap.set(flood, { xPercent: -50, yPercent: -50, scale: 0 });
  show(s2, 7.6, 10.75);
  ft(7.75, whisper, { opacity: 0, filter: 'blur(14px)', y: pick(-20, -40) }, { opacity: 1, filter: 'blur(0px)', y: pick(-40, -60), duration: 1.0, ease: 'expo.out' });
  to(8.75, whisper, { opacity: 0, filter: 'blur(10px)', duration: 0.6, ease: 'power2.in' });
  ft(8.95, drop2, { y: -H / 2 - 80, scaleY: 1, opacity: 1 }, { y: 0, scaleY: 1.32, duration: B(0) - 8.95, ease: 'power2.in' });
  set(B(0), drop2, { opacity: 0 });
  rings2.forEach((r, i) => ft(B(0) + i * 0.07, r, { scale: 0.1, opacity: 1 }, { scale: 9 + i * 3, opacity: 0, duration: 1.1, ease: 'expo.out' }));
  ft(B(0), flood, { scale: 0 }, { scale: 1, duration: 0.62, ease: 'expo.out' });
  shake(B(0), 22);

  // ======================================================== S3 · Logo slam
  const s3 = scene('logo');
  const cam3 = persp(s3, 1400);
  const logo3 = el('div', 'p3d', cam3, { display: 'flex', alignItems: 'center', gap: `${pick(26, 18)}px` });
  const mark3 = el('div', '', logo3, { width: `${pick(118, 84)}px`, height: `${pick(162, 116)}px`, flex: 'none' });
  mark3.innerHTML = dropSvg;
  const word3 = el('div', 'punch', logo3, { fontSize: `${pick(236, 158)}px`, color: '#111' });
  const word3Chars = chars(word3, 'INKubator');
  gsap.set(word3Chars, { opacity: 0 });
  gsap.set(logo3, { xPercent: -50, yPercent: -50, opacity: 0 });
  gsap.set(mark3, { scale: 0 });
  const by3 = label(s3, 'mono', null, pick(30, 26), 0, pick(170, 130), { color: '#3B3A38', whiteSpace: 'nowrap' });
  const by3Chars = chars(by3, 'by Pursion');
  gsap.set(by3Chars, { opacity: 0 });
  const rule3 = el('div', 'center', s3, { width: `${pick(420, 340)}px`, height: '3px', background: 'var(--signal)' });
  gsap.set(rule3, { xPercent: -50, yPercent: -50, y: pick(214, 168), scaleX: 0 });
  show(s3, B(0), B(4) + 0.02);
  set(B(0) + 0.3, bg, { backgroundColor: '#F6F2EA' });
  ft(B(0) + 0.04, logo3, { scale: 2.4, rotateX: 62, z: -200, filter: 'blur(22px)', opacity: 0 }, { scale: 1, rotateX: 0, z: 0, filter: 'blur(0px)', opacity: 1, duration: 0.8, ease: 'expo.out' });
  ft(B(0) + 0.04, word3Chars, { rotateX: -90, y: 60, opacity: 0 }, { rotateX: 0, y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.028 });
  ft(B(0) + 0.12, mark3, { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.2)' });
  ft(B(1), logo3, { scale: 1.035 }, { scale: 1, duration: 0.4, ease: 'power3.out' });
  ft(B(2), by3Chars, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.03 });
  ft(B(2), rule3, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.out' });
  ft(B(2), logo3, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: 'power3.out' });
  flashAt(B(2), '#FF4B36', 0.25, 0.35);
  shake(B(2), 12);
  to(B(3) + 0.05, word3Chars, { rotateX: 90, y: -40, opacity: 0, duration: 0.45, ease: 'power3.in', stagger: { each: 0.03, from: 'center' } });
  to(B(3) + 0.05, [mark3, by3, rule3], { opacity: 0, scale: 0.6, duration: 0.4, ease: 'power3.in' });

  // ======================================================== S4 · UI fly-through
  const dotGrid = 'radial-gradient(circle, rgb(17 17 17 / 0.07) 1.2px, transparent 1.6px) 0 0 / 28px 28px, #F6F2EA';
  const s4 = scene('fly', dotGrid);
  const cam4 = persp(s4, 1800);
  const pw = pick(1180, 900);
  const ph = pick(pw / 1.6, 1250);
  const base4 = pick({ x: 210, y: 30 }, { x: 0, y: 250 });
  // vx: the 640px-wide column each vertical portrait crop centers on
  const flyShots = [
    { src: 'book-editor.png', word: 'Write', t: B(4), tn: B(6), vx: 420 },
    { src: 'book-timeline.png', word: 'Plan', t: B(6), tn: B(8), vx: 240 },
    { src: 'cabinet.png', word: 'Organize', t: B(8), tn: B(10), vx: 400 },
    { src: 'sp-editor.png', word: 'Script', t: B(10), tn: B(12), vx: 330 },
  ];
  show(s4, B(4) - 0.02, B(16) + 0.05);
  flyShots.forEach((s, i) => {
    const f = frame(cam4, s.src, pw, ph);
    gsap.set(f, { opacity: 0 });
    if (V) gsap.set(f.img, focus(f, s.vx, 0, 640, 900));
    const dir = i % 2 === 0 ? 1 : -1;
    ft(s.t, f, { x: base4.x + pick(900, 0) * dir, y: base4.y + pick(0, 900) * dir, z: -2400, rotateY: pick(42 * dir, 0), rotateX: pick(12, 38 * dir), rotateZ: pick(-6 * dir, 0), opacity: 0 },
      { x: base4.x, y: base4.y, z: 0, rotateY: pick(-14, -6), rotateX: pick(8, 10), rotateZ: 0, opacity: 1, duration: 0.62, ease: 'expo.out' });
    to(s.t + 0.62, f, { rotateY: pick(-6, 4), z: 90, duration: s.tn - s.t - 0.7, ease: 'none' });
    ft(s.t + (s.tn - s.t) / 2, f, { z: 150 }, { z: 90, duration: 0.3, ease: 'power3.out' }); // off-beat nudge
    if (i < flyShots.length - 1) {
      to(s.tn - 0.1, f, { x: base4.x - pick(1900, 0) * dir, y: base4.y - pick(0, 1800) * dir, z: -700, rotateY: pick(-55 * dir, 0), rotateX: pick(0, -40 * dir), opacity: 0, duration: 0.32, ease: 'power3.in' });
    } else {
      to(s.tn - 0.12, f, { z: -1600, opacity: 0, rotateY: 30, duration: 0.36, ease: 'power3.in' });
    }
    const w = label(s4, 'punch', `${s.word}<span class="dot">.</span>`, pick(176, 150), pick(-560, 0), pick(0, -600), { color: '#111' });
    gsap.set(w, { opacity: 0 });
    ft(s.t, w, { opacity: 0, y: pick(0, -600) + 70, scale: 1.18, filter: 'blur(12px)' }, { opacity: 1, y: pick(0, -600), scale: 1, filter: 'blur(0px)', duration: 0.45, ease: 'expo.out' });
    to(s.tn - 0.12, w, { opacity: 0, y: pick(-60, -680), filter: 'blur(8px)', duration: 0.22, ease: 'power2.in' });
  });
  // Curved wall of every screen
  const wallShots = ['book-editor.png', 'book-timeline.png', 'cabinet.png', 'sp-guide.png', 'sp-dual.png', 'sp-titlepage.png', 'sp-export.png', 'night-editor.png', 'book-cards.png', 'sp-timeline.png', 'new-modal.png', 'sidebar.png', 'cabinet-stack.png', 'sp-editor.png', 'sp-guide-transitions.png'];
  const wall = el('div', 'p3d', cam4);
  const cols = pick(7, 5);
  const rows = pick(2, 3);
  const tw = pick(560, 470);
  const th = tw / 1.6;
  const R = pick(1500, 1250);
  const stepDeg = pick(21, 22);
  let wi = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const f = frame(wall, wallShots[wi % wallShots.length], tw, th);
      wi += 1;
      const ang = (c - (cols - 1) / 2) * stepDeg;
      const yy = (r - (rows - 1) / 2) * (th + pick(46, 40));
      gsap.set(f, { rotateY: ang, y: yy, transformOrigin: `50% 50% ${R}px`, z: -R });
    }
  }
  gsap.set(wall, { opacity: 0 });
  ft(B(12), wall, { opacity: 0, z: -1600, rotateY: 28 }, { opacity: 1, z: pick(250, 420), rotateY: 12, duration: 0.75, ease: 'expo.out' });
  to(B(12) + 0.75, wall, { rotateY: -14, z: pick(420, 560), duration: B(15) - B(12) - 0.75, ease: 'none' });
  [13, 14].forEach((b) => ft(B(b), wall, { scale: 1.035 }, { scale: 1, duration: 0.35, ease: 'power3.out' }));
  to(B(15), wall, { rotateY: -80, z: -900, opacity: 0, duration: B(16) - B(15), ease: 'power3.in' });
  const wallText = label(s4, 'serif', null, pick(84, 68), 0, pick(455, -810), { color: '#111', whiteSpace: V ? 'normal' : 'nowrap', width: V ? '900px' : 'auto' });
  const wallWords = words(wallText, 'One studio for every story.');
  gsap.set(wallWords, { opacity: 0 });
  gsap.set(wallText, { opacity: 0 });
  set(B(12), wallText, { opacity: 1 });
  ft(B(12) + 0.1, wallWords, { y: 40, opacity: 0, filter: 'blur(10px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out', stagger: 0.12 });
  to(B(15) + 0.2, wallText, { opacity: 0, y: '-=30', duration: 0.3, ease: 'power2.in' });
  flashAt(B(16) - 0.02, '#111111', 0.9, 0.3);

  // ======================================================== S5 · Screenplays
  const s5 = scene('screenplay', 'radial-gradient(ellipse at 50% 40%, #24223A 0%, #121218 55%, #0B0B0B 100%)');
  show(s5, B(16) - 0.02, B(32) + 0.05);
  set(B(16), bg, { backgroundColor: '#0B0B0B' });
  const cam5 = persp(s5, 1700);
  const spTitle = label(s5, 'punch', null, pick(210, 132), 0, pick(-40, -120), { color: '#F6F2EA' });
  const spTitleChars = chars(spTitle, 'SCREENPLAYS');
  gsap.set(spTitleChars, { opacity: 0 });
  const spSub = label(s5, 'serif', 'formatted like the pros.', pick(82, 66), 0, pick(110, 20), { color: 'var(--lavender)', whiteSpace: 'nowrap' });
  gsap.set(spSub, { opacity: 0 });
  ft(B(16), spTitleChars, { z: 400, scale: 2.2, opacity: 0, filter: 'blur(16px)' }, { z: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out', stagger: 0.025 });
  ft(B(17), spSub, { opacity: 0, y: pick(150, 60), filter: 'blur(10px)' }, { opacity: 1, y: pick(110, 20), filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' });
  to(B(18) - 0.12, [spTitle, spSub], { opacity: 0, y: '-=80', filter: 'blur(8px)', duration: 0.25, ease: 'power2.in' });

  // Live-typing Courier script page
  const pageW = pick(1040, 1000);
  const page5 = el('div', 'p3d courier', cam5, { width: `${pageW}px`, height: `${pageW * 11 / 8.5}px`, left: `${-pageW / 2}px`, top: `${-(pageW * 11 / 8.5) / 2}px`, background: '#FFFFFF', borderRadius: '6px', boxShadow: '0 40px 90px -20px rgb(0 0 0 / 0.7)', color: '#111', fontSize: `${pick(31, 34)}px`, lineHeight: '1.35', padding: `${pageW * 0.12}px ${pageW * 0.1}px` });
  const typeLines = [
    { text: 'INT. MAGNETIC TAPE ARCHIVE - NIGHT', style: { fontWeight: 700 }, a: B(18), b: B(19) - 0.05 },
    { text: 'Rows of steel shelves stretch into amber darkness. ELENA VANCE (34) threads a reel onto a Studer deck.', style: { marginTop: '1.2em' }, a: B(19), b: B(20) - 0.1 },
    { text: 'ELENA', style: { marginTop: '1.2em', paddingLeft: '37%' }, a: HB(19), b: B(20) - 0.05 },
    { text: '(into the recorder)', style: { paddingLeft: '27%' }, a: B(20) - 0.32, b: B(20) },
    { text: 'Reel forty-seven. No catalog card.', style: { paddingLeft: '17%', paddingRight: '25%' }, a: B(20) - 0.1, b: B(20) + 0.25 },
  ];
  const typeNodes = typeLines.map((ln) => {
    const n = el('div', '', page5, Object.assign({ whiteSpace: 'pre-wrap' }, ln.style));
    return { ...ln, node: n };
  });
  const caret5 = el('span', '', null, { display: 'inline-block', width: '2px', height: '1.05em', background: 'var(--signal)', verticalAlign: '-0.15em' });
  hooks.push((t) => {
    if (t < B(18) - 0.1 || t > B(21)) return;
    let caretHost = null;
    typeNodes.forEach((ln) => {
      const p = Math.max(0, Math.min(1, (t - ln.a) / (ln.b - ln.a)));
      const n = Math.round(p * ln.text.length);
      ln.node.textContent = ln.text.slice(0, n);
      if (p > 0 && p < 1) caretHost = ln.node;
      if (p > 0 && !caretHost) caretHost = ln.node;
    });
    const last = [...typeNodes].reverse().find((ln) => t >= ln.a);
    (last ? last.node : typeNodes[0].node).appendChild(caret5);
    caret5.style.opacity = Math.floor(t * 3.2) % 2 === 0 ? '1' : '0.15';
  });
  gsap.set(page5, { opacity: 0 });
  ft(B(18) - 0.05, page5, { opacity: 0, z: -1400, rotateX: 50, rotateY: -30, x: pick(-120, 0), y: pick(420, 420) }, { opacity: 1, z: 0, rotateX: 22, rotateY: pick(-16, -8), rotateZ: 2, x: pick(-120, 0), y: pick(420, 420), duration: 0.6, ease: 'expo.out' });
  to(B(18) + 0.6, page5, { rotateY: pick(-8, -2), rotateX: 10, z: 120, duration: B(20) - B(18) - 0.6, ease: 'none' });
  to(B(20) - 0.05, page5, { x: pick(-1700, 0), y: pick(60, -1900), rotateY: pick(-70, 0), rotateX: pick(10, 60), opacity: 0, duration: 0.3, ease: 'power3.in' });
  // Element bar (as in the app)
  const bar5 = el('div', 'center', s5, { display: 'flex', gap: '4px', padding: '8px', background: '#FFFFFF', borderRadius: '999px', boxShadow: '0 20px 50px -10px rgb(0 0 0 / 0.6)', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: `${pick(26, 24)}px`, color: '#3B3A38', whiteSpace: 'nowrap' });
  const barItems = ['Scene', 'Action', 'Character', 'Dialogue', '(Paren)', 'Transition'].map((t) => el('div', '', bar5, { padding: '10px 22px', borderRadius: '999px' }, t));
  gsap.set(bar5, { xPercent: -50, yPercent: -50, x: pick(420, 0), y: pick(400, 760), opacity: 0, scale: pick(1, 0.7) });
  if (V) gsap.set(bar5, { fontSize: '22px' });
  ft(B(19), bar5, { opacity: 0, y: pick(500, 840) }, { opacity: 1, y: pick(400, 760), duration: 0.45, ease: 'expo.out' });
  const activeSeq = [0, 1, 2, 4, 3, 5];
  activeSeq.forEach((idx, k) => {
    const tk = B(19) + k * ((B(20) - B(19)) / 3);
    barItems.forEach((it, j) => set(tk, it, { backgroundColor: j === idx ? '#111111' : 'rgba(0,0,0,0)', color: j === idx ? '#F6F2EA' : '#3B3A38' }));
    ft(tk, barItems[idx], { scale: 1.12 }, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
  });
  to(B(20) - 0.05, bar5, { opacity: 0, y: '+=120', duration: 0.25, ease: 'power3.in' });

  // Guide → dual → title page, with camera pushes into each
  const spw = pick(1180, 900);
  const sph = pick(spw / 1.6, 1250);
  const spBase = pick({ x: 330, y: 20 }, { x: 0, y: 250 });
  const caption5 = (text, t, out) => {
    const c = label(s5, 'punch', text, pick(92, 92), pick(-680, 0), pick(-20, -600), { color: '#F6F2EA', whiteSpace: V ? 'nowrap' : 'normal', width: V ? 'auto' : '470px', textAlign: V ? 'center' : 'left', lineHeight: '0.98' });
    gsap.set(c, { opacity: 0 });
    ft(t, c, { opacity: 0, x: pick(-720, 0), filter: 'blur(10px)' }, { opacity: 1, x: pick(-680, 0), filter: 'blur(0px)', duration: 0.4, ease: 'expo.out' });
    to(out - 0.1, c, { opacity: 0, filter: 'blur(8px)', duration: 0.18, ease: 'power2.in' });
    return c;
  };
  const guide5 = frame(cam5, 'sp-guide.png', spw, sph);
  gsap.set(guide5, { opacity: 0 });
  ft(B(20), guide5, { opacity: 0, x: spBase.x + pick(1200, 0), y: spBase.y + pick(0, 1200), z: -1800, rotateY: pick(50, 0), rotateX: pick(0, -30) }, { opacity: 1, x: spBase.x, y: spBase.y, z: 0, rotateY: pick(-12, 0), rotateX: pick(6, 8), duration: 0.6, ease: 'expo.out' });
  const g0 = V ? focus(guide5, 790, 0, 640, 900) : { scale: 1, x: 0, y: 0 };
  gsap.set(guide5.img, g0);
  const gF1 = V ? focus(guide5, 1000, 40, 430, 600) : focus(guide5, 1000, 50, 440, 470);
  ft(B(21), guide5.img, g0, { ...gF1, duration: 0.6, ease: 'expo.inOut' });
  const gF2 = V ? focus(guide5, 1000, 290, 430, 600) : focus(guide5, 1000, 260, 440, 420);
  to(B(22), guide5.img, { ...gF2, duration: B(23) - B(22), ease: 'sine.inOut' });
  caption5('Every element<span class="dot">.</span>', B(21), B(22));
  caption5('Every shortcut<span class="dot">.</span>', B(22), B(23));
  // Keycaps
  const keys5 = el('div', 'center', s5, { display: 'flex', gap: '18px' });
  gsap.set(keys5, { xPercent: -50, yPercent: -50, x: pick(-680, 0), y: pick(0, -600) });
  const keyEls = ['⌘', '⌥', '/'].map((k) => el('div', '', keys5, { width: `${pick(118, 112)}px`, height: `${pick(118, 112)}px`, borderRadius: '24px', background: '#F6F2EA', color: '#111', display: 'grid', placeItems: 'center', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: `${pick(52, 50)}px`, boxShadow: '0 8px 0 #BDB6A8, 0 18px 40px -10px rgb(0 0 0 / 0.6)' }, k));
  gsap.set(keys5, { opacity: 0 });
  set(B(23), keys5, { opacity: 1 });
  keyEls.forEach((k, i) => ft(B(23) + i * 0.1, k, { y: -60, scale: 0.4, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.4)' }));
  to(B(24) - 0.12, keys5, { opacity: 0, duration: 0.15 });
  to(B(24) - 0.08, guide5, { opacity: 0, z: -900, rotateY: pick(30, 0), duration: 0.25, ease: 'power3.in' });

  const dual5 = frame(cam5, 'sp-dual.png', spw, sph);
  gsap.set(dual5, { opacity: 0 });
  ft(B(24), dual5, { opacity: 0, z: 900, rotateY: pick(-25, 0), x: spBase.x, y: spBase.y }, { opacity: 1, z: 0, rotateY: pick(-10, 0), rotateX: 6, duration: 0.5, ease: 'expo.out' });
  const d0 = V ? focus(dual5, 380, 0, 640, 900) : { scale: 1, x: 0, y: 0 };
  gsap.set(dual5.img, d0);
  ft(B(24) + 0.15, dual5.img, d0, { ...(V ? focus(dual5, 430, 200, 520, 700) : focus(dual5, 430, 500, 600, 260)), duration: 0.9, ease: 'expo.inOut' });
  caption5('Dual dialogue<span class="dot">.</span>', B(24), B(26));
  to(B(26) - 0.08, dual5, { opacity: 0, x: spBase.x - pick(1500, 0), y: spBase.y - pick(0, 1500), rotateY: pick(-50, 0), duration: 0.28, ease: 'power3.in' });

  const tp5 = frame(cam5, 'sp-titlepage.png', spw, sph);
  gsap.set(tp5, { opacity: 0 });
  ft(B(26), tp5, { opacity: 0, x: spBase.x + pick(1500, 0), y: spBase.y + pick(0, 1500), rotateY: pick(45, 0), z: -600 }, { opacity: 1, x: spBase.x, y: spBase.y, rotateY: pick(-12, 0), rotateX: 6, z: 0, duration: 0.5, ease: 'expo.out' });
  const t0 = V ? focus(tp5, 540, 0, 640, 900) : { scale: 1, x: 0, y: 0 };
  gsap.set(tp5.img, t0);
  ft(B(26) + 0.2, tp5.img, t0, { ...(V ? focus(tp5, 830, 140, 340, 470) : focus(tp5, 280, 70, 900, 560)), duration: 0.8, ease: 'expo.inOut' });
  caption5('Title pages<span class="dot">.</span>', B(26), B(28));
  to(B(28) - 0.08, tp5, { opacity: 0, z: -1200, rotateX: 40, duration: 0.28, ease: 'power3.in' });

  // Exported pages fan out like a deck
  const deckW = pick(470, 520);
  const deck = ['page-title.png', 'page-1.png', 'page-2.png'].map((src) => {
    const d = el('div', 'p3d', cam5, { width: `${deckW}px`, height: `${deckW * 11 / 8.5}px`, left: `${-deckW / 2}px`, top: `${-(deckW * 11 / 8.5) / 2}px`, borderRadius: '4px', overflow: 'hidden', boxShadow: '0 30px 70px -18px rgb(0 0 0 / 0.75)', background: '#fff' });
    const im = el('img', '', d, { width: '100%', height: '100%', display: 'block' });
    im.src = SHOTS + src;
    gsap.set(d, { opacity: 0 });
    return d;
  });
  const deckPos = pick(
    [{ x: -520, ry: 28, rz: -6, z: -160 }, { x: 0, ry: 0, rz: 0, z: 60 }, { x: 520, ry: -28, rz: 6, z: -160 }],
    [{ y: -420, x: -120, ry: 0, rz: -8, z: -200 }, { y: 0, x: 0, ry: 0, rz: 0, z: 0 }, { y: 420, x: 120, ry: 0, rz: 8, z: -200 }]
  );
  deck.forEach((d, i) => {
    const t = B(28) + i * (B(29) - B(28)) * 0.5;
    ft(t, d, { opacity: 0, x: 0, y: pick(900, 1400), z: -400, rotateX: 60, rotateY: 0, rotateZ: 0 }, { opacity: 1, x: deckPos[i].x, y: deckPos[i].y || 0, z: deckPos[i].z, rotateX: pick(8, 18), rotateY: deckPos[i].ry, rotateZ: deckPos[i].rz, duration: 0.55, ease: 'expo.out' });
    to(B(31), d, { rotateY: deckPos[i].ry - 160, z: -1600, opacity: 0, duration: B(32) - B(31), ease: 'power3.in' });
  });
  const tags5 = ["(MORE)", "(CONT'D)", 'Scene numbers', 'Revision marks'];
  tags5.forEach((tag, i) => {
    const t = B(29) + i * (B(31) - B(29)) / 4;
    const tn = i < tags5.length - 1 ? B(29) + (i + 1) * (B(31) - B(29)) / 4 : B(31) + 0.2;
    const n = label(s5, 'mono', tag, pick(44, 40), 0, pick(440, 800), { color: '#F6F2EA', whiteSpace: 'nowrap', background: 'rgb(255 75 54 / 0.95)', padding: '14px 28px', borderRadius: '999px', letterSpacing: '0.14em' });
    gsap.set(n, { opacity: 0 });
    ft(t, n, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2.5)' });
    to(tn - 0.04, n, { opacity: 0, duration: 0.06 });
  });
  const deckCap = label(s5, 'serif', 'Industry-standard pages.', pick(76, 64), 0, pick(-430, -820), { color: '#F6F2EA', whiteSpace: 'nowrap' });
  gsap.set(deckCap, { opacity: 0 });
  ft(B(28), deckCap, { opacity: 0, y: pick(-390, -780) }, { opacity: 1, y: pick(-430, -820), duration: 0.5, ease: 'expo.out' });
  to(B(31) + 0.1, deckCap, { opacity: 0, duration: 0.3 });
  flashAt(B(32) - 0.02, '#ffffff', 0.85, 0.35);

  // ======================================================== S6 · Novels / folders / Gantt / themes
  const s6 = scene('structure', '#F6F2EA');
  show(s6, B(32) - 0.02, B(48) + 0.05);
  set(B(32), bg, { backgroundColor: '#F6F2EA' });
  const kinds = [
    { word: 'Novels', color: '#F6DD8B', t: B(32) },
    { word: 'Scripts', color: '#C8C7FB', t: B(33) },
    { word: 'Essays', color: '#BDD3F4', t: B(34) },
  ];
  const kindBg = el('div', 'layer', s6);
  kinds.forEach((k, i) => {
    set(k.t, kindBg, { backgroundColor: k.color, opacity: 1 });
    const w = label(s6, 'punch', `${k.word}<span class="dot">.</span>`, pick(300, 210), 0, 0, { color: '#111' });
    gsap.set(w, { opacity: 0 });
    ft(k.t, w, { opacity: 0, scale: 1.45, filter: 'blur(14px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.35, ease: 'expo.out' });
    to((kinds[i + 1] ? kinds[i + 1].t : B(35)) - 0.03, w, { opacity: 0, duration: 0.05 });
  });
  shake(B(34), 18);
  flashAt(B(34), '#ffffff', 0.5, 0.3);
  set(B(35), kindBg, { opacity: 0 });
  const cam6 = persp(s6, 1600);
  const fw6 = pick(1560, 1020);
  const folders6 = frame(cam6, 'cabinet.png', fw6, fw6 * (270 / 1000));
  gsap.set(folders6, { opacity: 0 });
  gsap.set(folders6.img, focus(folders6, 220, 255, 1000, 270));
  ft(B(35), folders6, { opacity: 0, y: 700, rotateX: 70, z: -300 }, { opacity: 1, y: pick(60, 40), rotateX: 14, z: 0, duration: 0.6, ease: 'back.out(1.4)' });
  to(B(35) + 0.6, folders6, { rotateX: 6, z: 80, duration: B(36) - B(35) - 0.6, ease: 'none' });
  to(B(36) - 0.06, folders6, { opacity: 0, y: -600, rotateX: -40, duration: 0.25, ease: 'power3.in' });
  const fCap = label(s6, 'serif', 'All your work. One cabinet.', pick(78, 64), 0, pick(-250, -330), { color: '#111', whiteSpace: 'nowrap' });
  gsap.set(fCap, { opacity: 0 });
  ft(B(35), fCap, { opacity: 0, y: pick(-210, -290) }, { opacity: 1, y: pick(-250, -330), duration: 0.45, ease: 'expo.out' });
  to(B(36) - 0.08, fCap, { opacity: 0, duration: 0.15 });

  // Gantt timeline recreated, bars stamping on the beat
  const gW = pick(1560, 1000);
  const gH = pick(780, 1240);
  const gantt = el('div', 'p3d', cam6, { width: `${gW}px`, height: `${gH}px`, left: `${-gW / 2}px`, top: `${-gH / 2}px`, background: '#FBF9F4', borderRadius: '22px', boxShadow: '0 0 0 1px rgb(17 17 17 / 0.06), 0 40px 90px -30px rgb(17 17 17 / 0.45)', padding: pick('48px 60px', '48px 44px'), fontFamily: 'Plus Jakarta Sans' });
  const gHead = el('div', '', gantt, { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid rgb(17 17 17 / 0.15)', paddingBottom: '18px' });
  gHead.innerHTML = `<div><div style="font-size:${pick(22, 22)}px;color:#77736B">Narrative arc</div><div style="font-size:${pick(52, 50)}px;font-weight:600;letter-spacing:-0.03em;color:#111">Timeline</div></div><div style="font-size:${pick(52, 50)}px;font-weight:700;letter-spacing:-0.03em;color:#111">06/</div>`;
  const gBody = el('div', '', gantt, { position: 'relative', height: `${gH - pick(220, 220)}px`, marginTop: '28px' });
  const titles = ['Before the Lighthouse Fell', 'The Glass Harbor', 'Letters to the Meridian', 'A Bell Under Water', 'The Seventh Sounding', 'Spring Equinoctial'];
  const labels6 = ['Prologue', 'Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Epilogue'];
  const colW = (gW - pick(120, 88)) / 6;
  const barH = pick(80, 120);
  const rowGap = pick(16, 22);
  for (let c = 0; c <= 6; c += 1) el('div', '', gBody, { position: 'absolute', top: 0, bottom: 0, left: `${c * colW}px`, borderLeft: '2px dashed rgb(17 17 17 / 0.14)' });
  const ganttBars = titles.map((tt, i) => {
    const b = el('div', '', gBody, { position: 'absolute', left: `${i * colW + 4}px`, width: `${colW - 8}px`, top: `${i * (barH + rowGap)}px`, height: `${barH}px`, background: '#111', color: '#F6F2EA', borderRadius: '18px', padding: pick('0 20px', '0 16px'), display: 'flex', alignItems: 'center', gap: '10px', fontSize: `${pick(22, 24)}px`, fontWeight: 600, lineHeight: 1.1, transformOrigin: '0% 50%' });
    b.innerHTML = `${i === 1 ? '<span style="width:12px;height:12px;border-radius:50%;background:#FF4B36;flex:none"></span>' : ''}<span>${tt}</span>`;
    gsap.set(b, { scaleX: 0, opacity: 0 });
    return b;
  });
  const gLabels = el('div', '', gBody, { position: 'absolute', left: 0, right: 0, top: `${6 * (barH + rowGap) + 30}px`, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', textAlign: 'center', fontSize: `${pick(20, 20)}px`, color: '#77736B' });
  labels6.forEach((l, i) => el('div', '', gLabels, { color: i === 1 ? '#111' : '#77736B', fontWeight: i === 1 ? 600 : 500 }, l));
  gsap.set(gLabels, { opacity: 0 });
  gsap.set(gantt, { opacity: 0 });
  ft(B(36), gantt, { opacity: 0, z: -1200, rotateX: 40, y: pick(80, 60) }, { opacity: 1, z: 0, rotateX: pick(14, 10), rotateY: pick(-10, 0), y: pick(50, 60), duration: 0.6, ease: 'expo.out' });
  to(B(36) + 0.6, gantt, { rotateX: 6, rotateY: pick(-3, 0), z: 90, duration: B(40) - B(36) - 0.7, ease: 'none' });
  ganttBars.forEach((b, i) => {
    const t = B(36) + 0.18 + i * ((B(39) - B(36)) / 6);
    ft(t, b, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.32, ease: 'expo.out' });
    ft(t, b, { y: -16 }, { y: 0, duration: 0.4, ease: 'back.out(3)' });
  });
  ft(B(39), gLabels, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' });
  const gCap = label(s6, 'serif', 'See the whole story.', pick(72, 66), 0, pick(-470, -790), { color: '#111', whiteSpace: 'nowrap' });
  gsap.set(gCap, { opacity: 0 });
  ft(B(38), gCap, { opacity: 0, y: pick(-430, -750) }, { opacity: 1, y: pick(-470, -790), duration: 0.5, ease: 'expo.out' });
  to(B(40) - 0.1, [gantt, gCap], { opacity: 0, z: -800, duration: 0.25, ease: 'power3.in' });

  // Cards + cabinet stack
  const cw = pick(900, 900);
  const cardsF = frame(cam6, 'book-cards.png', cw, cw / 1.6);
  const stackF = frame(cam6, 'cabinet-stack.png', cw, cw / 1.6);
  gsap.set([cardsF, stackF], { opacity: 0 });
  ft(B(40), cardsF, { opacity: 0, x: pick(-1400, 0), y: pick(40, -1300), rotateY: pick(60, 0), z: -400 }, { opacity: 1, x: pick(-430, 0), y: pick(40, -300), rotateY: pick(24, 0), rotateX: pick(4, 14), z: 0, duration: 0.6, ease: 'expo.out' });
  ft(B(41), stackF, { opacity: 0, x: pick(1400, 0), y: pick(40, 1300), rotateY: pick(-60, 0), z: -400 }, { opacity: 1, x: pick(430, 0), y: pick(40, 330), rotateY: pick(-24, 0), rotateX: pick(4, -10), z: 0, duration: 0.6, ease: 'expo.out' });
  to(B(41) + 0.6, [cardsF, stackF], { z: 120, duration: B(44) - B(41) - 0.7, ease: 'none' });
  const tcc = ['Timeline', 'Cards', 'Cabinet'];
  tcc.forEach((word, i) => {
    const n = label(s6, 'punch', `${word}<span class="dot">.</span>`, pick(84, 84), pick(-420 + i * 420, 0), pick(-420, -820 + i * 0), { color: '#111' });
    gsap.set(n, { opacity: 0 });
    const t = B(40 + i);
    ft(t, n, { opacity: 0, y: pick(-380, -780) }, { opacity: 1, y: pick(-420, -820), duration: 0.35, ease: 'expo.out' });
    if (V) to(B(41 + i) - 0.06, n, { opacity: 0, duration: 0.06 });
    else to(B(44) - 0.1, n, { opacity: 0, duration: 0.15 });
    if (V && i === 2) to(B(44) - 0.1, n, { opacity: 0, duration: 0.15 });
  });
  to(B(44) - 0.1, [cardsF, stackF], { opacity: 0, z: -1000, duration: 0.28, ease: 'power3.in' });

  // Paper → night theme wipe
  const tw6 = pick(1500, 900);
  const th6 = pick(tw6 / 1.6, 1250);
  // Same chapter, same scroll: the wipe reads as one page changing theme
  const dayF = frame(cam6, 'book-editor.png', tw6, th6);
  const nightF = frame(cam6, 'night-editor.png', tw6, th6);
  if (V) [dayF, nightF].forEach((f) => gsap.set(f.img, focus(f, 410, 0, 640, 900)));
  gsap.set(nightF, { clipPath: 'inset(0 100% 0 0)' });
  const wipeLine = el('div', '', nightF, { position: 'absolute', top: 0, bottom: 0, width: '4px', left: '0', background: '#FF4B36', boxShadow: '0 0 30px 6px rgb(255 75 54 / 0.6)' });
  gsap.set([dayF, nightF], { opacity: 0 });
  [dayF, nightF].forEach((f) => ft(B(44), f, { opacity: 0, z: -1500, rotateX: 30, y: pick(110, 220) }, { opacity: 1, z: 0, rotateX: pick(8, 6), rotateY: pick(-6, 0), y: pick(110, 220), duration: 0.6, ease: 'expo.out' }));
  set(B(44), nightF, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
  ft(B(46) - 0.05, nightF, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: 'expo.inOut' });
  set(B(46) - 0.05, wipeLine, { opacity: 1 });
  ft(B(46) - 0.05, wipeLine, { left: '0px' }, { left: `${tw6}px`, duration: 0.55, ease: 'expo.inOut' });
  set(B(46) + 0.52, wipeLine, { opacity: 0 });
  to(B(44) + 0.6, [dayF, nightF], { z: 140, rotateY: pick(2, 0), duration: B(47) - B(44) - 0.6, ease: 'none' });
  const themeWords = [['Focus', B(44)], ['Flow', B(45)], ['Night', B(46)], ['Ready?', B(47)]];
  themeWords.forEach(([word, t], i) => {
    const isQ = word.endsWith('?');
    const n = label(s6, 'punch', isQ ? `Ready<span class="dot">?</span>` : `${word}<span class="dot">.</span>`, pick(104, 110), 0, pick(-468, -720), { color: i >= 2 ? '#F6F2EA' : '#111', textShadow: i >= 2 ? '0 6px 30px rgb(0 0 0 / 0.5)' : 'none' });
    gsap.set(n, { opacity: 0 });
    ft(t, n, { opacity: 0, scale: 1.3, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'expo.out' });
    to((themeWords[i + 1] ? themeWords[i + 1][1] : B(48)) - 0.05, n, { opacity: 0, duration: 0.05 });
  });
  const night6 = el('div', 'layer', s6, { background: 'radial-gradient(ellipse at 50% 45%, #22201E 0%, #141312 60%, #0B0B0B 100%)', opacity: 0 });
  s6.insertBefore(night6, s6.children[1]);
  ft(B(46) - 0.05, night6, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'expo.inOut' });
  to(B(47), [dayF, nightF], { scale: 0.6, rotateZ: -25, z: -1400, opacity: 0, duration: B(48) - B(47), ease: 'power3.in' });

  // ======================================================== S7 · Finale board → logo
  const s7 = scene('finale', 'radial-gradient(ellipse at 50% 45%, #FBF9F4 0%, #F1ECE2 70%, #E8E2D6 100%)');
  show(s7, B(48) - 0.02, 49.35);
  set(B(48), bg, { backgroundColor: '#F1ECE2' });
  const cam7 = persp(s7, 2200);
  const board = el('div', 'p3d', cam7);
  const bw = pick(560, 470);
  const bh = bw / 1.6;
  const gap7 = pick(64, 54);
  const boardShots = ['book-timeline.png', 'sp-guide.png', 'cabinet.png', 'sp-dual.png', 'book-editor.png', 'sp-export.png', 'night-editor.png', 'sp-titlepage.png', 'book-cards.png', 'new-modal.png', 'sp-timeline.png', 'cabinet-stack.png'];
  const bCols = pick(4, 3);
  const bRows = pick(3, 4);
  const boardTiles = [];
  for (let r = 0; r < bRows; r += 1) {
    for (let c = 0; c < bCols; c += 1) {
      const idx = r * bCols + c;
      const f = frame(board, boardShots[idx % boardShots.length], bw, bh);
      const x = (c - (bCols - 1) / 2) * (bw + gap7);
      const y = (r - (bRows - 1) / 2) * (bh + gap7);
      boardTiles.push({ f, x, y, idx });
      gsap.set(f, { opacity: 0 });
    }
  }
  gsap.set(board, { rotateX: 56, rotateZ: -34, z: -200 });
  const order = [...boardTiles].sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y));
  order.forEach((tile, k) => {
    const t = B(48) + (B(50) - B(48) - 0.42) * (k / (order.length - 1));
    const ang = (tile.idx * 137.5 * Math.PI) / 180;
    ft(t, tile.f, { opacity: 0, x: tile.x + Math.cos(ang) * 1400, y: tile.y + Math.sin(ang) * 1400, z: 1400, rotateZ: rr(-120, 120), rotateX: rr(-60, 60) }, { opacity: 1, x: tile.x, y: tile.y, z: 0, rotateZ: 0, rotateX: 0, duration: 0.42, ease: 'expo.out' });
  });
  ft(B(50), board, { scale: 1.06 }, { scale: 1, duration: 0.6, ease: 'expo.out' });
  flashAt(B(50), '#ffffff', 0.7, 0.45);
  shake(B(50), 20);
  const ring7 = el('div', 'center', s7, { width: '200px', height: '200px', borderRadius: '50%', border: '4px solid #FF4B36' });
  gsap.set(ring7, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
  ft(B(50), ring7, { scale: 0.2, opacity: 1 }, { scale: 14, opacity: 0, duration: 1.1, ease: 'expo.out' });
  to(B(50) + 0.6, board, { rotateZ: -26, rotateX: 50, z: 120, duration: B(56) - B(50) - 0.6, ease: 'sine.inOut' });
  // Tagline over a soft paper scrim
  const scrim7 = el('div', 'center', s7, { width: pick('1700px', '1000px'), height: pick('420px', '700px'), borderRadius: '50%', background: 'radial-gradient(ellipse, rgb(246 242 234 / 0.95) 30%, rgb(246 242 234 / 0) 70%)' });
  gsap.set(scrim7, { xPercent: -50, yPercent: -50, opacity: 0 });
  const tag7 = label(s7, 'serif', null, pick(118, 96), 0, 0, { color: '#111', whiteSpace: V ? 'normal' : 'nowrap', width: V ? '880px' : 'auto', lineHeight: '1.04' });
  const tagWords = words(tag7, 'Your story deserves a studio.');
  tagWords[4].innerHTML = 'studio<span class="dot">.</span>';
  gsap.set(tagWords, { opacity: 0 });
  ft(B(52) - 0.1, scrim7, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.out' });
  tagWords.forEach((w, i) => {
    const t = B(52) + i * ((B(54) - B(52)) / 4);
    ft(t, w, { y: 50, opacity: 0, filter: 'blur(12px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' });
  });
  to(B(55) + 0.1, [tag7, scrim7], { opacity: 0, filter: 'blur(10px)', duration: 0.4, ease: 'power2.in' });
  to(B(56) - 0.1, board, { rotateX: 82, z: -2600, opacity: 0, duration: 0.7, ease: 'power3.in' });

  // Second drop → ink flood → end card
  const drop7 = el('div', 'center', s7, { width: '52px', height: '72px' });
  drop7.innerHTML = dropSvg;
  gsap.set(drop7, { xPercent: -50, yPercent: -50, opacity: 0 });
  ft(B(56), drop7, { y: -H / 2 - 90, opacity: 1, scaleY: 1 }, { y: 0, scaleY: 1.3, duration: B(57) - B(56), ease: 'power2.in' });
  set(B(57), drop7, { opacity: 0 });
  const inkFlood = el('div', 'center', s7, { width: `${Math.hypot(W, H) * 1.15}px`, height: `${Math.hypot(W, H) * 1.15}px`, borderRadius: '50%', background: '#0B0B0B' });
  gsap.set(inkFlood, { xPercent: -50, yPercent: -50, scale: 0 });
  ft(B(57), inkFlood, { scale: 0 }, { scale: 1, duration: 0.7, ease: 'expo.out' });
  [0, 1].forEach((i) => {
    const r = el('div', 'center', s7, { width: '160px', height: '160px', borderRadius: '50%', border: '3px solid #FF4B36' });
    gsap.set(r, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
    ft(B(57) + i * 0.08, r, { scale: 0.1, opacity: 1 }, { scale: 10 + i * 4, opacity: 0, duration: 1.2, ease: 'expo.out' });
  });
  shake(B(57), 16);
  set(B(57) + 0.4, bg, { backgroundColor: '#0B0B0B' });

  const end = el('div', 'layer', s7);
  const endCam = persp(end, 1400);
  const endLogo = el('div', 'p3d', endCam, { display: 'flex', alignItems: 'center', gap: `${pick(26, 18)}px` });
  const endMark = el('div', '', endLogo, { width: `${pick(112, 82)}px`, height: `${pick(154, 112)}px`, flex: 'none' });
  endMark.innerHTML = dropSvg;
  const endWord = el('div', 'punch', endLogo, { fontSize: `${pick(224, 156)}px`, color: '#F6F2EA' });
  const endChars = chars(endWord, 'INKubator');
  gsap.set(endChars, { opacity: 0 });
  gsap.set(endLogo, { xPercent: -50, yPercent: -50, y: pick(-40, -60) });
  gsap.set(endMark, { scale: 0 });
  const endBy = label(end, 'mono', null, pick(30, 26), 0, pick(120, 80), { color: 'rgb(246 242 234 / 0.6)', whiteSpace: 'nowrap' });
  const endByChars = chars(endBy, 'by Pursion');
  gsap.set(endByChars, { opacity: 0 });
  const soon = label(end, 'mono', 'Coming soon', pick(34, 32), 0, pick(250, 220), { color: '#FFFFFF', background: '#FF4B36', padding: '18px 40px', borderRadius: '999px', letterSpacing: '0.3em', whiteSpace: 'nowrap', boxShadow: '0 0 60px 4px rgb(255 75 54 / 0.35)' });
  gsap.set([endLogo, endBy, soon], { opacity: 0 });
  set(B(57) + 0.05, endLogo, { opacity: 1 });
  ft(B(57) + 0.05, endChars, { y: 120, rotateX: -80, opacity: 0, filter: 'blur(10px)' }, { y: 0, rotateX: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out', stagger: 0.04 });
  ft(B(57) + 0.1, endMark, { scale: 0, rotate: -50 }, { scale: 1, rotate: 0, duration: 0.8, ease: 'back.out(2)' });
  set(B(58), endBy, { opacity: 1 });
  ft(B(58), endByChars, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.035 });
  ft(B(60), soon, { opacity: 0, scale: 0.55, y: pick(280, 250) }, { opacity: 1, scale: 1, y: pick(250, 220), duration: 0.6, ease: 'back.out(2.2)' });
  ft(B(60) + 0.6, soon, { boxShadow: '0 0 60px 4px rgb(255 75 54 / 0.35)' }, { boxShadow: '0 0 90px 14px rgb(255 75 54 / 0.5)', duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 });
  ft(B(57) + 0.6, endCam, { scale: 1 }, { scale: 1.06, duration: 49.3 - B(57) - 0.6, ease: 'sine.inOut' });
  to(49.12, end, { opacity: 0, duration: 0.22, ease: 'power2.in' });

  // ======================================================== Outro caret
  const s8 = scene('outro', '#0B0B0B');
  const caret8 = el('div', 'center', s8, { width: '7px', height: `${pick(120, 96)}px`, background: '#FF4B36' });
  gsap.set(caret8, { xPercent: -50, yPercent: -50, opacity: 0 });
  show(s8, 49.3, null);
  set(49.4, caret8, { opacity: 1 });
  set(49.62, caret8, { opacity: 0 });

  // Hold the timeline open to the end of the song
  set(window.DURATION, flash, { opacity: 0 });

  // ---------------------------------------------------------------- grain
  const grain = document.getElementById('grain');
  grain.width = Math.round(W / 3);
  grain.height = Math.round(H / 3);
  const gctx = grain.getContext('2d');
  const gimg = gctx.createImageData(grain.width, grain.height);
  const drawGrain = (frameNo) => {
    const g = mulberry32(frameNo * 7919 + 13);
    const d = gimg.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (g() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    gctx.putImageData(gimg, 0, 0);
  };

  // ---------------------------------------------------------------- render API
  window.renderFrame = (t, frameNo = Math.round(t * 60)) => {
    tl.seek(t, false);
    hooks.forEach((h) => h(t));
    drawGrain(frameNo);
    return true;
  };
  window.ready = (async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((res) => { im.onload = () => im.decode().then(res, res); im.onerror = res; }))));
    window.renderFrame(0, 0);
    return 'ready';
  })();
  window.TOTAL = window.DURATION;
})();

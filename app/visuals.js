/*
  Zedlab Blender Course: the animated picture for each lesson.

  - Each lesson's settings and caption live in content/visuals.js.
  - A small set of scene types is reused with different settings.
  - Only one picture moves at a time: the one most in view. The others show a still frame.
  - Pictures pause when off screen. With "reduce motion" switched on, every picture is a still.
  - If the device cannot show 3D, a flat still drawing is shown instead.
  - 3D uses three.js (vendor/three), loaded only when a picture first comes near the screen.
*/
(function () {
  "use strict";

  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const asset = (path) => new URL(path, SCRIPT_URL).href;
  const C = window.COURSE_CONTENT;
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Small helpers ---------- */

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const smooth = (x) => x * x * (3 - 2 * x);
  const ease = (p, a, b) => smooth(seg(p, a, b));
  const lerp = (a, b, k) => a + (b - a) * k;
  const backOut = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2));
  const pulse = (p, a, b) => (p >= a && p < b ? 1 : 0);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let tokenSource = null;
  const tok = (name) => getComputedStyle(tokenSource || document.documentElement).getPropertyValue(name).trim();

  function tokens() {
    return {
      bg: tok("--vis-bg"), grid: tok("--vis-grid"), axisX: tok("--vis-axis-x"), axisY: tok("--vis-axis-y"),
      accent: tok("--accent"), white: tok("--label-primary"), panel: tok("--surface-secondary"), panel2: tok("--surface-tertiary"),
      dark: tok("--surface-primary"), cloth: tok("--vis-cloth"), wood: tok("--vis-wood"),
      weeks: [1, 2, 3, 4, 5, 6].map((w) => tok("--week-" + w))
    };
  }

  /* Saved still images of every picture (img/pictures), used when a picture is not playing,
     on devices without 3D, and as mini pictures in the calendar. */
  const pad2 = (n) => String(n).padStart(2, "0");
  const stillUrl = (n) => asset(`../img/pictures/lesson-${pad2(n)}.jpg`);
  const thumbUrl = (n) => asset(`../img/pictures/lesson-${pad2(n)}-small.jpg`);

  function specFor(n) { return (C.visuals || []).find((v) => v.lesson === n) || null; }
  function lessonFor(n) { return n === 0 ? C.beforeYouStart : C.lessons[n - 1]; }

  /* Key chips, drawn exactly as the lessons write them (content/shortcuts.js). */
  function chipHtml(keys) {
    const sc = (C.shortcuts || []).find((s) => s.keys === keys);
    const type = sc ? sc.type : "key";
    const xyz = /^([A-Z]), ([A-Z]) or ([A-Z])$/.exec(keys);
    if (xyz) return `<kbd class="key">${xyz[1]}</kbd><span class="key-sep">,</span><kbd class="key">${xyz[2]}</kbd><span class="key-sep">or</span><kbd class="key">${xyz[3]}</kbd>`;
    if (type === "place") return `<span class="key key--place">${esc(keys)}</span>`;
    const parts = type === "menu" ? keys.split(", ") : keys.split(" + ");
    const sep = type === "menu" ? '<span class="key-sep">›</span>' : '<span class="key-sep">+</span>';
    return parts.map((k) => `<kbd class="key">${esc(k)}</kbd>`).join(sep);
  }

  /* ---------- The engine ---------- */

  const items = new Set();
  let active = null, raf = 0;
  let THREE = null, threeLoad = null, liveRenderer = null, stillRenderer = null, assetsLoad = null, ASSETS = null;
  let forceStill = false, forceFlat = false;
  const stillQueue = [];
  let stillBusy = false;

  const glSupported = (() => {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
  })();

  function loadThree() {
    if (!threeLoad) {
      threeLoad = import(asset("../vendor/three/three.module.min.js")).then((m) => { THREE = m; return m; })
        .catch(() => { THREE = null; return null; });
    }
    return threeLoad;
  }

  function makeRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.VSMShadowMap;
    r.domElement.className = "vis-canvas";
    return r;
  }

  const seeIO = "IntersectionObserver" in window ? new IntersectionObserver(onSee, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] }) : null;
  const nearIO = "IntersectionObserver" in window ? new IntersectionObserver(onNear, { rootMargin: "300px 0px" }) : null;

  function mount(container, lessonNumber, options) {
    const opts = options || {};
    const spec = specFor(lessonNumber);
    if (!spec || !container) return null;
    const lesson = lessonFor(lessonNumber);
    const week = lessonNumber === 0 ? 0 : lesson.week;
    const fig = document.createElement("figure");
    fig.className = "vis" + (opts.compact ? " vis--compact" : "");
    fig.style.setProperty("--wk", week ? `var(--week-${week})` : "var(--accent)");
    fig.innerHTML = `<div class="vis-stage" aria-hidden="true"><div class="vis-art"></div><div class="vis-overlay"></div>
        <div class="vis-keys">${spec.chips.map((c, i) => `<span class="vis-chip" data-i="${i}">${chipHtml(c.keys)}</span>`).join("")}</div></div>
      ${opts.caption === false ? "" : `<figcaption class="vis-caption">${esc(spec.caption)}</figcaption>`}`;
    if (opts.caption === false) fig.setAttribute("aria-label", spec.caption);
    container.appendChild(fig);
    const item = {
      fig, spec, lessonNumber, lesson, week,
      stage: fig.querySelector(".vis-stage"), art: fig.querySelector(".vis-art"), overlay: fig.querySelector(".vis-overlay"),
      chips: Array.from(fig.querySelectorAll(".vis-chip")),
      kind: FLAT[spec.scene] ? "flat" : "solid", ratio: 0, near: false, flat: null, live: null, stillDone: false, t0: 0
    };
    items.add(item);
    if (item.kind === "flat") {
      item.flat = FLAT[spec.scene](item.art, makeFlatCtx(item));
      showPoster(item);
    } else {
      showSavedStill(item);
    }
    if (seeIO) { seeIO.observe(fig); nearIO.observe(fig); } else { item.near = true; queueStill(item); }
    return item;
  }

  function unmount(item) {
    if (!item || !items.has(item)) return;
    if (active === item) deactivate();
    if (seeIO) { seeIO.unobserve(item.fig); nearIO.unobserve(item.fig); }
    items.delete(item);
    item.fig.remove();
  }

  function unmountAll(container) {
    Array.from(items).forEach((it) => { if (!container || container.contains(it.fig)) unmount(it); });
  }

  function setChips(item, p, still) {
    item.chips.forEach((el, i) => {
      const c = item.spec.chips[i];
      el.classList.toggle("is-on", !still && p >= c.from && p < c.to);
      el.classList.toggle("is-shown", !!still);
    });
  }

  function showPoster(item) {
    if (item.kind === "flat") item.flat.update(item.spec.poster, true);
    setChips(item, item.spec.poster, true);
  }

  /* The saved still image of a 3D picture. If it cannot load, a still is made live (with 3D),
     or a simple drawing in the week's colour is shown (without 3D). */
  function showSavedStill(item) {
    item.premade = true;
    item.stillDone = true;
    item.overlay.innerHTML = "";
    item.art.querySelectorAll(".vis-still, .vis-fallback").forEach((x) => x.remove());
    const img = new Image();
    img.alt = "";
    img.className = "vis-still";
    img.decoding = "async";
    img.onerror = () => {
      img.remove();
      item.premade = false;
      item.stillDone = false;
      if (glSupported && !forceFlat) queueStill(item); else showFallback(item);
    };
    img.src = stillUrl(item.lessonNumber);
    item.art.insertBefore(img, item.art.firstChild);
    setChips(item, item.spec.poster, true);
  }

  /* Last resort: a simple drawing in the week's colour. */
  function showFallback(item) {
    if (item.premade !== false) { showSavedStill(item); return; }
    item.art.innerHTML = `<div class="vis-fallback"><span class="vis-fallback-n">${item.lessonNumber}</span></div>`;
    item.overlay.innerHTML = "";
    item.stillDone = true;
    setChips(item, item.spec.poster, true);
  }

  function onNear(entries) {
    entries.forEach((e) => {
      const item = Array.from(items).find((it) => it.fig === e.target);
      if (!item) return;
      item.near = e.isIntersecting;
      if (item.near && item.kind === "solid" && !item.stillDone) queueStill(item);
    });
  }

  function onSee(entries) {
    entries.forEach((e) => {
      const item = Array.from(items).find((it) => it.fig === e.target);
      if (item) item.ratio = e.isIntersecting ? e.intersectionRatio : 0;
    });
    chooseActive();
  }

  function chooseActive() {
    let best = null;
    if (!forceStill && !reduceMQ.matches && !document.hidden) {
      items.forEach((it) => {
        if (it.ratio >= 0.3 && (!best || it.ratio > best.ratio)) best = it;
      });
      if (best && best.kind === "solid" && (!glSupported || forceFlat)) best = null;
    }
    if (best === active) return;
    deactivate();
    if (best) activate(best);
  }

  async function activate(item) {
    active = item;
    item.t0 = performance.now() - item.spec.poster * item.spec.seconds * 1000;
    if (item.kind === "solid") {
      const ok = await ensureThree();
      if (active !== item) return;
      if (!ok) { showFallback(item); active = null; return; }
      if (!liveRenderer) liveRenderer = makeRenderer();
      item.live = buildSolid(item, liveRenderer);
      item.art.appendChild(liveRenderer.domElement);
    }
    item.fig.classList.add("is-playing");
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function deactivate() {
    const item = active;
    active = null;
    cancelAnimationFrame(raf);
    if (!item) return;
    item.fig.classList.remove("is-playing");
    if (item.kind === "solid") {
      if (item.live) { disposeScene(item.live); item.live = null; }
      if (liveRenderer && liveRenderer.domElement.parentNode === item.art) item.art.removeChild(liveRenderer.domElement);
      if (item.premade) item.overlay.innerHTML = "";
      else applyOverlayPoster(item);
      if (item.stillDone) setChips(item, item.spec.poster, true); else queueStill(item);
    } else {
      showPoster(item);
    }
  }

  function frame(now) {
    const item = active;
    if (!item) return;
    const p = (((now - item.t0) / 1000) / item.spec.seconds) % 1;
    if (item.kind === "flat") {
      item.flat.update(p, false);
    } else if (item.live) {
      sizeRenderer(liveRenderer, item);
      item.live.update(p);
      liveRenderer.render(item.live.scene, item.live.camera);
    }
    setChips(item, p, false);
    raf = requestAnimationFrame(frame);
  }

  function sizeRenderer(r, item) {
    const w = Math.max(1, Math.round(item.stage.clientWidth)), h = Math.max(1, Math.round(item.stage.clientHeight));
    const size = r.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) r.setSize(w, h, false);
    if (item.live) item.live.resize(w, h);
  }

  /* Still frames for 3D pictures, made one at a time with a second, hidden renderer. */
  function queueStill(item) {
    if (item.kind !== "solid" || item.premade || item.stillDone || stillQueue.includes(item)) return;
    if (!glSupported || forceFlat) { showFallback(item); return; }
    stillQueue.push(item);
    runStills();
  }

  async function runStills() {
    if (stillBusy) return;
    stillBusy = true;
    const ok = await ensureThree();
    while (stillQueue.length) {
      const item = stillQueue.shift();
      if (!items.has(item) || item.stillDone || item === active) continue;
      if (!ok) { showFallback(item); continue; }
      const w = Math.round(item.stage.clientWidth), h = Math.round(item.stage.clientHeight);
      if (!w || !h) { item.stillDone = false; continue; }
      if (!stillRenderer) stillRenderer = makeRenderer();
      stillRenderer.setSize(w, h, false);
      const live = buildSolid(item, stillRenderer);
      live.resize(w, h);
      live.update(item.spec.poster);
      stillRenderer.render(live.scene, live.camera);
      const url = stillRenderer.domElement.toDataURL("image/jpeg", 0.88);
      const img = new Image();
      img.alt = "";
      img.className = "vis-still";
      img.src = url;
      item.posterOverlay = item.overlay.innerHTML;
      disposeScene(live);
      item.art.querySelectorAll(".vis-still").forEach((x) => x.remove());
      item.art.insertBefore(img, item.art.firstChild);
      item.stillDone = true;
      if (active !== item) setChips(item, item.spec.poster, true);
      await new Promise((res) => setTimeout(res, 16));
    }
    stillBusy = false;
  }

  function applyOverlayPoster(item) {
    if (item.posterOverlay != null) item.overlay.innerHTML = item.posterOverlay;
  }

  async function ensureThree() {
    if (!glSupported || forceFlat) return false;
    const m = await loadThree();
    if (!m) return false;
    if (!assetsLoad) assetsLoad = loadAssets();
    await assetsLoad;
    return true;
  }

  /* The print: the Zedlab octopus and wordmark, coloured in the app (the original files are not changed). */
  function svgToCanvas(url, colour, size, aspect) {
    return fetch(url).then((r) => r.text()).then((text) => new Promise((resolve) => {
      const coloured = text.replace(/<svg\b/, `<svg fill="${colour}"`);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = size; c.height = Math.round(size / aspect);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = () => resolve(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(coloured);
    })).catch(() => null);
  }

  function loadAssets() {
    const white = tok("--paper") || "white", dark = tok("--ink") || "black";
    return Promise.all([
      svgToCanvas(asset("../Zedlab_octopus_logo.svg"), white, 512, 1),
      svgToCanvas(asset("../Zedlab_logo.svg"), white, 1024, 1688 / 445),
      svgToCanvas(asset("../Zedlab_octopus_logo.svg"), dark, 512, 1)
    ]).then(([octo, word, octoDark]) => { ASSETS = { octo, word, octoDark }; });
  }

  function disposeScene(live) {
    if (live.dispose) live.dispose();
    live.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => {
        Object.keys(m).forEach((k) => { if (m[k] && m[k].isTexture) m[k].dispose(); });
        m.dispose();
      });
    });
    if (live.envTarget) live.envTarget.dispose();
  }

  function frameActiveCheck() { chooseActive(); }
  document.addEventListener("visibilitychange", frameActiveCheck);
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", frameActiveCheck);

  /* ---------- 3D: shared pieces ---------- */

  function buildSolid(item, renderer) {
    tokenSource = item.stage;
    const T = THREE, t = tokens();
    tokenSource = null;
    const scene = new T.Scene();
    scene.background = new T.Color(t.bg);
    scene.fog = new T.Fog(new T.Color(t.bg), 11, 22);
    const camera = new T.PerspectiveCamera(32, 16 / 9, 0.05, 80);
    camera.position.set(5.2, 3.6, 6.4);
    camera.lookAt(0, 0.7, 0);
    const wk = new T.Color(item.week ? t.weeks[item.week - 1] : t.accent);
    item.overlay.innerHTML = "";
    const ctx = { T, scene, camera, renderer, t, wk, item, overlay: item.overlay, mode: item.spec.mode, lesson: item.lesson };
    ctx.h = helpers(ctx);
    const scenePart = SOLID[item.spec.scene](ctx);
    const live = {
      scene,
      get camera() { return ctx.activeCamera || camera; },
      update: (p) => scenePart.update(p),
      resize: (w, h) => {
        camera.aspect = w / h; camera.updateProjectionMatrix();
        if (ctx.ortho) { const hh = ctx.orthoHalf || 1.8; ctx.ortho.left = -hh * w / h; ctx.ortho.right = hh * w / h; ctx.ortho.top = hh; ctx.ortho.bottom = -hh; ctx.ortho.updateProjectionMatrix(); }
        ctx.aspect = w / h;
      },
      dispose: scenePart.dispose,
      envTarget: ctx.envTarget
    };
    return live;
  }

  function helpers(ctx) {
    const T = ctx.T, t = ctx.t;
    const col = (v) => new T.Color(v);
    const std = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.62, metalness: 0, flatShading: true }, o || {}));

    function lights(intensity) {
      const k = intensity == null ? 1 : intensity;
      const hemi = new T.HemisphereLight(0xffffff, col(t.dark), 1.1 * k);
      const sun = new T.DirectionalLight(0xffffff, 2.2 * k);
      sun.position.set(4, 7, 5);
      ctx.scene.add(hemi, sun);
      return { hemi, sun };
    }

    function grid(size, step) {
      const S = size || 14, st = step || 0.5, n = S / st, pts = [];
      for (let i = -n / 2; i <= n / 2; i++) {
        if (i === 0) continue;
        const v = i * st;
        pts.push(-S / 2, 0, v, S / 2, 0, v, v, 0, -S / 2, v, 0, S / 2);
      }
      const g = new T.Group();
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
      g.add(new T.LineSegments(geo, new T.LineBasicMaterial({ color: col(t.grid) })));
      const axis = (c, a, b) => g.add(new T.Line(new T.BufferGeometry().setFromPoints([a, b]), new T.LineBasicMaterial({ color: col(c) })));
      axis(t.axisX, new T.Vector3(-S / 2, 0.002, 0), new T.Vector3(S / 2, 0.002, 0));
      axis(t.axisY, new T.Vector3(0, 0.002, -S / 2), new T.Vector3(0, 0.002, S / 2));
      ctx.scene.add(g);
      return g;
    }

    function outline(mesh, scale) {
      const o = new T.Mesh(mesh.geometry, new T.MeshBasicMaterial({ color: col(t.accent), side: T.BackSide }));
      o.scale.setScalar(scale || 1.06);
      mesh.add(o);
      return o;
    }

    function shirtShape(smoothShape, half) {
      const s = new T.Shape();
      if (half) {
        s.moveTo(0, -1); s.lineTo(0.74, -1); s.lineTo(0.74, 0.46); s.lineTo(1.04, 0.22); s.lineTo(1.3, 0.5);
        s.lineTo(0.82, 0.94); s.lineTo(0.36, 1.0); s.lineTo(0, 0.76); s.closePath();
        return s;
      }
      s.moveTo(0, -1); s.lineTo(0.74, -1); s.lineTo(0.74, 0.46); s.lineTo(1.04, 0.22); s.lineTo(1.3, 0.5);
      s.lineTo(0.82, 0.94); s.lineTo(0.36, 1.0);
      if (smoothShape) { s.quadraticCurveTo(0.22, 0.74, 0, 0.74); s.quadraticCurveTo(-0.22, 0.74, -0.36, 1.0); }
      else { s.lineTo(0, 0.76); s.lineTo(-0.36, 1.0); }
      s.lineTo(-0.82, 0.94); s.lineTo(-1.3, 0.5); s.lineTo(-1.04, 0.22); s.lineTo(-0.74, 0.46); s.lineTo(-0.74, -1); s.closePath();
      return s;
    }

    function shirtGeometry(smoothShape, half) {
      const g = new T.ExtrudeGeometry(shirtShape(smoothShape, half), smoothShape
        ? { depth: 0.24, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 4, curveSegments: 16 }
        : { depth: 0.3, bevelEnabled: false, curveSegments: 2 });
      g.translate(0, 0, smoothShape ? -0.12 : -0.15);
      return g;
    }

    function shirt(color, smoothShape) {
      return new T.Mesh(shirtGeometry(smoothShape, false), std(color, { flatShading: !smoothShape, roughness: 0.82 }));
    }

    const SHIRT_FRONT = 0.215;

    function cap(color, smoothShape) {
      const g = new T.Group();
      const m = std(color, { flatShading: !smoothShape, roughness: 0.82, side: T.DoubleSide });
      const crown = new T.Mesh(new T.SphereGeometry(0.62, smoothShape ? 32 : 14, smoothShape ? 16 : 7, 0, Math.PI * 2, 0, Math.PI / 2), m);
      const brim = new T.Mesh(new T.CylinderGeometry(0.66, 0.66, 0.05, smoothShape ? 32 : 14, 1, false, -Math.PI / 2, Math.PI), std(color, { flatShading: !smoothShape, roughness: 0.82 }));
      brim.scale.set(1, 1, 1.3);
      brim.position.set(0, 0.02, 0.16);
      brim.rotation.x = 0.1;
      const inner = new T.Mesh(new T.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(col(color).multiplyScalar(0.45), { side: T.BackSide, roughness: 0.95 }));
      const rim = new T.Mesh(new T.RingGeometry(0.6, 0.62, 32), std(col(color).multiplyScalar(0.7), { side: T.DoubleSide }));
      rim.rotation.x = -Math.PI / 2;
      const button = new T.Mesh(new T.SphereGeometry(0.06, 10, 6), m);
      button.position.y = 0.62;
      g.add(crown, brim, inner, rim, button);
      return { group: g, crown, brim, inner, rim, button, material: m };
    }

    function podiumGeometry(round) {
      const R = 1.35, H = 0.36, c = Math.max(0.002, 0.14 * round), n = round > 0.02 ? 7 : 1;
      const pts = [new T.Vector2(0, 0), new T.Vector2(R - c, 0)];
      const arc = (cx, cy, a0, a1) => { for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new T.Vector2(cx + c * Math.cos(a), cy + c * Math.sin(a))); } };
      arc(R - c, c, -Math.PI / 2, 0);
      pts.push(new T.Vector2(R, H - c));
      arc(R - c, H - c, 0, Math.PI / 2);
      pts.push(new T.Vector2(0, H));
      return new T.LatheGeometry(pts, 56);
    }

    function podium(color, round) {
      return new T.Mesh(podiumGeometry(round == null ? 1 : round), std(color || col(t.panel2).multiplyScalar(1.6), { flatShading: false, roughness: 0.7 }));
    }

    function cameraProp(color) {
      const w = 0.32, h = 0.2, d = 0.5;
      const v = [0, 0, 0, -w, -h, d, 0, 0, 0, w, -h, d, 0, 0, 0, w, h, d, 0, 0, 0, -w, h, d,
        -w, -h, d, w, -h, d, w, -h, d, w, h, d, w, h, d, -w, h, d, -w, h, d, -w, -h, d,
        -w * 0.5, h + 0.04, d, w * 0.5, h + 0.04, d, w * 0.5, h + 0.04, d, 0, h + 0.2, d, 0, h + 0.2, d, -w * 0.5, h + 0.04, d];
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
      return new T.LineSegments(geo, new T.LineBasicMaterial({ color: col(color || t.white) }));
    }

    function printTexture(which) {
      const src = ASSETS && ASSETS[which];
      if (!src) return null;
      const tex = new T.CanvasTexture(src);
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    }

    function printPlane(which, w, h) {
      const tex = printTexture(which);
      const mat = new T.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.85, side: T.DoubleSide, color: 0xffffff });
      if (!tex) { mat.transparent = false; mat.color = col(t.white); }
      return new T.Mesh(new T.PlaneGeometry(w, h || w), mat);
    }

    function envMap() {
      const envScene = new T.Scene();
      envScene.background = col(t.dark);
      const box = new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: col(t.panel), side: T.BackSide }));
      envScene.add(box);
      const panel = (x, y, z, s) => { const m = new T.Mesh(new T.PlaneGeometry(s, s), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
      panel(-3.5, 3, 2, 2.6); panel(3.8, 2, -1, 1.8); panel(0, 4.6, 0, 3);
      const pm = new T.PMREMGenerator(ctx.renderer);
      const target = pm.fromScene(envScene, 0.04);
      pm.dispose();
      box.geometry.dispose(); box.material.dispose();
      envScene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      ctx.envTarget = target;
      ctx.scene.environment = target.texture;
      ctx.scene.environmentIntensity = 0.55;
      return target.texture;
    }

    function weaveTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      g.fillStyle = "#808080"; g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) {
        const up = ((x + y) / 4) % 2 === 0;
        g.fillStyle = up ? "#a8a8a8" : "#585858";
        g.fillRect(x, y, 4, 2);
        g.fillStyle = up ? "#585858" : "#a8a8a8";
        g.fillRect(x, y + 2, 4, 2);
      }
      const tex = new T.CanvasTexture(c);
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(3.5, 3.5);
      return tex;
    }

    function overlay(html) { ctx.overlay.insertAdjacentHTML("beforeend", html); return ctx.overlay.lastElementChild; }

    function orbit(cam, angle, radius, height, target) {
      cam.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
      cam.lookAt(target || new T.Vector3(0, 0.7, 0));
    }

    return { col, std, lights, grid, outline, shirt, shirtGeometry, SHIRT_FRONT, cap, podium, podiumGeometry, cameraProp, printPlane, printTexture, envMap, weaveTexture, overlay, orbit };
  }

  /* ---------- 3D scene types ---------- */

  const SOLID = {

    /* Lesson 2: your view moves, not the object. */
    orbit(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const cube = new T.Mesh(new T.BoxGeometry(1.1, 1.1, 1.1), h.std(ctx.wk));
      cube.position.y = 0.55;
      scene.add(cube);
      ctx.ortho = new T.OrthographicCamera(-3, 3, 1.8, -1.8, 0.1, 60);
      ctx.orthoHalf = 1.6;
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      return {
        update(p) {
          let text = "";
          if (p < 0.33 || p >= 0.93) {
            ctx.activeCamera = camera;
            const a = 0.7 + (p < 0.33 ? p / 0.33 : (p - 0.93) / 0.07 * 0.05) * Math.PI * 1.2;
            h.orbit(camera, p >= 0.93 ? 0.7 : a, 7.4, 3.6, new T.Vector3(0, 0.5, 0));
          } else {
            ctx.activeCamera = ctx.ortho;
            const o = ctx.ortho;
            o.up.set(0, 1, 0);
            if (p < 0.53) { o.position.set(0, 0.55, 12); text = "Front Orthographic"; }
            else if (p < 0.73) o.position.set(12, 0.55, 0);
            else { o.position.set(0, 12, 0); o.up.set(0, 0, -1); }
            o.lookAt(0, 0.55, 0);
          }
          label.textContent = text;
          label.hidden = !text;
        }
      };
    },

    /* Lesson 3: select, move, rotate, scale. */
    transform(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const mk = () => { const m = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 0.7), h.std(ctx.wk)); m.position.y = 0.35; scene.add(m); return m; };
      const a = mk(), b = mk(), c = mk();
      b.position.x = 0; c.position.x = 2;
      const oa = h.outline(a), ob = h.outline(b), oc = h.outline(c);
      const axis = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-6, 0.35, 0), new T.Vector3(6, 0.35, 0)]), new T.LineBasicMaterial({ color: h.col(ctx.t.axisX) }));
      scene.add(axis);
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      camera.position.set(0.6, 3.2, 7.6);
      camera.lookAt(0, 0.4, 0);
      return {
        update(p) {
          const g = ease(p, 0.08, 0.3), r = ease(p, 0.4, 0.6), s = ease(p, 0.7, 0.9);
          a.position.x = lerp(-3.4, -2, g);
          b.rotation.y = (Math.PI / 4) * r;
          c.scale.setScalar(1 + s);
          c.position.set(2.1 + 0.2 * s, 0.35 * (1 + s), 0);
          oa.visible = p < 0.34; ob.visible = p >= 0.34 && p < 0.64; oc.visible = p >= 0.64;
          axis.visible = p >= 0.1 && p < 0.32;
          label.textContent = p >= 0.4 && p < 0.66 ? "45 degrees" : p >= 0.7 ? "Twice the size" : "";
          label.hidden = !label.textContent;
        }
      };
    },

    /* Lessons 4 and 5: the Add menu, a table, the desk scene. */
    add(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const wood = h.col(ctx.t.wood);
      const parts = [];
      const add = (mesh, at, item, pos) => { mesh.position.copy(pos); mesh.scale.setScalar(0.0001); scene.add(mesh); parts.push({ mesh, at, item, pos, base: mesh.userData.scale || new T.Vector3(1, 1, 1) }); return mesh; };
      const top = new T.Mesh(new T.BoxGeometry(1.9, 0.12, 1.05), h.std(ctx.wk));
      const legs = [[-0.8, -0.42], [0.8, -0.42], [-0.8, 0.42], [0.8, 0.42]].map(([x, z]) => [new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.9, 10), h.std(ctx.wk)), x, z]);
      const desk = ctx.mode === "desk";
      if (desk) {
        top.position.set(0, 0.96, 0); scene.add(top);
        legs.forEach(([m, x, z]) => { m.position.set(x, 0.45, z); scene.add(m); });
        const mug = new T.Mesh(new T.CylinderGeometry(0.13, 0.12, 0.24, 14), h.std(h.col(ctx.t.white), { roughness: 0.4 }));
        const handle = new T.Mesh(new T.TorusGeometry(0.07, 0.022, 6, 12, Math.PI), h.std(h.col(ctx.t.white)));
        handle.rotation.z = -Math.PI / 2; handle.position.x = 0.13; mug.add(handle);
        const ball = new T.Mesh(new T.IcosahedronGeometry(0.15, 1), h.std(h.col(ctx.t.accent)));
        const lamp = new T.Group();
        const stand = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.42, 8), h.std(h.col(ctx.t.grid).multiplyScalar(2.5)));
        stand.position.y = 0.21;
        const shade = new T.Mesh(new T.ConeGeometry(0.2, 0.26, 14, 1, true), h.std(h.col(ctx.t.weeks[2]), { side: T.DoubleSide }));
        shade.position.y = 0.48;
        const base = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.03, 14), h.std(h.col(ctx.t.grid).multiplyScalar(2.5)));
        lamp.add(stand, shade, base);
        add(mug, 0.1, -1, new T.Vector3(-0.45, 1.14, 0.12));
        add(ball, 0.32, -1, new T.Vector3(0.1, 1.17, 0.25));
        add(lamp, 0.54, -1, new T.Vector3(0.6, 1.02, -0.2));
        return {
          update(p) {
            parts.forEach((x) => x.mesh.scale.setScalar(Math.max(0.0001, backOut(seg(p, x.at, x.at + 0.1)))));
            h.orbit(camera, 0.55 + p * 0.9, 6.6, 3.4, new T.Vector3(0, 0.8, 0));
          }
        };
      }
      const menu = h.overlay(`<div class="vo-menu vo-tl"><div class="vo-menu-title">Add</div>
        ${["Cube", "UV Sphere", "Cylinder", "Plane", "Cone"].map((w) => `<div class="vo-menu-item">${w}</div>`).join("")}</div>`);
      const menuItems = Array.from(menu.querySelectorAll(".vo-menu-item"));
      add(top, 0.06, 0, new T.Vector3(0, 0.96, 0));
      legs.forEach(([m, x, z], i) => add(m, 0.18 + i * 0.1, 2, new T.Vector3(x, 0.45, z)));
      const cone = add(new T.Mesh(new T.ConeGeometry(0.3, 0.6, 12), h.std(ctx.wk)), 0.62, 4, new T.Vector3(1.9, 0.3, 0.6));
      const cursor = new T.Group();
      const ring = new T.Mesh(new T.TorusGeometry(0.16, 0.014, 6, 28), new T.MeshBasicMaterial({ color: 0xffffff }));
      ring.rotation.x = Math.PI / 2;
      const red = new T.Mesh(new T.TorusGeometry(0.16, 0.016, 6, 28, Math.PI / 2), new T.MeshBasicMaterial({ color: h.col(ctx.t.axisX) }));
      red.rotation.x = Math.PI / 2;
      cursor.add(ring, red);
      scene.add(cursor);
      const coneOutline = h.outline(cone, 1.08);
      h.orbit(camera, 0.75, 7.2, 3.8, new T.Vector3(0, 0.6, 0));
      return {
        update(p) {
          let current = null;
          parts.forEach((x) => {
            let k = backOut(seg(p, x.at, x.at + 0.06));
            if (x.mesh === cone) k *= 1 - ease(p, 0.84, 0.92);
            x.mesh.scale.setScalar(Math.max(0.0001, k));
            if (p >= x.at - 0.05 && p < x.at + 0.04) current = x;
          });
          const target = current ? current.pos : parts[parts.length - 1].pos;
          cursor.position.set(target.x, 0.01, target.z);
          cursor.visible = p < 0.8;
          menu.hidden = !(p >= 0.02 && p < 0.7);
          menuItems.forEach((el, i) => el.classList.toggle("is-on", !!current && current.item === i));
          coneOutline.visible = p >= 0.76 && p < 0.88;
        }
      };
    },

    /* Lessons 6, 7, 8: Edit Mode, extrude and inset, loop cut and bevel. */
    edit(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const mode = ctx.mode;
      if (mode === "select") {
        const s = 0.6;
        const corners = [];
        for (let z = 0; z < 2; z++) for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) corners.push(new T.Vector3(x ? s : -s, y ? 2 * s : 0, z ? s : -s));
        const faces = [[0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [2, 6, 7, 3], [0, 2, 3, 1], [4, 5, 7, 6]];
        const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
        const geo = new T.BufferGeometry();
        const pos = new Float32Array(faces.length * 6 * 3);
        geo.setAttribute("position", new T.BufferAttribute(pos, 3));
        const mesh = new T.Mesh(geo, h.std(ctx.wk, { side: T.DoubleSide }));
        const faceGlow = new T.Mesh(geo, new T.MeshBasicMaterial({ color: h.col(ctx.t.accent), transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false }));
        const lineGeo = new T.BufferGeometry();
        const lpos = new Float32Array(edges.length * 6);
        lineGeo.setAttribute("position", new T.BufferAttribute(lpos, 3));
        const lineMat = new T.LineBasicMaterial({ color: 0x111111 });
        const lines = new T.LineSegments(lineGeo, lineMat);
        const dotGeo = new T.SphereGeometry(0.05, 8, 6);
        const dots = corners.map(() => { const d = new T.Mesh(dotGeo, new T.MeshBasicMaterial({ color: 0x111111 })); scene.add(d); return d; });
        scene.add(mesh, faceGlow, lines);
        const objOutline = new T.Mesh(geo, new T.MeshBasicMaterial({ color: h.col(ctx.t.accent), side: T.BackSide }));
        objOutline.scale.setScalar(1.04);
        objOutline.position.y = -0.024;
        scene.add(objOutline);
        const label = h.overlay('<span class="vo-label vo-tl"></span>');
        const modes = h.overlay(`<span class="vo-selectmodes vo-tl2">
          <span class="vo-sm"><svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor"/><circle cx="2.5" cy="13.5" r="2.2" fill="currentColor"/></svg></span>
          <span class="vo-sm"><svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" opacity=".5"/><path d="M2.5 13.5H13.5" stroke="currentColor" stroke-width="2.4"/></svg></span>
          <span class="vo-sm"><svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="currentColor" opacity=".85"/></svg></span></span>`);
        const sm = Array.from(modes.querySelectorAll(".vo-sm"));
        const accent = h.col(ctx.t.accent), black = new T.Color(0x111111);
        h.orbit(camera, 0.65, 5.6, 3.4, new T.Vector3(0, 0.5, 0));
        return {
          update(p) {
            const ramp = ease(p, 0.7, 0.88);
            const cur = corners.map((c, i) => { const v = c.clone(); if (i === 6 || i === 7) v.y = lerp(2 * s, 0, ramp); return v; });
            let k = 0;
            faces.forEach(([a, b, c2, d]) => { [a, b, c2, a, c2, d].forEach((i) => { pos[k++] = cur[i].x; pos[k++] = cur[i].y; pos[k++] = cur[i].z; }); });
            geo.attributes.position.needsUpdate = true;
            geo.computeVertexNormals();
            k = 0;
            edges.forEach(([a, b]) => { [a, b].forEach((i) => { lpos[k++] = cur[i].x; lpos[k++] = cur[i].y; lpos[k++] = cur[i].z; }); });
            lineGeo.attributes.position.needsUpdate = true;
            const edit = p >= 0.12;
            const which = p >= 0.16 && p < 0.33 ? 0 : p >= 0.33 && p < 0.5 ? 1 : p >= 0.5 && p < 0.67 ? 2 : p >= 0.67 ? 0 : -1;
            objOutline.visible = !edit;
            lines.visible = edit;
            lineMat.color.copy(which === 1 ? accent : black);
            dots.forEach((d, i) => {
              d.position.copy(cur[i]);
              d.visible = edit;
              d.material.color.copy(which === 0 && (p < 0.67 || i === 6 || i === 7) ? accent : black);
              d.scale.setScalar(which === 0 ? 1.4 : 1);
            });
            faceGlow.visible = which === 2;
            label.textContent = edit ? "Edit Mode" : "Object Mode";
            modes.hidden = !edit;
            sm.forEach((el, i) => el.classList.toggle("is-on", edit && i === Math.max(0, which)));
          }
        };
      }
      if (mode === "extrude") {
        let geo = null;
        const mat = h.std(ctx.wk, { flatShading: true });
        const mesh = new T.Mesh(new T.BufferGeometry(), mat);
        scene.add(mesh);
        const faceGlow = new T.Mesh(new T.CircleGeometry(1, 28), new T.MeshBasicMaterial({ color: h.col(ctx.t.accent), transparent: true, opacity: 0.55, side: T.DoubleSide }));
        faceGlow.rotation.x = -Math.PI / 2;
        const inset = new T.Mesh(new T.RingGeometry(0.88, 1, 28), new T.MeshBasicMaterial({ color: 0x111111, side: T.DoubleSide }));
        inset.rotation.x = -Math.PI / 2;
        scene.add(faceGlow, inset);
        h.orbit(camera, 0.55, 6, 3.2, new T.Vector3(0, 0.75, 0));
        let lastKey = "";
        return {
          update(p) {
            const body = ease(p, 0.06, 0.24), taper = ease(p, 0.3, 0.44), neck = ease(p, 0.5, 0.66), ins = ease(p, 0.72, 0.86);
            const r0 = 0.5, bodyH = 0.24 + 0.85 * body, rn = lerp(r0, 0.17, taper), shH = 0.32 * taper, nh = 0.38 * neck;
            const topY = bodyH + shH + nh;
            const key = [bodyH, rn, shH, nh].map((v) => v.toFixed(3)).join();
            if (key !== lastKey) {
              lastKey = key;
              const pts = [new T.Vector2(0, 0), new T.Vector2(r0, 0), new T.Vector2(r0, bodyH), new T.Vector2(rn, bodyH + shH), new T.Vector2(rn, topY), new T.Vector2(0, topY)];
              if (geo) geo.dispose();
              geo = new T.LatheGeometry(pts, 24);
              mesh.geometry = geo;
            }
            faceGlow.position.y = topY + 0.004;
            faceGlow.scale.setScalar(rn * (ins > 0 ? lerp(1, 0.62, ins) : 1));
            faceGlow.visible = p < 0.9;
            inset.position.y = topY + 0.006;
            inset.scale.setScalar(rn * lerp(1, 0.62, ins));
            inset.visible = ins > 0.01;
          },
          dispose() { if (geo) geo.dispose(); }
        };
      }
      /* bevel: the podium */
      const steps = [];
      for (let i = 0; i <= 10; i++) steps.push(h.podiumGeometry(i / 10));
      const mat = h.std(ctx.wk, { flatShading: false, roughness: 0.6 });
      const mesh = new T.Mesh(steps[0], mat);
      scene.add(mesh);
      const ring = new T.Mesh(new T.TorusGeometry(1.352, 0.012, 6, 64), new T.MeshBasicMaterial({ color: h.col(ctx.t.accent) }));
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      const edgeGlow = new T.Mesh(new T.TorusGeometry(1.33, 0.02, 6, 64), new T.MeshBasicMaterial({ color: h.col(ctx.t.accent) }));
      edgeGlow.rotation.x = Math.PI / 2;
      edgeGlow.position.y = 0.355;
      scene.add(edgeGlow);
      h.orbit(camera, 0.5, 4.6, 2.2, new T.Vector3(0, 0.2, 0));
      return {
        update(p) {
          const cut = ease(p, 0.08, 0.36), bev = ease(p, 0.5, 0.8);
          ring.visible = p >= 0.06 && p < 0.46;
          ring.position.y = lerp(0.6, 0.18, cut);
          ring.scale.setScalar(p < 0.12 ? 1.0 : 1.0);
          edgeGlow.visible = p >= 0.44 && p < 0.84;
          mesh.geometry = steps[Math.round(bev * 10)];
        },
        dispose() { steps.forEach((g) => g.dispose()); }
      };
    },

    /* Lessons 9, 10, 11, 27: the shirt and the cap take shape. */
    garment(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const mode = ctx.mode;
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      const stack = (names) => h.overlay(`<div class="vo-stack vo-tr"><div class="vo-stack-head"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.6 1.6a3.6 3.6 0 0 0-4.4 4.6L1.8 10.6a1.6 1.6 0 0 0 2.3 2.3l4.4-4.4a3.6 3.6 0 0 0 4.6-4.4l-2 2-1.9-.5-.5-1.9z" fill="currentColor"/></svg>Modifiers</div>${names.map((n) => `<div class="vo-stack-row">${n}</div>`).join("")}</div>`);
      if (mode === "mirror") {
        const half = new T.Mesh(h.shirtGeometry(false, true), h.std(ctx.wk));
        const mirror = new T.Mesh(half.geometry, h.std(ctx.wk));
        mirror.scale.x = -1;
        const full = h.shirt(ctx.wk, true);
        [half, mirror, full].forEach((m) => { m.position.y = 1.15; scene.add(m); });
        const plane = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0.3), new T.Vector3(0, 2.4, 0.3)]), new T.LineDashedMaterial({ color: h.col(ctx.t.accent), dashSize: 0.08, gapSize: 0.06 }));
        plane.computeLineDistances();
        scene.add(plane);
        const st = stack(["Mirror", "Subdivision Surface"]);
        const rows = Array.from(st.querySelectorAll(".vo-stack-row"));
        h.orbit(camera, 0.35, 7, 2.6, new T.Vector3(0, 1.1, 0));
        const smoothMat = full.material, blockyMat = h.std(ctx.wk, { flatShading: true, roughness: 0.82 });
        return {
          update(p) {
            const m = ease(p, 0.18, 0.4), sub = ease(p, 0.6, 0.72);
            mirror.scale.x = -Math.max(0.0001, m);
            half.visible = mirror.visible = sub < 0.5;
            full.visible = sub >= 0.5;
            full.material = p < 0.8 ? blockyMat : smoothMat;
            plane.visible = p >= 0.12 && p < 0.58;
            rows[0].classList.toggle("is-on", p >= 0.15);
            rows[1].classList.toggle("is-on", p >= 0.58);
            st.hidden = p < 0.08;
            label.textContent = p >= 0.82 ? "Shade Smooth" : p >= 0.58 ? "Subdivision Surface" : p >= 0.15 ? "Mirror" : "";
            label.hidden = !label.textContent;
          }
        };
      }
      if (mode === "shirt" || mode === "build") {
        const shirtMesh = h.shirt(ctx.wk, true);
        shirtMesh.material.flatShading = false;
        shirtMesh.position.y = 1.15;
        const group = new T.Group();
        group.add(shirtMesh);
        scene.add(group);
        let capParts = null;
        if (mode === "build") {
          capParts = h.cap(h.col(ctx.t.weeks[(ctx.item.week) % 6]), true);
          capParts.group.position.set(1.9, 0.02, 0.4);
          scene.add(capParts.group);
          shirtMesh.position.x = -0.6;
        }
        h.orbit(camera, 0.2, 7.2, 2.4, new T.Vector3(mode === "build" ? 0.4 : 0, 0.95, 0));
        return {
          update(p) {
            if (mode === "shirt") {
              group.rotation.y = p * Math.PI * 2;
              label.textContent = p < 0.34 ? "Collar opening" : p < 0.67 ? "Hem" : "Sleeve ends";
            } else {
              shirtMesh.scale.setScalar(Math.max(0.0001, backOut(seg(p, 0.06, 0.3))));
              capParts.group.scale.setScalar(Math.max(0.0001, backOut(seg(p, 0.34, 0.56))));
              shirtMesh.rotation.y = capParts.group.rotation.y = ease(p, 0.6, 1) * Math.PI * 2;
              label.textContent = p < 0.06 ? "A blank file" : "";
              label.hidden = !label.textContent;
            }
          }
        };
      }
      /* cap */
      const capC = h.col(ctx.wk);
      const full = new T.Mesh(new T.SphereGeometry(0.62, 14, 10), h.std(capC));
      const lower = new T.Mesh(new T.SphereGeometry(0.62, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), h.std(capC));
      const parts = h.cap(capC, false);
      const smoothParts = h.cap(capC, true);
      const holder = new T.Group();
      [full, lower, parts.group, smoothParts.group].forEach((o) => holder.add(o));
      holder.position.y = 0.8;
      scene.add(holder);
      const st = stack(["Solidify", "Subdivision Surface"]);
      const rows = Array.from(st.querySelectorAll(".vo-stack-row"));
      camera.position.set(3.6, 1.0, 4.4);
      camera.lookAt(0, 0.85, 0);
      return {
        update(p) {
          const cut = ease(p, 0.16, 0.32), brimK = backOut(seg(p, 0.36, 0.52)), thick = ease(p, 0.58, 0.74), sm = p >= 0.8;
          full.visible = p < 0.16;
          lower.visible = p >= 0.16 && cut < 1;
          lower.position.y = -0.9 * cut;
          lower.scale.setScalar(Math.max(0.0001, 1 - cut));
          parts.group.visible = p >= 0.16 && !sm;
          smoothParts.group.visible = sm;
          [parts, smoothParts].forEach((c) => {
            c.brim.scale.set(Math.max(0.0001, brimK), 1, 1.3 * Math.max(0.0001, brimK));
            c.inner.scale.setScalar(lerp(0.995, 0.86, thick));
            c.rim.geometry.dispose();
            c.rim.geometry = new T.RingGeometry(0.6 * lerp(1.03, 0.86, thick), 0.62, 32);
          });
          holder.rotation.y = 0.3 + p * 1.2;
          rows[0].classList.toggle("is-on", p >= 0.56);
          rows[1].classList.toggle("is-on", p >= 0.78);
          st.hidden = p < 0.54;
          label.textContent = p < 0.16 ? "UV Sphere" : p < 0.34 ? "Bottom half deleted" : p < 0.56 ? "Brim from a circle" : p < 0.78 ? "Solidify" : "Subdivision Surface";
        }
      };
    },

    /* Lessons 12 and 19: colour, shine and the fabric look. */
    material(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(0.8); h.grid(); h.envMap();
      const fabric = ctx.mode === "fabric";
      const shirtMesh = h.shirt(ctx.wk, true);
      shirtMesh.material.flatShading = false;
      shirtMesh.material.roughness = 0.15;
      shirtMesh.position.y = fabric ? 1.15 : 1.42;
      scene.add(shirtMesh);
      const panel = h.overlay(`<div class="vo-panel vo-tr">
        ${fabric ? "" : '<div class="vo-balls"><i></i><i></i><i class="is-on"></i><i></i></div><div class="vo-row"><span>Base Color</span><b class="vo-swatch"></b></div>'}
        <div class="vo-row"><span>Roughness</span><b class="vo-bar"><i data-bar="r"></i></b></div>
        ${fabric ? '<div class="vo-row"><span>Bump</span><b class="vo-bar"><i data-bar="b"></i></b></div>' : ""}</div>`);
      const barR = panel.querySelector('[data-bar="r"]'), barB = panel.querySelector('[data-bar="b"]'), sw = panel.querySelector(".vo-swatch");
      let capParts = null, pod = null;
      if (!fabric) {
        pod = h.podium(h.col(ctx.t.panel2).multiplyScalar(1.7), 1);
        pod.material.roughness = 0.4;
        scene.add(pod);
        shirtMesh.position.x = -0.35;
        capParts = h.cap(h.col(ctx.t.weeks[3]), true);
        capParts.group.position.set(0.85, 0.36, 0.45);
        capParts.group.rotation.y = -0.5;
        scene.add(capParts.group);
        h.orbit(camera, 0.45, 6.4, 3.0, new T.Vector3(0, 0.95, 0));
      } else {
        shirtMesh.material.bumpMap = h.weaveTexture();
        shirtMesh.material.bumpScale = 0;
        shirtMesh.material.needsUpdate = true;
        camera.position.set(1.2, 1.9, 2.6);
        camera.lookAt(0, 1.35, 0);
      }
      const palette = [ctx.t.weeks[0], ctx.t.accent, ctx.t.white, ctx.t.weeks[1], ctx.t.weeks[3], ctx.t.weeks[5]].map((c) => h.col(c));
      return {
        update(p) {
          let rough;
          if (fabric) {
            rough = lerp(0.12, 0.95, ease(p, 0.15, 0.5));
            shirtMesh.material.bumpScale = lerp(0, 0.45, ease(p, 0.45, 0.8));
            if (barB) barB.style.width = (ease(p, 0.45, 0.8) * 100).toFixed(0) + "%";
            shirtMesh.rotation.y = Math.sin(p * Math.PI * 2) * 0.25;
          } else {
            const ci = Math.min(palette.length - 1, Math.floor(seg(p, 0, 0.5) * palette.length));
            const c = palette[ci];
            shirtMesh.material.color.copy(c);
            capParts.material.color.copy(palette[(ci + 2) % palette.length]);
            capParts.brim.material.color.copy(palette[(ci + 2) % palette.length]);
            if (sw) sw.style.background = "#" + c.getHexString(T.SRGBColorSpace);
            rough = p < 0.5 ? 0.12 : lerp(0.12, 0.95, ease(p, 0.55, 0.9));
            shirtMesh.rotation.y = -0.25 + Math.sin(p * Math.PI * 2) * 0.2;
          }
          shirtMesh.material.roughness = rough;
          barR.style.width = (rough * 100).toFixed(0) + "%";
        }
      };
    },

    /* Lesson 13: lights. */
    light(ctx) {
      const { T, h, scene, camera } = ctx;
      scene.background = h.col(ctx.t.bg);
      scene.fog = null;
      const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: h.col(ctx.t.panel2).multiplyScalar(1.25), roughness: 0.95 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      const pod = h.podium(h.col(ctx.t.panel2).multiplyScalar(1.8), 1);
      pod.castShadow = pod.receiveShadow = true;
      const c = h.cap(ctx.wk, true);
      c.group.position.set(0, 0.37, 0);
      c.group.rotation.y = -0.6;
      c.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(floor, pod, c.group);
      const main = new T.DirectionalLight(0xffffff, 0);
      main.position.set(-3.5, 4.5, 2.5);
      main.castShadow = true;
      main.shadow.mapSize.set(1024, 1024);
      Object.assign(main.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
      main.shadow.bias = -0.0005;
      main.shadow.blurSamples = 20;
      const fill = new T.DirectionalLight(0xffffff, 0);
      fill.position.set(4, 2.5, 3);
      const amb = new T.HemisphereLight(0xffffff, 0x000000, 0);
      scene.add(main, fill, amb);
      const panelMat = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true });
      const mainPanel = new T.Mesh(new T.PlaneGeometry(1, 1), panelMat);
      mainPanel.position.copy(main.position).multiplyScalar(0.62);
      mainPanel.lookAt(0, 0.5, 0);
      const fillPanel = new T.Mesh(new T.PlaneGeometry(0.6, 0.6), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true }));
      fillPanel.position.copy(fill.position).multiplyScalar(0.7);
      fillPanel.lookAt(0, 0.5, 0);
      scene.add(mainPanel, fillPanel);
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      camera.position.set(1.8, 3.4, 6.6);
      camera.lookAt(0, 0.55, 0);
      return {
        update(p) {
          const on = ease(p, 0.12, 0.18), size = ease(p, 0.3, 0.6), fillOn = ease(p, 0.66, 0.74);
          main.intensity = 3.2 * on;
          amb.intensity = 0.12 * on + 0.35 * fillOn;
          fill.intensity = 0.9 * fillOn;
          main.shadow.radius = lerp(1, 18, size);
          mainPanel.scale.setScalar(lerp(0.3, 1.6, size));
          panelMat.opacity = on;
          mainPanel.visible = on > 0.01;
          fillPanel.material.opacity = fillOn * 0.8;
          fillPanel.visible = fillOn > 0.01;
          label.textContent = p < 0.12 ? "No light, black picture" : p < 0.3 ? "Main light" : p < 0.64 ? "Bigger light, softer shadow" : "Weaker fill on the other side";
        }
      };
    },

    /* Lessons 14, 15, 23: the camera. */
    camera(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const mode = ctx.mode;
      const pod = h.podium(h.col(ctx.t.panel2).multiplyScalar(1.7), 1);
      const shirtMesh = h.shirt(ctx.wk, true);
      shirtMesh.material.flatShading = false;
      shirtMesh.scale.setScalar(0.62);
      shirtMesh.position.set(-0.35, 1.0, -0.1);
      const capParts = h.cap(h.col(ctx.t.weeks[(ctx.item.week + 1) % 6]), true);
      capParts.group.scale.setScalar(0.72);
      capParts.group.position.set(0.62, 0.36, 0.35);
      capParts.group.rotation.y = -0.6;
      scene.add(pod, shirtMesh, capParts.group);
      const prop = h.cameraProp(ctx.t.white);
      scene.add(prop);
      const shot = new T.PerspectiveCamera(30, 1, 0.05, 80);
      const target = new T.Vector3(0, 0.75, 0);
      const frameEl = h.overlay(`<div class="vo-frame ${mode === "orbit" ? "" : "vo-frame--square"}"><span class="vo-frame-size">1080 by 1080</span></div>`);
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      if (mode === "orbit") {
        frameEl.remove();
        const empty = new T.Group();
        const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((a) => new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-a[0], -a[1], -a[2]).multiplyScalar(0.35), new T.Vector3(...a).multiplyScalar(0.35)]), new T.LineBasicMaterial({ color: 0xffffff })));
        axes.forEach((l) => empty.add(l));
        empty.position.set(0, 0.75, 0);
        scene.add(empty);
        const arm = new T.Group();
        empty.add(arm);
        scene.remove(prop);
        arm.add(prop);
        const link = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 0.45, 2.6)]), new T.LineDashedMaterial({ color: h.col(ctx.t.accent), dashSize: 0.08, gapSize: 0.07 }));
        link.computeLineDistances();
        arm.add(link);
        h.orbit(camera, 0.9, 9.2, 5.2, new T.Vector3(0, 0.6, 0));
        label.textContent = "Empty";
        return {
          update(p) {
            const turn = ease(p, 0.05, 0.75), push = ease(p, 0.78, 0.95);
            empty.rotation.y = turn * Math.PI;
            const dist = lerp(2.6, 1.7, push);
            prop.position.set(0, 0.45, dist);
            prop.lookAt(empty.localToWorld(new T.Vector3(0, -0.3, 0)));
            link.scale.set(1, 1, dist / 2.6);
          }
        };
      }
      const outside = (a) => { h.orbit(camera, a, 8.2, 3.9, target); };
      const camA = new T.Vector3(1.9, 1.5, 4.6), camB = new T.Vector3(-3.4, 2.4, 3.8);
      const fromPose = new T.Object3D(), toPose = new T.Object3D();
      if (mode === "render") {
        frameEl.classList.add("is-on");
        frameEl.querySelector(".vo-frame-size").hidden = true;
        const curtain = h.overlay('<div class="vo-curtain"></div>');
        const file = (ctx.lesson.youMake.match(/BLENDER_\w+\.png/) || [""])[0];
        const fileChip = h.overlay(`<span class="vo-file">${esc(file)}</span>`);
        prop.visible = false;
        return {
          update(p) {
            ctx.activeCamera = shot;
            shot.aspect = ctx.aspect || 16 / 9; shot.position.copy(camA); shot.lookAt(target); shot.updateProjectionMatrix();
            const r = ease(p, 0.12, 0.5);
            curtain.style.transform = `scaleY(${(p < 0.1 ? 1 : 1 - r).toFixed(3)})`;
            curtain.hidden = p >= 0.5;
            fileChip.hidden = p < 0.7;
            label.textContent = p >= 0.1 && p < 0.5 ? "Rendering with EEVEE" : "";
            label.hidden = !label.textContent;
          }
        };
      }
      /* frame */
      return {
        update(p) {
          prop.position.copy(p >= 0.72 ? camB : camA);
          prop.lookAt(target);
          shot.aspect = ctx.aspect || 16 / 9;
          if (p < 0.3) {
            ctx.activeCamera = camera; outside(0.9 + p);
          } else if (p < 0.38) {
            const k = ease(p, 0.3, 0.38);
            outside(1.2);
            fromPose.position.copy(camera.position); fromPose.quaternion.copy(camera.quaternion);
            toPose.position.copy(camA); toPose.lookAt(target); toPose.rotateY(Math.PI);
            shot.position.lerpVectors(fromPose.position, toPose.position, k);
            shot.quaternion.slerpQuaternions(fromPose.quaternion, toPose.quaternion, k);
            ctx.activeCamera = shot;
          } else if (p < 0.64) {
            shot.position.copy(camA); shot.lookAt(target); ctx.activeCamera = shot;
          } else if (p < 0.72) {
            ctx.activeCamera = camera; camera.position.copy(camB).multiplyScalar(1.0); camera.lookAt(target);
          } else {
            shot.position.copy(camB); shot.lookAt(target); ctx.activeCamera = shot;
          }
          shot.updateProjectionMatrix();
          const through = ctx.activeCamera === shot && (p >= 0.38 || p >= 0.72);
          frameEl.classList.toggle("is-on", through);
          prop.visible = ctx.activeCamera === camera;
          label.textContent = through ? "Camera view" : "";
          label.hidden = !label.textContent;
        }
      };
    },

    /* Lesson 16: unfolding a box flat. */
    uv(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const mat = h.std(ctx.wk, { side: T.DoubleSide, flatShading: true });
      const edgeMat = new T.LineBasicMaterial({ color: 0x111111 });
      const face = () => {
        const g = new T.PlaneGeometry(1, 1);
        g.rotateX(-Math.PI / 2);
        const m = new T.Mesh(g, mat);
        m.add(new T.LineSegments(new T.EdgesGeometry(g), edgeMat));
        return m;
      };
      const root = new T.Group();
      root.add(face());
      const hinge = (px, pz, ox, oz) => { const piv = new T.Group(); piv.position.set(px, 0, pz); const f = face(); f.position.set(ox, 0, oz); piv.add(f); root.add(piv); return { piv, f }; };
      const front = hinge(0, 0.5, 0, 0.5), back = hinge(0, -0.5, 0, -0.5), right = hinge(0.5, 0, 0.5, 0), left = hinge(-0.5, 0, -0.5, 0);
      const topPiv = new T.Group();
      topPiv.position.set(0, 0, -0.5);
      const topFace = face();
      topFace.position.set(0, 0, -0.5);
      topPiv.add(topFace);
      back.f.add(topPiv);
      root.position.y = 0.01;
      scene.add(root);
      const seamMat = new T.LineBasicMaterial({ color: h.col(ctx.t.axisX).multiplyScalar(1.5), transparent: true });
      const S = 0.5, seamPts = [[-S, 0, S, -S, 1, S], [S, 0, S, S, 1, S], [-S, 0, -S, -S, 1, -S], [S, 0, -S, S, 1, -S], [-S, 1, S, S, 1, S], [-S, 1, S, -S, 1, -S], [S, 1, S, S, 1, -S]].flat();
      const seamGeo = new T.BufferGeometry();
      seamGeo.setAttribute("position", new T.Float32BufferAttribute(seamPts, 3));
      const seams = new T.LineSegments(seamGeo, seamMat);
      scene.add(seams);
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      return {
        update(p) {
          const open = ease(p, 0.3, 0.62) * (1 - ease(p, 0.92, 1));
          const a = (Math.PI / 2) * (1 - open);
          front.piv.rotation.x = -a; back.piv.rotation.x = a; right.piv.rotation.z = a; left.piv.rotation.z = -a; topPiv.rotation.x = a;
          seamMat.opacity = p < 0.32 ? ease(p, 0.08, 0.2) : 1 - ease(p, 0.32, 0.4);
          seams.visible = seamMat.opacity > 0.01;
          const view = ease(p, 0.45, 0.68) * (1 - ease(p, 0.9, 1));
          const ang = 0.7 + p * 0.6;
          camera.position.set(Math.sin(ang) * lerp(5.2, 1.2, view), lerp(3.2, 7.2, view), Math.cos(ang) * lerp(5.2, 1.2, view));
          camera.lookAt(0, lerp(0.5, 0, view), 0);
          label.textContent = p < 0.3 ? (p >= 0.1 ? "Seams" : "") : p >= 0.62 && p < 0.9 ? "UV map" : "";
          label.hidden = !label.textContent;
        }
      };
    },

    /* Lessons 17, 18, 20, 25: the print on the shirt. */
    print(ctx) {
      const { T, h, scene, camera } = ctx;
      const mode = ctx.mode;
      h.lights(mode === "mockup" || mode === "reel" ? 0.9 : 1);
      if (mode !== "reel") h.grid();
      const cloth = h.col(mode === "texture" ? ctx.t.cloth : ctx.t.dark).multiplyScalar(mode === "texture" ? 1 : 1.4);
      const shirtMesh = h.shirt(mode === "texture" ? h.col(ctx.t.weeks[ctx.item.week - 1]) : cloth, true);
      shirtMesh.material.flatShading = false;
      shirtMesh.material.roughness = 0.9;
      shirtMesh.position.y = 1.15;
      scene.add(shirtMesh);
      const print = h.printPlane("octo", 0.9, 0.9);
      shirtMesh.add(print);
      print.position.set(0, 0.05, h.SHIRT_FRONT);
      const label = h.overlay('<span class="vo-label vo-tl"></span>');
      if (mode === "texture") {
        const board = new T.Mesh(new T.PlaneGeometry(1.4, 1.4), new T.MeshStandardMaterial({ color: h.col(ctx.t.cloth), roughness: 0.9 }));
        board.position.set(-2.4, 1.15, 0.2);
        board.rotation.y = 0.35;
        scene.add(board);
        const loose = h.printPlane("octo", 1.0, 1.0);
        scene.add(loose);
        shirtMesh.remove(print);
        shirtMesh.position.x = 0.9;
        h.orbit(camera, 0.12, 8, 2.4, new T.Vector3(-0.5, 1.1, 0));
        const a = new T.Vector3(-2.4, 1.15, 0.24), b = new T.Vector3(0.9, 1.2, h.SHIRT_FRONT + 0.005);
        return {
          update(p) {
            const k = ease(p, 0.36, 0.6);
            loose.position.lerpVectors(a, b, k);
            loose.position.z += Math.sin(k * Math.PI) * 0.6;
            loose.rotation.y = lerp(0.35, 0, k);
            loose.scale.setScalar(lerp(1, 0.86, k));
            loose.visible = p >= 0.04;
            label.textContent = p < 0.36 ? "Image Texture on a flat plane" : p < 0.6 ? "" : "See-through background";
            label.hidden = !label.textContent;
          }
        };
      }
      if (mode === "decal") {
        const word = h.printTexture("word"), octo = print.material.map;
        h.orbit(camera, 0.1, 6.2, 2.0, new T.Vector3(0, 1.15, 0));
        let lastSwap = null;
        return {
          update(p) {
            const appear = backOut(seg(p, 0.03, 0.14)), onShirt = ease(p, 0.16, 0.28);
            const move = Math.sin(seg(p, 0.34, 0.54) * Math.PI) * 0.35;
            const size = 1 - 0.38 * Math.sin(seg(p, 0.56, 0.74) * Math.PI);
            const swap = p >= 0.82;
            if (swap !== lastSwap) {
              lastSwap = swap;
              print.material.map = swap && word ? word : octo;
              print.material.needsUpdate = true;
              print.geometry.dispose();
              print.geometry = new T.PlaneGeometry(swap ? 1.3 : 0.9, swap ? 1.3 * 445 / 1688 : 0.9);
            }
            print.position.set(lerp(1.8, 0, onShirt), 0.05 + move, h.SHIRT_FRONT + lerp(0.6, 0.004, onShirt));
            print.scale.setScalar(Math.max(0.0001, appear) * size);
            label.textContent = p < 0.16 ? "Mesh Plane" : p < 0.32 ? "Shrinkwrap" : p < 0.55 ? "Move" : p < 0.78 ? "Resize" : "Swap the image";
          }
        };
      }
      const pod = h.podium(h.col(ctx.t.panel2).multiplyScalar(1.7), 1);
      scene.add(pod);
      shirtMesh.scale.setScalar(0.66);
      shirtMesh.position.set(-0.3, 1.04, -0.1);
      const capParts = h.cap(h.col(ctx.t.weeks[ctx.item.week - 1]), true);
      capParts.group.scale.setScalar(0.74);
      capParts.group.position.set(0.7, 0.36, 0.38);
      capParts.group.rotation.y = -0.55;
      const logo = h.printPlane("octoDark", 0.28, 0.28);
      logo.position.set(0, 0.32, 0.6);
      logo.rotation.x = -0.45;
      capParts.group.add(logo);
      scene.add(capParts.group);
      const frameEl = h.overlay(`<div class="vo-frame is-on ${mode === "reel" ? "vo-frame--tall" : "vo-frame--square"}"></div>`);
      const bgA = h.col(ctx.t.bg), bgB = h.col(ctx.t.weeks[ctx.item.week - 1]).multiplyScalar(0.35);
      if (mode === "mockup") {
        return {
          update(p) {
            h.orbit(camera, 0.25 + Math.sin(p * Math.PI * 2) * 0.22, 7.6, 3.0, new T.Vector3(0.1, 0.8, 0));
            label.hidden = true;
          }
        };
      }
      /* reel */
      return {
        update(p) {
          const on = ease(p, 0.04, 0.24), move = ease(p, 0.26, 0.62), bg = ease(p, 0.6, 0.8);
          print.position.set(0, 0.05 + (1 - on) * 1.4, h.SHIRT_FRONT + (1 - on) * 0.5);
          print.scale.setScalar(Math.max(0.0001, on));
          h.orbit(camera, lerp(-0.5, 0.45, move), lerp(9.5, 7.2, move), lerp(2.2, 2.9, move), new T.Vector3(0.1, 0.85, 0));
          scene.background.copy(bgA).lerp(bgB, bg);
          scene.fog.color.copy(scene.background);
          label.hidden = true;
        }
      };
    },

    /* Lesson 21: keyframes. */
    keyframe(ctx) {
      const { T, h, scene, camera } = ctx;
      h.lights(); h.grid();
      const c = h.cap(ctx.wk, true);
      c.group.position.y = 0.02;
      scene.add(c.group);
      h.orbit(camera, 0.55, 5.6, 2.9, new T.Vector3(0, 0.45, 0));
      const tl = h.overlay(`<div class="vo-timeline"><div class="vo-tl-track"><i class="vo-key" data-k="1" style="left:0%"></i><i class="vo-key" data-k="90" style="left:100%"></i><i class="vo-head"></i></div>
        <div class="vo-tl-nums"><span>1</span><span>45</span><span>90</span></div></div>`);
      const frameLabel = h.overlay('<span class="vo-label vo-tl"></span>');
      const k1 = tl.querySelector('[data-k="1"]'), k90 = tl.querySelector('[data-k="90"]'), head = tl.querySelector(".vo-head");
      return {
        update(p) {
          let f;
          if (p < 0.14) f = 1;
          else if (p < 0.26) f = 90;
          else f = Math.round(lerp(1, 90, seg(p, 0.28, 0.96)));
          head.style.left = ((f - 1) / 89 * 100).toFixed(2) + "%";
          k1.classList.toggle("is-on", p >= 0.04);
          k90.classList.toggle("is-on", p >= 0.16);
          c.group.rotation.y = p < 0.26 ? 0 : ((f - 1) / 89) * Math.PI * 2;
          frameLabel.textContent = "Frame " + f;
        }
      };
    }
  };

  /* ---------- Flat scene types (SVG) ---------- */

  const NS = "http://www.w3.org/2000/svg";
  function svgRoot(art, viewBox) {
    art.innerHTML = `<svg class="vf" viewBox="${viewBox || "0 0 320 180"}" preserveAspectRatio="xMidYMid meet"></svg>`;
    return art.firstElementChild;
  }
  function el(parent, tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }
  function makeFlatCtx(item) { return { item, lesson: item.lesson }; }

  const FLAT = {

    /* Day 0: install, then switch on Emulate Numpad. */
    setup(art) {
      const s = svgRoot(art);
      const g = el(s, "g", {});
      el(g, "rect", { x: 22, y: 40, width: 110, height: 72, rx: 6, class: "vf-panel" });
      el(g, "rect", { x: 10, y: 112, width: 134, height: 8, rx: 3, class: "vf-panel2" });
      el(g, "text", { x: 77, y: 32, class: "vf-text vf-mid vf-small" }, "blender.org");
      const arrow = el(g, "path", { d: "M77 44 v26 m-10 -10 l10 10 l10 -10", class: "vf-stroke-wk", "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
      const done = el(g, "text", { x: 77, y: 96, class: "vf-text vf-mid" }, "Blender 5.2 LTS");
      const pane = el(s, "g", {});
      el(pane, "rect", { x: 160, y: 22, width: 150, height: 100, rx: 8, class: "vf-panel" });
      el(pane, "text", { x: 172, y: 40, class: "vf-text vf-small vf-dim" }, "Preferences · Input");
      el(pane, "text", { x: 172, y: 64, class: "vf-text vf-small" }, "Emulate Numpad");
      const t1 = el(pane, "rect", { x: 270, y: 54, width: 28, height: 14, rx: 7, class: "vf-toggle" });
      const k1 = el(pane, "circle", { cx: 277, cy: 61, r: 5, class: "vf-knob" });
      el(pane, "text", { x: 172, y: 90, class: "vf-text vf-small vf-dim" }, "Emulate 3 Button Mouse");
      el(pane, "text", { x: 172, y: 104, class: "vf-text vf-tiny vf-dim" }, "Trackpad only");
      el(pane, "rect", { x: 270, y: 82, width: 28, height: 14, rx: 7, class: "vf-toggle" });
      el(pane, "circle", { cx: 277, cy: 89, r: 5, class: "vf-knob" });
      const keys = el(s, "g", {});
      const keyEls = "1234567890".split("").map((k, i) => {
        const x = 160 + i * 15;
        const r = el(keys, "rect", { x, y: 134, width: 13, height: 13, rx: 2.5, class: "vf-key" });
        el(keys, "text", { x: x + 6.5, y: 143.5, class: "vf-text vf-mid vf-tiny vf-keytext" }, k);
        return { k, r };
      });
      return {
        update(p) {
          const drop = ease(p, 0.05, 0.25);
          arrow.setAttribute("transform", `translate(0 ${(drop * 18).toFixed(1)})`);
          arrow.style.opacity = String(1 - ease(p, 0.25, 0.32));
          done.style.opacity = String(ease(p, 0.28, 0.36));
          const on = ease(p, 0.42, 0.5);
          k1.setAttribute("cx", String(lerp(277, 291, on)));
          t1.classList.toggle("is-on", on > 0.5);
          keyEls.forEach((x) => x.r.classList.toggle("is-on", on > 0.5 && ["1", "3", "7"].includes(x.k) &&
            ((x.k === "1" && p >= 0.55) || (x.k === "3" && p >= 0.65) || (x.k === "7" && p >= 0.75))));
        }
      };
    },

    /* Lesson 1: the window and its four areas. */
    window(art, ctx) {
      const s = svgRoot(art);
      el(s, "rect", { x: 10, y: 8, width: 300, height: 164, rx: 6, class: "vf-panel2" });
      const title = el(s, "text", { x: 160, y: 19, class: "vf-text vf-mid vf-tiny vf-dim" }, "Blender");
      const areas = {
        view: el(s, "rect", { class: "vf-area" }), out: el(s, "rect", { class: "vf-area" }),
        prop: el(s, "rect", { class: "vf-area" }), time: el(s, "rect", { class: "vf-area" })
      };
      const labels = {
        view: el(s, "text", { class: "vf-text vf-small vf-mid" }, "3D Viewport"), out: el(s, "text", { class: "vf-text vf-tiny vf-mid" }, "Outliner"),
        prop: el(s, "text", { class: "vf-text vf-tiny vf-mid" }, "Properties"), time: el(s, "text", { class: "vf-text vf-tiny vf-mid" }, "Timeline")
      };
      const cube = el(s, "path", { class: "vf-cube" });
      const handle = el(s, "rect", { width: 4, height: 30, rx: 2, class: "vf-handle" });
      const order = ["view", "out", "prop", "time"];
      const file = ((ctx.lesson.youMake.match(/BLENDER_\w+\.blend/) || [""])[0]);
      return {
        update(p) {
          const split = 228 - 26 * Math.sin(seg(p, 0.62, 0.84) * Math.PI) * (p < 0.73 ? 1 : 0.6) - (p >= 0.73 ? 16 * ease(p, 0.73, 0.84) : 0);
          const set = (r, x, y, w, h) => { r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", h); };
          set(areas.view, 14, 26, split - 16, 112); set(areas.out, split + 2, 26, 304 - split, 40);
          set(areas.prop, split + 2, 70, 304 - split, 68); set(areas.time, 14, 142, 292, 26);
          labels.view.setAttribute("x", (14 + split) / 2); labels.view.setAttribute("y", 128);
          labels.out.setAttribute("x", (split + 306) / 2); labels.out.setAttribute("y", 49);
          labels.prop.setAttribute("x", (split + 306) / 2); labels.prop.setAttribute("y", 107);
          labels.time.setAttribute("x", 160); labels.time.setAttribute("y", 158);
          const cx = (14 + split) / 2, cy = 76;
          cube.setAttribute("d", `M${cx} ${cy - 20} l20 10 v22 l-20 10 l-20 -10 v-22 z M${cx} ${cy - 20} v0 M${cx - 20} ${cy - 10} l20 10 l20 -10 M${cx} ${cy} v22`);
          handle.setAttribute("x", split - 2); handle.setAttribute("y", 67);
          handle.classList.toggle("is-on", p >= 0.62 && p < 0.86);
          order.forEach((k, i) => {
            const lit = p >= 0.04 + i * 0.13 && p < 0.6 ? p < 0.04 + (i + 1) * 0.13 || p >= 0.56 : p >= 0.6;
            areas[k].classList.toggle("is-on", p >= 0.04 + i * 0.13 && p < 0.04 + (i + 1) * 0.13);
            labels[k].classList.toggle("is-on", lit || p >= 0.56);
          });
          title.textContent = p >= 0.86 ? file : "Blender 5.2 LTS";
        }
      };
    },

    /* Lesson 22: easing in the Graph Editor. */
    graph(art) {
      const s = svgRoot(art);
      el(s, "rect", { x: 10, y: 10, width: 190, height: 160, rx: 6, class: "vf-panel" });
      el(s, "text", { x: 20, y: 26, class: "vf-text vf-tiny vf-dim" }, "Graph Editor");
      for (let i = 0; i < 5; i++) el(s, "line", { x1: 24, x2: 190, y1: 40 + i * 30, y2: 40 + i * 30, class: "vf-gridline" });
      el(s, "path", { d: "M28 152 C 90 152, 120 44, 186 44", class: "vf-curve-wk" });
      el(s, "path", { d: "M28 152 L 186 44", class: "vf-curve-accent" });
      el(s, "text", { x: 34, y: 62, class: "vf-text vf-tiny vf-wk" }, "Curved: eases in and out");
      el(s, "text", { x: 128, y: 140, class: "vf-text vf-tiny vf-accent" }, "Linear: one speed");
      const dot1 = el(s, "circle", { r: 4.5, class: "vf-dot-wk" }), dot2 = el(s, "circle", { r: 4.5, class: "vf-dot-accent" });
      const easeP = (t) => smooth(t);
      el(s, "rect", { x: 212, y: 10, width: 98, height: 160, rx: 6, class: "vf-panel" });
      const shirtG = el(s, "g", {});
      el(shirtG, "path", { d: "M-14 -14 l8 -4 q6 5 12 0 l8 4 l8 9 l-7 5 l-4 -3 v23 h-26 v-23 l-4 3 l-7 -5 z", class: "vf-fill-wk" });
      el(s, "line", { x1: 222, x2: 300, y1: 112, y2: 112, class: "vf-gridline" });
      const turn = el(s, "g", { transform: "translate(261 146)" });
      el(turn, "ellipse", { cx: 0, cy: 0, rx: 30, ry: 9, class: "vf-panel2" });
      const marker = el(turn, "circle", { r: 4, class: "vf-dot-accent" });
      return {
        update(p) {
          const t = seg(p, 0.08, 0.88);
          const e = easeP(t);
          const pt = (k) => {
            const u = k;
            const x = Math.pow(1 - u, 3) * 28 + 3 * Math.pow(1 - u, 2) * u * 90 + 3 * (1 - u) * u * u * 120 + Math.pow(u, 3) * 186;
            const y = Math.pow(1 - u, 3) * 152 + 3 * Math.pow(1 - u, 2) * u * 152 + 3 * (1 - u) * u * u * 44 + Math.pow(u, 3) * 44;
            return [x, y];
          };
          const [x1, y1] = pt(t);
          dot1.setAttribute("cx", x1.toFixed(1)); dot1.setAttribute("cy", y1.toFixed(1));
          dot2.setAttribute("cx", (28 + 158 * t).toFixed(1)); dot2.setAttribute("cy", (152 - 108 * t).toFixed(1));
          shirtG.setAttribute("transform", `translate(261 ${(30 + 64 * e).toFixed(1)})`);
          const a = t * Math.PI * 2;
          marker.setAttribute("cx", (Math.cos(a) * 26).toFixed(1)); marker.setAttribute("cy", (Math.sin(a) * 7).toFixed(1));
        }
      };
    },

    /* Lesson 24: frames become a video. */
    frames(art) {
      const s = svgRoot(art);
      const strip = el(s, "g", {});
      const frames = [];
      for (let i = 0; i < 8; i++) {
        const g = el(strip, "g", {});
        el(g, "rect", { x: 0, y: 0, width: 30, height: 40, rx: 3, class: "vf-panel" });
        el(g, "ellipse", { cx: 15, cy: 26, rx: 9, ry: 7, class: "vf-fill-wk" });
        el(g, "ellipse", { cx: 15 + Math.sin(i / 8 * Math.PI * 2) * 7, cy: 31, rx: 6, ry: 2.4, class: "vf-fill-wk" });
        frames.push(g);
      }
      const phone = el(s, "g", {});
      el(phone, "rect", { x: 228, y: 12, width: 72, height: 128, rx: 10, class: "vf-panel2" });
      el(phone, "rect", { x: 234, y: 20, width: 60, height: 106, rx: 4, class: "vf-panel" });
      const big = el(phone, "ellipse", { cx: 264, cy: 82, rx: 18, ry: 15, class: "vf-fill-wk" });
      const brim = el(phone, "ellipse", { cx: 264, cy: 94, rx: 12, ry: 4, class: "vf-fill-wk" });
      el(s, "text", { x: 264, y: 156, class: "vf-text vf-mid vf-small" }, "MP4 · 1080 by 1920");
      el(s, "text", { x: 92, y: 156, class: "vf-text vf-mid vf-tiny vf-dim" }, "30 frames per second");
      const play = el(phone, "path", { d: "M258 40 l12 7 l-12 7 z", class: "vf-fill-accent" });
      return {
        update(p) {
          const flow = seg(p, 0.04, 0.7);
          frames.forEach((g, i) => {
            const x = 14 + i * 34 + flow * 240;
            const inPhone = x > 200;
            g.setAttribute("transform", `translate(${Math.min(x, 230).toFixed(1)} 60) scale(${inPhone ? 0.0001 : 1})`);
          });
          const spin = (p * 3) % 1;
          brim.setAttribute("cx", (264 + Math.sin(spin * Math.PI * 2) * 9).toFixed(1));
          play.style.opacity = String(ease(p, 0.7, 0.78));
          big.style.opacity = brim.style.opacity = String(0.4 + 0.6 * ease(p, 0.2, 0.7));
        }
      };
    },

    /* Lesson 26: export to the web. */
    export(art) {
      const s = svgRoot(art);
      const capG = el(s, "g", {});
      el(capG, "path", { d: "M-26 6 a26 24 0 0 1 52 0 z", class: "vf-fill-wk" });
      el(capG, "path", { d: "M18 6 q22 0 30 8 q-16 2 -40 -2 z", class: "vf-fill-wk" });
      const file = el(s, "g", {});
      el(file, "path", { d: "M-16 -20 h22 l10 10 v30 h-32 z", class: "vf-paper" });
      el(file, "text", { x: 0, y: 8, class: "vf-text vf-mid vf-small vf-dark" }, ".glb");
      const win = el(s, "g", {});
      el(win, "rect", { x: 178, y: 26, width: 132, height: 128, rx: 8, class: "vf-panel" });
      el(win, "rect", { x: 178, y: 26, width: 132, height: 18, rx: 8, class: "vf-panel2" });
      el(win, "circle", { cx: 190, cy: 35, r: 3, class: "vf-dot-dim" });
      el(win, "circle", { cx: 200, cy: 35, r: 3, class: "vf-dot-dim" });
      el(win, "rect", { x: 212, y: 31, width: 88, height: 8, rx: 4, class: "vf-panel" });
      const webCap = el(win, "g", {});
      el(webCap, "path", { d: "M-22 5 a22 20 0 0 1 44 0 z", class: "vf-fill-wk" });
      el(webCap, "path", { d: "M15 5 q19 0 26 7 q-14 2 -34 -2 z", class: "vf-fill-wk" });
      return {
        update(p) {
          const shrink = ease(p, 0.08, 0.3), fly = ease(p, 0.3, 0.62), open = ease(p, 0.62, 0.74);
          capG.setAttribute("transform", `translate(70 92) scale(${(1 - shrink * 0.999).toFixed(3)})`);
          const x = lerp(70, 244, fly), y = lerp(92, 96, fly) - Math.sin(fly * Math.PI) * 60;
          file.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(shrink * (1 - open)).toFixed(3) || 0.0001})`);
          const spin = Math.cos(((p - 0.74) / 0.26) * Math.PI * 2);
          webCap.setAttribute("transform", `translate(244 100) scale(${(open * (p > 0.74 ? spin : 1)).toFixed(3)} ${open.toFixed(3)})`);
        }
      };
    },

    /* Lesson 28: the three output files. */
    outputs(art) {
      const s = svgRoot(art);
      const cards = [
        { x: 18, w: 84, h: 84, name: "BLENDER_Final_v1.png", size: "1080 by 1080" },
        { x: 124, w: 62, h: 110, name: "BLENDER_Final_v1.mp4", size: "1080 by 1920" },
        { x: 208, w: 94, h: 84, name: "BLENDER_Final_v1.glb", size: "under 10 MB" }
      ].map((c, i) => {
        const g = el(s, "g", {});
        el(g, "rect", { x: c.x, y: 132 - c.h, width: c.w, height: c.h, rx: 6, class: "vf-panel" });
        if (i === 0) el(g, "ellipse", { cx: c.x + c.w / 2, cy: 132 - c.h / 2, rx: 20, ry: 16, class: "vf-fill-wk" });
        if (i === 1) { el(g, "ellipse", { cx: c.x + c.w / 2, cy: 132 - c.h / 2, rx: 16, ry: 14, class: "vf-fill-wk" }); el(g, "path", { d: `M${c.x + c.w / 2 - 5} ${132 - c.h + 14} l10 6 l-10 6 z`, class: "vf-fill-accent" }); }
        if (i === 2) el(g, "path", { d: `M${c.x + 47} ${72} l22 11 v24 l-22 11 l-22 -11 v-24 z M${c.x + 25} ${83} l22 11 l22 -11 M${c.x + 47} ${94} v24`, class: "vf-cube-wk" });
        el(g, "text", { x: c.x + c.w / 2, y: 148, class: "vf-text vf-mid vf-tiny" }, c.name);
        el(g, "text", { x: c.x + c.w / 2, y: 160, class: "vf-text vf-mid vf-tiny vf-dim" }, c.size);
        const tick = el(g, "path", { d: `M${c.x + c.w - 16} ${132 - c.h + 12} l4 4 l8 -8`, class: "vf-tick" });
        return { g, tick };
      });
      return {
        update(p) {
          cards.forEach((c, i) => {
            const k = backOut(seg(p, 0.06 + i * 0.22, 0.2 + i * 0.22));
            c.g.style.opacity = String(clamp01(k));
            c.g.setAttribute("transform", `translate(0 ${((1 - clamp01(k)) * 14).toFixed(1)})`);
            c.tick.style.opacity = String(ease(p, 0.2 + i * 0.22, 0.26 + i * 0.22));
          });
        }
      };
    },

    /* Lesson 29: the standard, then the certificate. */
    certificate(art) {
      const s = svgRoot(art);
      const labels = (C.standard || []).map((x) => x.short);
      const rows = labels.map((t, i) => {
        const y = 22 + i * 16;
        const box = el(s, "rect", { x: 16, y: y - 9, width: 11, height: 11, rx: 2.5, class: "vf-box" });
        const tick = el(s, "path", { d: `M18.5 ${y - 3.5} l2.5 2.5 l5 -5`, class: "vf-tick" });
        el(s, "text", { x: 34, y, class: "vf-text vf-small" }, t);
        return { box, tick };
      });
      const cert = el(s, "g", {});
      el(cert, "rect", { x: 150, y: 24, width: 156, height: 124, rx: 8, class: "vf-paper" });
      el(cert, "rect", { x: 157, y: 31, width: 142, height: 110, rx: 5, class: "vf-paper-line" });
      el(cert, "text", { x: 228, y: 56, class: "vf-text vf-mid vf-dark vf-small vf-caps" }, "Certificate of completion");
      el(cert, "rect", { x: 182, y: 70, width: 92, height: 4, rx: 2, class: "vf-paper-ink" });
      el(cert, "rect", { x: 194, y: 80, width: 68, height: 3, rx: 1.5, class: "vf-paper-ink2" });
      el(cert, "text", { x: 228, y: 104, class: "vf-text vf-mid vf-dark vf-tiny" }, "Issued by Zedlab and Claude");
      const seal = el(cert, "g", { transform: "translate(276 124)" });
      el(seal, "circle", { r: 13, class: "vf-fill-accent" });
      el(seal, "path", { d: "M0 -7 l2 4.4 4.8 .5 -3.6 3.2 1 4.7 -4.2 -2.4 -4.2 2.4 1 -4.7 -3.6 -3.2 4.8 -.5z", class: "vf-fill-dark" });
      return {
        update(p) {
          rows.forEach((r, i) => {
            const on = p >= 0.04 + i * 0.065;
            r.tick.style.opacity = on ? "1" : "0";
            r.box.classList.toggle("is-on", on);
          });
          const k = backOut(seg(p, 0.66, 0.8));
          cert.style.opacity = String(clamp01(k * 1.2));
          cert.setAttribute("transform", `translate(0 ${((1 - clamp01(k)) * 20).toFixed(1)})`);
          seal.setAttribute("transform", `translate(276 124) scale(${backOut(seg(p, 0.8, 0.9)).toFixed(3)})`);
        }
      };
    }
  };

  /* ---------- What other pages use ---------- */

  window.CourseVisuals = {
    mount, unmount, unmountAll,
    scenes: { solid: Object.keys(SOLID), flat: Object.keys(FLAT) },
    glSupported: () => glSupported,
    setForceStill(v) { forceStill = !!v; chooseActive(); },
    setForceFlat(v) {
      forceFlat = !!v;
      deactivate();
      items.forEach((it) => {
        if (it.kind !== "solid") return;
        it.art.innerHTML = "";
        showSavedStill(it);
      });
      chooseActive();
    },
    activeLesson: () => (active ? active.lessonNumber : null),
    thumbUrl, stillUrl,
    caption: (n) => { const s = specFor(n); return s ? s.caption : ""; },
    stillCount: () => Array.from(items).filter((it) => it.kind === "solid" && it.stillDone).length
  };
})();

/*
  Zedlab Blender Course: the 3D world behind every screen, like a Blender viewport.

  - One fixed picture behind the page: a black world (white in the light look), Blender's floor grid
    fading into the distance, the red X line and the green Y line.
  - When the opening ends, the grid fades in while the camera moves forward.
  - The camera moves with you:
      the tabs pan sideways, in tab order;
      the Map rises to a view from the top, with the 29 lessons as faint points of light, all alike
      (the page itself marks the next lesson with its orange ring);
      opening a lesson moves the camera in, closing it moves the camera back out.
  - "I did it" drops small orange cubes that bounce for about a second.
  - Every camera move takes at most 0.6 seconds, ends with a small spring, and can be interrupted.
    The page never waits for it: the words show at once.
  - It only draws while something moves, and stops when the app is not on screen.
    Sharpness is capped at 1.5 times, to keep phones cool.
  - With "reduce motion" switched on, it only fades. Without 3D, the page is plain black (or white).
  - 3D uses three.js (vendor/three), the same copy the lesson pictures use.
*/
(function () {
  "use strict";

  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const asset = (path) => new URL(path, SCRIPT_URL).href;
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const laptopMQ = window.matchMedia("(min-width: 960px)");

  /* ---------- Settings ---------- */

  const MAX_RATIO = 1.5;          /* sharpness cap */
  const MOVE_MAX = 560;           /* ms: every camera move lands by then (a late frame still keeps it under 0.6 s) */
  const OMEGA = 14, ZETA = 0.72;  /* the spring: quick, eases out, overshoots a touch */
  const FOV = 50;
  /* Sideways distance between two tabs. Small enough that even a long jump never slides the grid more than
     about half a square per frame, so the grid never seems to stand still or run backwards. */
  const STEP_PHONE = 1.0, STEP_LAPTOP = 0.6;
  const EYE = { y: 2.4, z: 6.6, pitch: -0.38 };      /* the usual view: a little above the floor, looking ahead and down */
  const LESSON = { y: 1.3, z: 3.9, pitch: -0.3 };    /* a lesson: closer in */
  /* The lesson points, seen from the top: centred on the spot the usual view looks at, so the Map is a crane shot
     straight up; the red X line runs between week 3 and week 4. */
  const MAP_Z = 0.1, ROW = 1.0, COL = 0.6;
  const INTRO = { y: 0.9, z: 3.2, ms: 600 };
  /* Tab order. On a phone, Progress, My work, Certificate and Settings sit under "Me". */
  const ORDER_PHONE = { setup: 0, today: 0, calendar: 1, map: 2, toolbox: 3, me: 4, progress: 4, work: 4, certificate: 4, settings: 4 };
  const ORDER_LAPTOP = { setup: 0, today: 0, calendar: 1, map: 2, toolbox: 3, me: 4, progress: 4, work: 5, certificate: 6, settings: 7 };
  const KEYS = ["x", "y", "z", "pitch", "pts"];

  /* ---------- State ---------- */

  let T = null, renderer = null, canvas = null, scene = null, camera = null;
  let grid = null, gridMat = null, dots = null, dotsMat = null, colours = null;
  let status = "loading";          /* loading, ready or off */
  let place = "today", lastTabX = 0, lessons = [];
  const cur = {}, vel = {}, tgt = {};
  KEYS.forEach((k) => { cur[k] = 0; vel[k] = 0; tgt[k] = 0; });
  let moving = false, moveStart = 0, looping = false, lastT = 0;
  const fade = { v: 0, from: 0, to: 0, t0: 0, ms: 0, busy: false, then: null };
  let introWanted = false, introDone = false;
  let fall = null;                 /* the falling cubes, while they fall */
  const stats = { frames: 0, moves: 0, lastMoveMs: 0, drops: 0, loopStarts: 0 };

  /* Can this device draw 3D? (three.js needs WebGL 2.) Asked just after the app has opened, never while the
     opening screen is waiting, and the test context is let go at once. */
  const canDraw3D = () => {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return false;
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  };

  /* ---------- Colours (from the stylesheet, so the light look works too) ---------- */

  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  function readColours() {
    const v3 = (css, fallback) => {
      const c = new T.Color();
      try { c.setStyle(css || fallback); } catch (e) { c.setStyle(fallback); }
      const o = { r: 0, g: 0, b: 0 };
      c.getRGB(o, T.SRGBColorSpace);
      return new T.Vector3(o.r, o.g, o.b);
    };
    const num = (css, fallback) => { const n = parseFloat(css); return Number.isFinite(n) ? n : fallback; };
    return {
      world: new T.Color(tok("--scene-world") || "#000000"),
      line: v3(tok("--scene-line"), "#FFFFFF"), lineA: num(tok("--scene-line-alpha"), 0.1),
      axisX: v3(tok("--scene-axis-x"), "#A33E3E"), axisY: v3(tok("--scene-axis-y"), "#5E8C2E"), axisA: num(tok("--scene-axis-alpha"), 0.8),
      point: v3(tok("--scene-point"), "#FFFFFF"),
      cube: new T.Color(tok("--scene-cube") || "#F08A24")
    };
  }

  /* ---------- The floor grid: drawn in one pass, with smooth lines that fade with distance ---------- */

  const GRID_VERTEX = `
    varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const GRID_FRAGMENT = `
    uniform vec3 uLine, uAxisX, uAxisY, uCam;
    uniform float uLineA, uAxisA, uOpacity, uNear, uFar, uPx;
    varying vec3 vWorld;
    /* How much of a grid line covers this pixel. Cells that get tiny far away fade out instead of flickering. */
    float lines(vec2 p, float halfWidth) {
      vec2 d = max(fwidth(p), vec2(1e-5));
      vec2 g = abs(fract(p - 0.5) - 0.5) / d;
      float cover = clamp(halfWidth + 0.5 - min(g.x, g.y), 0.0, 1.0);
      return cover * smoothstep(3.0, 10.0, 1.0 / max(d.x, d.y));
    }
    void main() {
      vec2 p = vWorld.xz;
      float hw = 0.55 * uPx;
      vec4 c = vec4(uLine, max(lines(p, hw), lines(p / 10.0, hw) * 1.7) * uLineA);
      vec2 d = max(fwidth(p), vec2(1e-5));
      float ax = clamp(hw * 1.5 + 0.5 - abs(p.y) / d.y, 0.0, 1.0);  /* the red X line */
      float ay = clamp(hw * 1.5 + 0.5 - abs(p.x) / d.x, 0.0, 1.0);  /* the green Y line */
      c = mix(c, vec4(uAxisX, uAxisA), ax);
      c = mix(c, vec4(uAxisY, uAxisA), ay);
      float far = 1.0 - smoothstep(uNear, uFar, distance(vWorld, uCam));
      gl_FragColor = vec4(c.rgb, c.a * far * uOpacity);
    }`;

  /* ---------- The lesson points on the Map ---------- */

  const DOT_VERTEX = `
    attribute float aSize;
    attribute vec4 aColour;
    uniform float uPx;
    varying vec4 vColour;
    void main() {
      vColour = aColour;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPx;
    }`;
  const DOT_FRAGMENT = `
    uniform float uOpacity;
    varying vec4 vColour;
    void main() {
      /* a soft glow with no hard edge, so a point behind a line of words never looks like a full stop */
      float r = length(gl_PointCoord - 0.5) * 2.0;
      float a = pow(max(0.0, 1.0 - r), 1.8) * vColour.a * uOpacity;
      if (a < 0.004) discard;
      gl_FragColor = vec4(vColour.rgb, a);
    }`;

  /* ---------- Starting up ---------- */

  function start3D() {
    if (!canDraw3D()) { status = "off"; return; }
    import(asset("../vendor/three/three.module.min.js")).then((m) => {
      T = m;
      try { build(); } catch (e) { tearDown(); return; }
      status = "ready";
      snapAll();
      apply();
      draw();
      if (introWanted) runIntro();
      /* If nobody asks for the opening (no opening screen), the grid still appears. */
      setTimeout(() => { if (!introDone) runIntro(); }, 4000);
    }).catch(() => { status = "off"; });
  }

  function build() {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    canvas = renderer.domElement;
    canvas.className = "bg-scene";
    canvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); canvas.hidden = true; });
    canvas.addEventListener("webglcontextrestored", () => { canvas.hidden = false; settleNow(); });
    document.body.insertBefore(canvas, document.body.firstChild);

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 80);
    colours = readColours();

    gridMat = new T.ShaderMaterial({
      vertexShader: GRID_VERTEX, fragmentShader: GRID_FRAGMENT, transparent: true, depthWrite: false,
      uniforms: {
        uLine: { value: colours.line }, uAxisX: { value: colours.axisX }, uAxisY: { value: colours.axisY },
        uLineA: { value: colours.lineA }, uAxisA: { value: colours.axisA }, uOpacity: { value: 0 },
        uCam: { value: new T.Vector3() }, uNear: { value: 6 }, uFar: { value: 20 }, uPx: { value: renderer.getPixelRatio() }
      }
    });
    const plane = new T.PlaneGeometry(1, 1);
    plane.rotateX(-Math.PI / 2);
    grid = new T.Mesh(plane, gridMat);
    grid.scale.set(240, 1, 240);
    grid.frustumCulled = false;
    scene.add(grid);

    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(29 * 3), 3));
    geo.setAttribute("aSize", new T.Float32BufferAttribute(new Float32Array(29), 1));
    geo.setAttribute("aColour", new T.Float32BufferAttribute(new Float32Array(29 * 4), 4));
    dotsMat = new T.ShaderMaterial({
      vertexShader: DOT_VERTEX, fragmentShader: DOT_FRAGMENT, transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 0 }, uPx: { value: renderer.getPixelRatio() } }
    });
    dots = new T.Points(geo, dotsMat);
    dots.frustumCulled = false;
    dots.renderOrder = 1;
    scene.add(dots);
    layoutDots();
  }

  function tearDown() {
    stop();
    if (fall) endFall(true);
    if (grid) { grid.geometry.dispose(); gridMat.dispose(); }
    if (dots) { dots.geometry.dispose(); dotsMat.dispose(); }
    if (renderer) { renderer.dispose(); if (canvas && canvas.parentNode) canvas.remove(); }
    renderer = null; canvas = null; scene = null; grid = null; dots = null;
    status = "off";
  }

  /* ---------- Where the camera goes ---------- */

  function order() { return laptopMQ.matches ? ORDER_LAPTOP : ORDER_PHONE; }
  function step() { return laptopMQ.matches ? STEP_LAPTOP : STEP_PHONE; }

  /* High enough, from the top, to see all the lesson points on this screen's shape. */
  function mapHeight() {
    const tanHalf = Math.tan((FOV / 2) * Math.PI / 180), aspect = camera ? camera.aspect : window.innerWidth / window.innerHeight;
    return Math.max(3.1 / tanHalf, 1.6 / (tanHalf * aspect));
  }

  function viewFor(p) {
    const o = order();
    if (p === "map") return { x: o.map * step(), y: mapHeight(), z: MAP_Z, pitch: -Math.PI / 2, pts: 1 };
    if (p === "lesson") return { x: lastTabX, y: LESSON.y, z: LESSON.z, pitch: LESSON.pitch, pts: 0 };
    return { x: (o[p] != null ? o[p] : 0) * step(), y: EYE.y, z: EYE.z, pitch: EYE.pitch, pts: 0 };
  }

  function go(p) {
    place = p || "today";
    const v = viewFor(place);
    if (place !== "lesson") lastTabX = v.x;
    setTarget(v);
  }

  function setTarget(v) {
    const changed = KEYS.some((k) => Math.abs(tgt[k] - v[k]) > 1e-4);
    KEYS.forEach((k) => { tgt[k] = v[k]; });
    if (status !== "ready" || !introDone) { snapAll(); return; }
    if (!changed) return;
    if (reduceMQ.matches) { fadeSwap(); return; }
    moving = true;
    moveStart = performance.now();
    stats.moves++;
    run();
  }

  function snapAll() { KEYS.forEach((k) => { cur[k] = tgt[k]; vel[k] = 0; }); }

  /* The spring: each value is pulled to its target and slowed down, so it eases out with a small overshoot.
     A new target simply changes where it is pulled to, so a move can be interrupted at any time. */
  function stepSprings(dt) {
    if (!moving) return false;
    const steps = Math.max(1, Math.ceil(dt / 0.004)), h = dt / steps;
    for (let s = 0; s < steps; s++) {
      KEYS.forEach((k) => {
        vel[k] += (-OMEGA * OMEGA * (cur[k] - tgt[k]) - 2 * ZETA * OMEGA * vel[k]) * h;
        cur[k] += vel[k] * h;
      });
    }
    const near = KEYS.every((k) => Math.abs(cur[k] - tgt[k]) < 1e-3 && Math.abs(vel[k]) < 1e-2);
    const elapsed = performance.now() - moveStart;
    /* land on the last frame before 0.56 s (by then the spring is already within a hair of its place) */
    if (near || elapsed + Math.max(dt * 1000, 8) >= MOVE_MAX) {
      snapAll();
      moving = false;
      stats.lastMoveMs = Math.round(elapsed);
    }
    return true;
  }

  /* ---------- Fades (the opening, and every change when "reduce motion" is on) ---------- */

  function fadeTo(to, ms, then) {
    Object.assign(fade, { from: fade.v, to, t0: performance.now(), ms, busy: true, then: then || null });
    run();
  }
  function stepFade(now) {
    if (!fade.busy) return false;
    const k = fade.ms ? Math.min(1, (now - fade.t0) / fade.ms) : 1;
    fade.v = fade.from + (fade.to - fade.from) * (1 - Math.pow(1 - k, 3));
    if (k >= 1) { fade.busy = false; const then = fade.then; fade.then = null; if (then) then(); }
    return true;
  }
  function fadeSwap() {
    if (fade.busy && fade.to === 0) return; /* already fading out: it lands on the newest place */
    fadeTo(0, 140, () => { snapAll(); fadeTo(1, 200); });
  }

  function intro() { introWanted = true; if (status === "ready") runIntro(); }
  function runIntro() {
    if (introDone || status !== "ready") return;
    introDone = true;
    snapAll();
    if (!reduceMQ.matches) {
      cur.y += INTRO.y; cur.z += INTRO.z;
      moving = true; moveStart = performance.now(); stats.moves++;
    }
    fadeTo(1, reduceMQ.matches ? 400 : INTRO.ms);
  }

  /* ---------- Drawing, only while something moves ---------- */

  function apply() {
    if (!camera) return;
    camera.position.set(cur.x, cur.y, cur.z);
    camera.rotation.set(cur.pitch, 0, 0);
    grid.position.set(Math.round(cur.x), 0, Math.round(cur.z));
    const u = gridMat.uniforms;
    u.uCam.value.copy(camera.position);
    u.uNear.value = 4 + cur.y * 0.9;
    u.uFar.value = u.uNear.value + 13;
    u.uOpacity.value = fade.v;
    dotsMat.uniforms.uOpacity.value = Math.max(0, Math.min(1, cur.pts)) * fade.v;
  }

  function draw() {
    if (!renderer) return;
    if (fall) {
      renderer.setClearColor(0x000000, 0);
      renderer.render(fall.scene, fall.camera);
    } else {
      renderer.setClearColor(colours.world, 1);
      renderer.render(scene, camera);
    }
    stats.frames++;
  }

  function frame() {
    const now = performance.now();
    const dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000));
    lastT = now;
    stepSprings(dt);
    stepFade(now);
    if (fall) stepFall(now);
    apply();
    draw();
    if (!moving && !fade.busy && !fall) stop(); /* nothing left to move: stop drawing */
  }

  function run() {
    if (looping || status !== "ready" || document.hidden) return;
    looping = true;
    stats.loopStarts++;
    lastT = performance.now();
    renderer.setAnimationLoop(frame);
  }
  function stop() {
    looping = false;
    if (renderer) renderer.setAnimationLoop(null);
  }
  function drawOnce() {
    if (status !== "ready" || looping) return;
    apply();
    draw();
  }

  /* Back on screen, or the picture was lost and restored: everything jumps to where it should be. */
  function settleNow() {
    if (status !== "ready") return;
    stop();
    if (moving) { snapAll(); moving = false; }
    if (fade.busy) {
      /* a fade out that was going to swap places ends faded in at the new place */
      const swap = !!fade.then;
      fade.busy = false; fade.then = null;
      if (swap) snapAll();
      fade.v = swap ? 1 : fade.to;
    }
    if (fall) endFall(true);
    drawOnce();
  }

  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else settleNow(); });

  window.addEventListener("resize", () => {
    if (status !== "ready") return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    gridMat.uniforms.uPx.value = dotsMat.uniforms.uPx.value = renderer.getPixelRatio();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (fall) fitFallCamera();
    const v = viewFor(place);
    if (place !== "lesson") lastTabX = v.x;
    KEYS.forEach((k) => { tgt[k] = v[k]; });
    if (!moving) snapAll();
    layoutDots();
    drawOnce();
  });

  function theme() {
    if (status !== "ready") return;
    colours = readColours();
    const u = gridMat.uniforms;
    u.uLine.value = colours.line; u.uAxisX.value = colours.axisX; u.uAxisY.value = colours.axisY;
    u.uLineA.value = colours.lineA; u.uAxisA.value = colours.axisA;
    layoutDots();
    drawOnce();
  }

  /* ---------- The 29 lesson points: one row per week, snaking like the course map ---------- */

  function setLessons(list) {
    lessons = Array.isArray(list) ? list.slice(0, 29) : [];
    if (status === "ready") { layoutDots(); drawOnce(); }
  }

  function layoutDots() {
    if (!dots || !colours) return;
    const geo = dots.geometry, pos = geo.attributes.position, size = geo.attributes.aSize, col = geo.attributes.aColour;
    const x0 = order().map * step();
    const byWeek = {};
    lessons.forEach((l) => { (byWeek[l.week] = byWeek[l.week] || []).push(l); });
    for (let i = 0; i < 29; i++) { size.setX(i, 0); col.setXYZW(i, 0, 0, 0, 0); pos.setXYZ(i, x0, 0, MAP_Z); }
    let i = 0;
    Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach((w) => {
      const row = byWeek[w], m = row.length;
      row.forEach((l, k) => {
        if (i >= 29) return;
        const kk = w % 2 === 0 ? m - 1 - k : k;
        pos.setXYZ(i, x0 + (kk - (m - 1) / 2) * COL, 0, MAP_Z + (w - 3.5) * ROW);
        const c = colours.point; /* all 29 alike: one faint white (one faint grey in the light look) */
        col.setXYZW(i, c.x, c.y, c.z, 0.3);
        size.setX(i, 22);
        i++;
      });
    });
    pos.needsUpdate = size.needsUpdate = col.needsUpdate = true;
  }

  /* ---------- "I did it": small orange cubes drop and bounce, for about a second ---------- */
  /*
    The cubes fall in front of the page, so for that second the picture moves to the top layer
    (taps still pass through) and draws only the cubes. Then it goes back behind the page.
  */
  const FALL = { ms: 1150, shrinkFrom: 920, gravity: 52, bounce: 0.36, camZ: 12, fov: 40 };

  function fitFallCamera() {
    const f = fall;
    f.camera.aspect = window.innerWidth / window.innerHeight;
    f.camera.updateProjectionMatrix();
    f.halfH = FALL.camZ * Math.tan((FALL.fov / 2) * Math.PI / 180);
    f.halfW = f.halfH * f.camera.aspect;
  }

  function drop(big) {
    if (status !== "ready" || reduceMQ.matches || document.hidden) return false;
    if (fall) endFall(true);
    const n = big ? 26 : 14;
    const fScene = new T.Scene();
    const fCamera = new T.PerspectiveCamera(FALL.fov, window.innerWidth / window.innerHeight, 0.1, 50);
    fCamera.position.set(0, 0, FALL.camZ);
    const geo = new T.BoxGeometry(1, 1, 1);
    const mat = new T.MeshLambertMaterial({ color: colours.cube });
    const mesh = new T.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    const sky = new T.HemisphereLight(0xffffff, 0x3a2a1a, 1.5);
    const sun = new T.DirectionalLight(0xffffff, 2.4);
    sun.position.set(3, 6, 8);
    fScene.add(mesh, sky, sun);
    fall = { scene: fScene, camera: fCamera, mesh, geo, mat, t0: performance.now(), last: performance.now(), cubes: [], halfH: 1, halfW: 1,
      tmp: { m: new T.Matrix4(), dq: new T.Quaternion(), e: new T.Euler(), pos: new T.Vector3(), sc: new T.Vector3() } };
    fitFallCamera();
    /* The cubes fall across the page (on a laptop, not over the left menu) and land just above the tab bar. */
    const W = window.innerWidth, H = window.innerHeight;
    const left = laptopMQ.matches ? 220 : 0;
    const floorPx = laptopMQ.matches ? H - 72 : H - 56 - 40;
    fall.floor = fall.halfH - (floorPx / H) * 2 * fall.halfH;
    const toX = (px) => ((px / W) * 2 - 1) * fall.halfW;
    for (let i = 0; i < n; i++) {
      const px = left + (W - left) * (0.08 + 0.84 * ((i + Math.random() * 0.8) / n));
      fall.cubes.push({
        s: 0.24 + Math.random() * 0.12,
        x: toX(px), y: fall.halfH + 0.35 + Math.random() * 0.9, z: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * 1.5, delay: Math.random() * 0.12,
        q: new T.Quaternion().setFromEuler(new T.Euler(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3)),
        spin: new T.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)
      });
    }
    canvas.classList.add("is-over");
    stats.drops++;
    stepFall(performance.now());
    run();
    if (!looping) { draw(); }
    return true;
  }

  function stepFall(now) {
    const f = fall;
    if (!f) return false;
    const t = (now - f.t0) / 1000, dt = Math.max(0, Math.min(0.05, (now - f.last) / 1000));
    f.last = now;
    if (now - f.t0 >= FALL.ms) { endFall(false); return true; }
    const { m, dq, e, pos, sc } = f.tmp;
    f.cubes.forEach((c, i) => {
      if (t >= c.delay) {
        c.vy -= FALL.gravity * dt;
        c.y += c.vy * dt;
        const bottom = f.floor + c.s / 2;
        if (c.y < bottom) {
          c.y = bottom;
          c.vy = Math.abs(c.vy) * FALL.bounce < 1.2 ? 0 : Math.abs(c.vy) * FALL.bounce;
          c.spin.multiplyScalar(0.55);
        }
        e.set(c.spin.x * dt, c.spin.y * dt, c.spin.z * dt);
        c.q.multiply(dq.setFromEuler(e));
      }
      const k = now - f.t0 > FALL.shrinkFrom ? Math.max(0, 1 - (now - f.t0 - FALL.shrinkFrom) / (FALL.ms - FALL.shrinkFrom)) : 1;
      const s = c.s * k * k;
      m.compose(pos.set(c.x, c.y, c.z), c.q, sc.set(s, s, s));
      f.mesh.setMatrixAt(i, m);
    });
    f.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  function endFall(quiet) {
    const f = fall;
    if (!f) return;
    fall = null;
    f.scene.remove(f.mesh);
    f.mesh.dispose();
    f.geo.dispose();
    f.mat.dispose();
    if (canvas) canvas.classList.remove("is-over");
    if (quiet) drawOnce();
  }

  /* ---------- What the app uses ---------- */

  window.CourseScene = {
    go, intro, drop, setLessons, theme,
    ready: () => status === "ready",
    /* How long until the camera has landed (ms), so other work can wait for it. */
    busyFor: () => (status === "ready" && looping ? Math.max(moving ? MOVE_MAX - (performance.now() - moveStart) : 0, fade.busy ? fade.ms - (performance.now() - fade.t0) : 0, fall ? FALL.ms - (performance.now() - fall.t0) : 0) : 0),
    /* For the check pages: what the scene is doing right now. */
    debug: () => ({
      status, place, introDone, looping, moving, fading: fade.busy, opacity: fade.v,
      falling: !!fall, cubes: fall ? fall.cubes.length : 0, over: !!(canvas && canvas.classList.contains("is-over")),
      camera: Object.assign({}, cur), target: Object.assign({}, tgt),
      ratio: renderer ? renderer.getPixelRatio() : 0, frames: stats.frames, moves: stats.moves, lastMoveMs: stats.lastMoveMs,
      drops: stats.drops, loopStarts: stats.loopStarts,
      points: lessons.length,
      /* how many different looks the lesson points have (all alike: 1) */
      pointLooks: dots ? new Set(Array.from({ length: lessons.length }, (_, i) => [0, 1, 2, 3].map((j) => dots.geometry.attributes.aColour.array[i * 4 + j].toFixed(3)).join() + "|" + dots.geometry.attributes.aSize.array[i])).size : 0,
      pointColour: dots && lessons.length ? Array.from(dots.geometry.attributes.aColour.array.slice(0, 4)).map((v) => +v.toFixed(3)) : null
    })
  };

  /* Start once the page has fully loaded: neither the opening screen nor the first screen waits for 3D. */
  if (document.readyState === "complete") setTimeout(start3D, 0);
  else window.addEventListener("load", () => setTimeout(start3D, 0), { once: true });
})();

/*
  Zedlab Blender Course: Pweza, the teacher.
  "Pweza" is Swahili for octopus. He is drawn from the Zedlab octopus logo: the same round head,
  the same body and the same six tentacles. The four middle tentacles sway; the two outer ones
  are his arms. Each arm is one smooth tentacle with a shoulder where it leaves the body and an
  elbow about halfway along. It bends in a round curve, keeps its thickness through the bend and
  narrows only towards a rounded tip. When he moves, the shoulder turns first and the elbow and the
  tip follow a moment later, settling softly (springs with a tiny overshoot).

  How to use (in the app):
    const p = Pweza.create(container, { mood: "today", size: 56, vars: { title, first, week } });
    p.setMood("done", { ... });   p.destroy();
  Moods, their lines and when they show are listed in MOODS below.

  No library: the browser's own animation tools, plus a small drawing loop for the arms that runs
  only while something moves. With "reduce motion" switched on he shows still poses only.
  Pweza himself is decoration (hidden from screen readers); his speech bubble is ordinary text.
*/
(function (root) {
  "use strict";

  /* ---------- The drawing (coordinates from Zedlab_octopus_logo.svg, 1920 x 1920) ---------- */

  const HEAD = { cx: 1238.6, cy: 568.8, r: 313.6 };
  const PIV = {
    leg2: [746, 1010], leg3: [893, 990], leg4: [1027, 990], leg5: [1174, 1010],
    head: [1080, 880], body: [960, 1665], all: [960, 1665], spin: [960, 960],
    eyes: [1238.6, 598], mouth: [1238.6, 738], gradcap: [1238.6, 300]
  };
  /* His eyes and glasses: arms and props must always stay clear of these (circles and points, with a margin) */
  const FACE = [[1125, 595, 112], [1352, 595, 112]]
    .concat([[1035, 580], [992, 570], [950, 560], [1442, 580], [1486, 568], [1530, 556]].map(([x, y]) => [x, y, 26]));

  const D = {
    mantle: "M924.97,760V839.68C762.38,848.06,626.23,915.24,529.64,1035.28L666.22,1072.84L825.56,1043.28L959.97,1015.54L1094.38,1043.28L1253.72,1072.84L1390.35,1035.28C1335.1,966.61,1266.89,915.25,1188.21,882.28L1249.17,882.17L1249.17,760Z",
    leg2: "M666.22,1072.84C607.63,1211.04,577.94,1409.96,577.94,1664.83H704.09C704.09,1413,733.46,1223.61,791.39,1101.93C801.98,1079.68,813.38,1060.14,825.56,1043.28L825.56,980L666.22,1000Z",
    leg3: "M825.56,1043.28C824.31,1050.27,823.09,1057.44,821.9,1064.86C800.54,1198.36,789.71,1400.22,789.71,1664.83H915.86C915.86,1269.65,940.52,1093.22,959.97,1015.54L959.97,960L825.56,980Z",
    leg4: "M959.97,1015.54C979.43,1093.23,1004.08,1269.65,1004.08,1664.83H1130.23C1130.23,1400.21,1119.4,1198.35,1098.04,1064.86C1096.85,1057.44,1095.63,1050.27,1094.38,1043.28L1094.38,980L959.97,960Z",
    leg5: "M1094.38,1043.28C1106.56,1060.14,1117.96,1079.69,1128.55,1101.93C1186.47,1223.6,1215.85,1412.99,1215.85,1664.83H1342C1342,1409.96,1312.31,1211.04,1253.72,1072.84L1253.72,1000L1094.38,980Z"
  };

  /* ---------- The arms: one smooth tentacle each ---------- */
  /*
    An arm is drawn along a centre line that starts inside the body (hidden behind it) and runs out
    through the shoulder. Its direction is the shoulder angle s, turns round the elbow to the forearm
    angle e, and the last part can curl by c. Angles are in degrees, 0 = pointing right, 90 = down.
    At rest the numbers below reproduce the logo's outer tentacles (fitted to within about 4 units).
  */
  const ARM = {
    LEN: 651, ELBOW_REST: 240, ELBOW_UP: 326, W: 126, W_TIP_UP: 72, EXT: 70, N: 44, CURL: 170,
    R: { root: [1322.04, 1054.06], rest: [51, 87, 0] },
    L: { root: [597.93, 1054.06], rest: [129, 93, 0] }
  };
  const rad = (d) => d * Math.PI / 180;
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
  const fr1 = (v) => (Math.round(v * 10) / 10).toString();
  const f1 = fr1;

  function liftOf(side, s, e, c) {
    const r = ARM[side].rest;
    return smooth(Math.max(Math.abs(angDiff(s, r[0])), Math.abs(angDiff(e, r[1])) * 0.8, Math.abs(c) * 0.6) / 22);
  }

  /* The outline of one arm for angles s, e, c. Returns the path, the centre line, the tip and the wrist. */
  function armShape(side, s, e, c, lite) {
    const A = ARM, cfg = A[side], N = lite ? 24 : A.N, f1 = lite ? (v) => String(Math.round(v)) : fr1;
    const lift = liftOf(side, s, e, c);
    const elbow = lerp(A.ELBOW_REST, A.ELBOW_UP, lift);
    const bend = lerp(600, 220, lift);
    const de = angDiff(e, s);
    const heading = (u) => s + de * smooth((u - (elbow - bend / 2)) / bend) + c * smooth((u - (A.LEN - A.CURL)) / A.CURL);
    const wTip = lerp(A.W, A.W_TIP_UP, lift);
    const width = (u) => (u < 0.5 * A.LEN ? A.W : lerp(A.W, wTip, smooth((u - 0.5 * A.LEN) / (0.5 * A.LEN))));
    const pts = [];
    const h0 = heading(0);
    pts.push({ x: cfg.root[0] - Math.cos(rad(h0)) * A.EXT, y: cfg.root[1] - Math.sin(rad(h0)) * A.EXT, h: h0, w: A.W, u: -A.EXT });
    let x = cfg.root[0], y = cfg.root[1];
    pts.push({ x, y, h: h0, w: A.W, u: 0 });
    const ds = A.LEN / N;
    for (let i = 1; i <= N; i++) {
      const u = i * ds, hm = heading(u - ds / 2);
      x += Math.cos(rad(hm)) * ds; y += Math.sin(rad(hm)) * ds;
      pts.push({ x, y, h: heading(u), w: width(u), u });
    }
    const L = [], R = [];
    pts.forEach((p) => {
      const nx = -Math.sin(rad(p.h)), ny = Math.cos(rad(p.h));
      L.push([p.x + nx * p.w / 2, p.y + ny * p.w / 2]); R.push([p.x - nx * p.w / 2, p.y - ny * p.w / 2]);
    });
    const end = pts[pts.length - 1], tx = Math.cos(rad(end.h)), ty = Math.sin(rad(end.h));
    const k = lift * end.w / 2 * 1.34; /* 0 = the logo's flat end; 1 = a fully rounded tip */
    const lN = L[L.length - 1], rN = R[R.length - 1];
    let d = `M${f1(L[0][0])},${f1(L[0][1])}`;
    for (let i = 1; i < L.length; i++) d += `L${f1(L[i][0])},${f1(L[i][1])}`;
    d += `C${f1(lN[0] + tx * k)},${f1(lN[1] + ty * k)},${f1(rN[0] + tx * k)},${f1(rN[1] + ty * k)},${f1(rN[0])},${f1(rN[1])}`;
    for (let i = R.length - 2; i >= 0; i--) d += `L${f1(R[i][0])},${f1(R[i][1])}`;
    d += "Z";
    return { d, lift, pts, tip: end, wrist: pts[Math.round(N * 0.78) + 1] };
  }

  /* Springs: the shoulder leads; the elbow keeps its bend relative to the shoulder, so it trails behind it
     and catches up; the tip trails the forearm the same way. A little damping gives a tiny overshoot. */
  const SPRING = { s: [15, 0.8], e: [10.5, 0.72], t: [9, 0.7] };
  function ArmSim(side) {
    const r = ARM[side].rest;
    this.s = r[0]; this.e = r[1]; this.h = r[1] + r[2]; this.vs = 0; this.ve = 0; this.vh = 0;
  }
  ArmSim.prototype.set = function (S, E, C) { this.s = S; this.e = E; this.h = E + C; this.vs = this.ve = this.vh = 0; };
  ArmSim.prototype.step = function (dt, S, E, C) {
    const [k1, z1] = SPRING.s, [k2, z2] = SPRING.e, [k3, z3] = SPRING.t;
    this.vs += (k1 * k1 * angDiff(S, this.s) - 2 * z1 * k1 * this.vs) * dt; this.s += this.vs * dt;
    const te = this.s + angDiff(E, S);
    this.ve += (k2 * k2 * angDiff(te, this.e) - 2 * z2 * k2 * this.ve) * dt; this.e += this.ve * dt;
    const th = this.e + C;
    this.vh += (k3 * k3 * angDiff(th, this.h) - 2 * z3 * k3 * this.vh) * dt; this.h += this.vh * dt;
  };
  ArmSim.prototype.c = function () { return angDiff(this.h, this.e); };
  ArmSim.prototype.settled = function (S, E, C) {
    return Math.abs(this.vs) + Math.abs(this.ve) + Math.abs(this.vh) < 0.2 &&
      Math.abs(angDiff(S, this.s)) + Math.abs(angDiff(this.s + angDiff(E, S), this.e)) + Math.abs(angDiff(this.e + C, this.h)) < 0.05;
  };

  /* ---------- Props ---------- */
  /* Held props are drawn at the tip of the tentacle. "along" props follow the tentacle's direction
     (local +y points along it); "up" props stay upright. Each one is small and kept clear of the face. */
  const HELD = {
    stick: { mode: "along", at: "tip", svg: `<path d="M0,-30V520" stroke="var(--pz-stick)" stroke-width="34" stroke-linecap="round"/><circle cy="520" r="44" fill="var(--pz-glass)"/>` },
    chalk: { mode: "along", at: "tip", svg: `<path d="M0,10V110" stroke="var(--pz-paper)" stroke-width="40" stroke-linecap="round"/>` },
    watch: { mode: "along", at: "wrist", svg: `<rect x="-78" y="-34" width="156" height="68" rx="20" fill="var(--pz-glass)"/><circle r="64" fill="var(--pz-paper)" stroke="var(--pz-glass)" stroke-width="18"/><path d="M0,0V-36M0,0L24,14" stroke="var(--pz-dark)" stroke-width="12" stroke-linecap="round"/>` },
    magnifier: { mode: "up", at: "tip", svg: `<path d="M0,-30L40,-190" stroke="var(--pz-stick)" stroke-width="44" stroke-linecap="round"/><circle cx="70" cy="-330" r="130" fill="var(--pz-lens)" stroke="var(--pz-glass)" stroke-width="40"/><path d="M10,-380q30,-40 80,-44" fill="none" stroke="var(--pz-paper)" stroke-width="18" stroke-linecap="round" opacity=".7"/>` },
    notes: { mode: "up", at: "tip", svg: `<g transform="translate(0 -40)">
        <rect x="-150" y="-380" width="300" height="380" rx="24" fill="var(--pz-paper)"/>
        <path d="M-105,-280H105M-105,-220H105M-105,-160H105M-105,-100H45" stroke="var(--pz-line)" stroke-width="14" stroke-linecap="round"/>
        <g class="pz-page" style="transform-origin:0px -380px"><rect x="-150" y="-380" width="300" height="380" rx="24" fill="var(--pz-paper2)"/>
          <path d="M-105,-280H105M-105,-220H105M-105,-160H105M-105,-100H45" stroke="var(--pz-line)" stroke-width="14" stroke-linecap="round"/></g>
        <path d="M-150,-356a24,24 0 0 1 24,-24H126a24,24 0 0 1 24,24V-340H-150Z" fill="var(--pz-glass)"/>
        ${[-105, -63, -21, 21, 63, 105].map((cx) => `<rect x="${cx - 11}" y="-410" width="22" height="58" rx="11" fill="none" stroke="var(--pz-dark)" stroke-width="10"/>`).join("")}</g>` },
    card: { mode: "up", at: "tip", svg: `<g transform="translate(0 -230)"><rect x="-175" y="-200" width="350" height="360" rx="34" fill="var(--pz-paper)"/>
        <rect x="-175" y="-200" width="350" height="96" rx="34" fill="var(--pz-glass)"/><rect x="-175" y="-140" width="350" height="36" fill="var(--pz-glass)"/>
        <path d="M-90,-230V-170M90,-230V-170" stroke="var(--pz-dark)" stroke-width="26" stroke-linecap="round"/>
        ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${-120 + c * 90}" y="${-70 + r * 72}" width="60" height="48" rx="10" fill="${r === 1 && c === 1 ? "var(--pz-glass)" : "var(--pz-line)"}"/>`).join("")).join("")}</g>` },
    badge: { mode: "up", at: "tip", svg: `<g transform="translate(0 -230)"><circle r="190" fill="var(--pz-week, var(--pz-glass))" stroke="var(--pz-paper)" stroke-width="26"/>
        <text class="pz-badge-n" y="70" text-anchor="middle" font-size="210" font-weight="800" fill="var(--pz-dark)" font-family="Plus Jakarta Sans, system-ui, sans-serif">1</text>
        <path d="M140,-210l24,48 53,8 -38,37 9,53 -48,-25 -48,25 9,-53 -38,-37 53,-8z" fill="var(--pz-glass)" stroke="var(--pz-dark)" stroke-width="10"/></g>` },
    umbrella: { mode: "up", at: "tip", svg: `<g transform="rotate(-30)"><path d="M0,-20V-430" stroke="var(--pz-stick)" stroke-width="30" stroke-linecap="round"/>
        <path d="M-400,-430A400,290 0 0 1 400,-430Q333,-475 267,-430Q200,-475 133,-430Q67,-475 0,-430Q-67,-475 -133,-430Q-200,-475 -267,-430Q-333,-475 -400,-430Z" fill="var(--pz-glass)"/>
        <path d="M0,-720V-780" stroke="var(--pz-glass)" stroke-width="30" stroke-linecap="round"/><path d="M-133,-430Q-150,-620 0,-720M133,-430Q150,-620 0,-720" fill="none" stroke="var(--pz-glass-dark)" stroke-width="14"/></g>` }
  };
  const ARM_PROPS = Object.keys(HELD);
  const PROPS = ["stick", "watch", "notes", "board", "chalk", "magnifier", "badge", "card", "nightcap", "box", "umbrella", "gradcap"];
  const PROP_NAMES = { stick: "Pointer stick", watch: "Watch", notes: "Notepad", board: "Small chalkboard", chalk: "Chalk", magnifier: "Magnifying glass",
    badge: "Week badge", card: "Calendar card", nightcap: "Nightcap", box: "Box (backup)", umbrella: "Umbrella", gradcap: "Graduation cap" };

  const o = (name) => `transform-origin:${PIV[name][0]}px ${PIV[name][1]}px`;

  function markup(extraClass, bare) {
    /* bare: Pweza alone (no props, one face), for the preloader written straight into index.html */
    const ink = "var(--pz-ink)";
    const keep = (html) => (bare ? "" : html);
    const restR = armShape("R", ...ARM.R.rest).d, restL = armShape("L", ...ARM.L.rest).d;
    const held = (side) => keep(`<g class="pz-held pz-held${side}">${ARM_PROPS.map((id) => `<g class="pz-prop pz-p-${id}" data-prop="${id}">${HELD[id].svg}</g>`).join("")}</g>`);
    return `<svg class="pz-svg ${extraClass || ""}" viewBox="0 0 1920 1920" overflow="visible" aria-hidden="true" focusable="false">
<g class="pz-tap" style="${o("all")}"><g class="pz-spin" style="${o("spin")}"><g class="pz-move" style="${o("all")}">
  ${keep(`<g class="pz-prop pz-p-board">
    <path d="M90,1300L190,880M350,1300L250,880" stroke="var(--pz-glass-dark)" stroke-width="30" stroke-linecap="round"/>
    <rect x="20" y="560" width="400" height="330" rx="22" fill="var(--pz-board)" stroke="var(--pz-glass)" stroke-width="26"/>
    <path class="pz-chalk1" d="M80,650q40,-40 80,0t80,0" fill="none" stroke="var(--pz-paper)" stroke-width="18" stroke-linecap="round" pathLength="100"/>
    <path class="pz-chalk2" d="M80,740h220" fill="none" stroke="var(--pz-paper)" stroke-width="18" stroke-linecap="round" pathLength="100"/>
    <path class="pz-chalk3" d="M80,820h150m40,0h60" fill="none" stroke="var(--pz-paper)" stroke-width="18" stroke-linecap="round" pathLength="100"/>
  </g>`)}
  <g class="pz-body" style="${o("body")}">
    <g class="pz-leg pz-leg2" style="${o("leg2")}"><path d="${D.leg2}" fill="var(--pz-body)"/></g>
    <g class="pz-leg pz-leg3" style="${o("leg3")}"><path d="${D.leg3}" fill="var(--pz-body)"/></g>
    <g class="pz-leg pz-leg4" style="${o("leg4")}"><path d="${D.leg4}" fill="var(--pz-body)"/></g>
    <g class="pz-leg pz-leg5" style="${o("leg5")}"><path d="${D.leg5}" fill="var(--pz-body)"/></g>
    ${keep(`<g class="pz-prop pz-p-box">
      <path d="M690,1270H1230V1690H690Z" fill="var(--pz-box)"/>
      <path d="M690,1270L780,1170H1140L1230,1270Z" fill="var(--pz-box-top)"/>
      <rect x="840" y="1390" width="240" height="150" rx="16" fill="var(--pz-paper)"/>
      <path d="M960,1412V1500M920,1462l40,40 40,-40" fill="none" stroke="var(--pz-dark)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`)}
    <path class="pz-arm pz-armL" d="${restL}" fill="var(--pz-body)"/>
    <path class="pz-arm pz-armR" d="${restR}" fill="var(--pz-body)"/>
    <path class="pz-mantle" d="${D.mantle}" fill="var(--pz-body)"/>
    <g class="pz-head" style="${o("head")}">
      <circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="var(--pz-body)"/>
      <rect x="924.97" y="${HEAD.cy}" width="${(HEAD.cx - 924.97).toFixed(2)}" height="330" fill="var(--pz-body)"/>
      <g class="pz-face">
        <g class="pz-brows" style="transform-origin:1238.6px 460px">
          <path d="M1060,468Q1118,428 1176,458" fill="none" stroke="${ink}" stroke-width="28" stroke-linecap="round"/>
          <path d="M1301,458Q1359,428 1417,468" fill="none" stroke="${ink}" stroke-width="28" stroke-linecap="round"/>
        </g>
        <g class="pz-eyes" style="${o("eyes")}">
          <g class="pz-look">
            <g class="pz-eyes-open"><circle cx="1125" cy="598" r="36" fill="${ink}"/><circle cx="1352" cy="598" r="36" fill="${ink}"/>
              <circle cx="1137" cy="585" r="11" fill="var(--pz-body)"/><circle cx="1364" cy="585" r="11" fill="var(--pz-body)"/></g>
          </g>
          ${keep(`<g class="pz-eyes-happy"><path d="M1093,614Q1125,566 1157,614M1320,614Q1352,566 1384,614" fill="none" stroke="${ink}" stroke-width="24" stroke-linecap="round"/></g>
          <g class="pz-eyes-sleepy">
            ${[1125, 1352].map((cx) => `<path d="M${cx - 38},604A38,38 0 0 0 ${cx + 38},604Z" fill="${ink}"/>
            <path d="M${cx - 50},606Q${cx},578 ${cx + 50},606" fill="none" stroke="${ink}" stroke-width="26" stroke-linecap="round"/>`).join("")}
          </g>`)}
        </g>
        <g class="pz-glasses" fill="none" stroke="var(--pz-glass)" stroke-width="30">
          <circle cx="1125" cy="595" r="90"/><circle cx="1352" cy="595" r="90"/>
          <path d="M1215,588Q1238.6,566 1262,588M1035,580L950,560M1442,580L1530,556" stroke-linecap="round"/>
        </g>
        <g class="pz-mouth" style="${o("mouth")}">
          <path class="pz-m-smile" d="M1193,722Q1238.6,768 1284,722" fill="none" stroke="${ink}" stroke-width="24" stroke-linecap="round"/>
          ${keep(`<path class="pz-m-soft" d="M1206,734Q1238.6,756 1271,734" fill="none" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
          <path class="pz-m-big" d="M1178,708Q1238.6,812 1299,708Z" fill="${ink}" stroke="${ink}" stroke-width="16" stroke-linejoin="round"/>
          <path class="pz-m-proud" d="M1176,716Q1238.6,782 1301,716" fill="none" stroke="${ink}" stroke-width="26" stroke-linecap="round"/>
          <ellipse class="pz-m-o" cx="1238.6" cy="740" rx="34" ry="42" fill="${ink}"/>`)}
        </g>
      </g>
      ${keep(`<g class="pz-prop pz-p-nightcap">
        <path d="M948,452Q960,170 1250,150Q1560,140 1720,560Q1560,330 1470,300Q1520,340 1530,400Q1240,330 948,452Z" fill="var(--pz-cap2)"/>
        <path d="M940,455Q1238,330 1536,400" fill="none" stroke="var(--pz-paper)" stroke-width="60" stroke-linecap="round"/>
        <circle cx="1724" cy="586" r="70" fill="var(--pz-paper)"/>
      </g>
      <g class="pz-prop pz-p-gradcap" style="${o("gradcap")}">
        <path d="M1060,330Q1238.6,268 1418,330L1418,420Q1238.6,374 1060,420Z" fill="var(--pz-cap)"/>
        <path d="M900,262L1238.6,150L1578,262L1238.6,374Z" fill="var(--pz-cap)" stroke="var(--pz-cap-edge)" stroke-width="14" stroke-linejoin="round"/>
        <path d="M1238.6,262L1510,300V450" fill="none" stroke="var(--pz-glass)" stroke-width="16" stroke-linecap="round"/>
        <rect x="1484" y="440" width="52" height="96" rx="14" fill="var(--pz-glass)"/>
      </g>`)}
    </g>
    ${held("L")}${held("R")}
  </g>
</g></g></g></svg>`;
  }

  /* ---------- Moods: when he shows, what he does, what he says ---------- */
  /*
    pose.arms: { L: [shoulder, forearm, curl], R: [...] } in degrees (0 = right, 90 = down, -90 = up).
      Missing = hanging like the logo. Props named "L-x" / "R-x" are held by that arm.
    armLoop: little repeated movements of the arm targets, { R: { s: [size, ms, phase], e: [...], c: [...] } }
      or { R: { period: ms, keys: [[0..1, s, e, c], ...] } }. The springs make them flow.
    loop: other repeated movements (body, head, notes page, chalk...). enter: plays once when the mood starts.
  */
  const A = (deg) => `rotate(${deg}deg)`;
  const REST_R = ARM.R.rest, REST_L = ARM.L.rest;
  const MOODS = [
    { id: "hello", group: "Set-up", when: "First open and the set-up screen", line: () => "Karibu! I'm Pweza, your Blender teacher.",
      pose: { R: [-22, -80, 10], eyes: "open", mouth: "big" },
      armLoop: { R: { s: [5, 900, 0], e: [11, 900, 0.12], c: [10, 900, 0.22] } } },
    { id: "today", group: "Today", when: "Today, before the lesson", line: (v) => `Today: ${v.title || "Select, move, rotate, scale"}.`,
      pose: { R: [30, 58, 0], eyes: "open", mouth: "smile", look: [18, 12], props: ["R-stick"] },
      armLoop: { R: { s: [2, 1400, 0], e: [5, 1400, 0.1] } } },
    { id: "soon", group: "Today", when: "15 minutes before the lesson", line: () => "Lesson in 15 minutes.",
      pose: { L: [205, 262, 0], eyes: "open", mouth: "smile", brows: "up", look: [-22, -6], props: ["L-watch"] },
      armLoop: { L: { s: [3, 360, 0], e: [10, 360, 0.1] } },
      loop: [["move", ["translateY(0)", "translateY(-70px)"], { duration: 360, direction: "alternate", easing: "ease-out" }]] },
    { id: "recap", group: "Lesson timer", when: "Lesson timer, part 1: the recap", line: () => "First, a quick look back.",
      pose: { L: [212, 262, 0], eyes: "open", mouth: "soft", look: [-24, -10], props: ["L-notes"] },
      armLoop: { L: { s: [2, 2000, 0], e: [4, 2000, 0.15] } },
      loop: [["page", ["scaleY(1)", "scaleY(1)", "scaleY(0.02)", "scaleY(-0.32)", "scaleY(-0.32)"], { duration: 2000, easing: "ease-in-out", offsets: [0, 0.5, 0.68, 0.8, 1] }],
             ["pageFade", [], { duration: 2000 }]] },
    { id: "idea", group: "Lesson timer", when: "Lesson timer, part 2: the one idea", line: () => "Here's today's one idea.",
      pose: { L: [196, 222, 0], eyes: "open", mouth: "smile", look: [-26, -10], props: ["board", "L-chalk"] },
      armLoop: { L: { s: [3, 560, 0], e: [8, 560, 0.15] } },
      loop: [["chalk", [], { duration: 3600 }]] },
    { id: "build", group: "Lesson timer", when: "Lesson timer, part 3: you build", line: () => "Your turn. Build it, step by step.",
      pose: { eyes: "open", mouth: "smile", look: [-16, 16] },
      loop: [["head", [A(0), A(5)], { duration: 520, direction: "alternate", easing: "ease-in-out" }]] },
    { id: "check", group: "Lesson timer", when: "Lesson timer, part 4: screenshot check", line: () => "Check your screenshot against the proof.",
      pose: { R: [-24, -72, 0], eyes: "open", mouth: "soft", brows: "up", look: [26, -10], props: ["R-magnifier"] },
      armLoop: { R: { s: [3, 1800, 0], e: [6, 1800, 0.18] } } },
    { id: "preview", group: "Lesson timer", when: "Lesson timer, part 5: preview", line: () => "A peek at the next lesson.",
      pose: { R: [-38, -70, -40], head: -4, eyes: "open", mouth: "soft", brows: "up", look: [30, -12] },
      armLoop: { R: { c: [6, 1600, 0] } },
      loop: [["move", [A(-2), A(2)], { duration: 1600, direction: "alternate", easing: "ease-in-out" }]] },
    { id: "done", group: "Moments", when: "After “I did it”", line: () => "Lesson done!", big: true,
      pose: { L: [202, 250, 22], R: [-22, -70, -22], eyes: "happy", mouth: "big" },
      armLoop: { L: { s: [7, 340, 0], e: [13, 340, 0.12] }, R: { s: [7, 340, 0.5], e: [13, 340, 0.62] } },
      loop: [["move", ["translateY(0) scaleY(1)", "translateY(-170px) scaleY(1.03)", "translateY(0) scaleY(0.94)", "translateY(0) scaleY(1)"], { duration: 680, easing: "ease-out", offsets: [0, 0.4, 0.8, 1] }],
             ["legsOut", [], { duration: 340 }]] },
    { id: "week", group: "Moments", when: "A week project done", line: (v) => `Week ${v.week || 1} complete!`, big: true,
      pose: { L: [206, 256, 18], R: [-26, -76, 0], eyes: "happy", mouth: "big", props: ["R-badge"] },
      armLoop: { L: { s: [6, 520, 0], e: [16, 520, 0.12] }, R: { s: [3, 1040, 0], e: [5, 1040, 0.15] } },
      loop: [["move", ["translateX(-50px) rotate(-6deg)", "translateX(50px) rotate(6deg)"], { duration: 520, direction: "alternate", easing: "ease-in-out" }]] },
    { id: "cant", group: "Today", when: "After “Can't today”", line: () => "No problem. Everything moves along.",
      pose: { R: [-22, -86, -118], eyes: "open", mouth: "soft", brows: "soft" },
      armLoop: { R: { s: [2, 2400, 0], e: [3, 2400, 0.15] } } },
    { id: "catchup", group: "Today", when: "Catch-up notice (a past lesson not ticked)", line: () => "Pick up where you left off?",
      pose: { L: [212, 262, 0], head: -11, eyes: "open", mouth: "soft", brows: "up", look: [-22, -6], props: ["L-card"] },
      armLoop: { L: { s: [2, 1500, 0], e: [4, 1500, 0.15] } },
      loop: [["head", [A(-11), A(-6)], { duration: 1500, direction: "alternate", easing: "ease-in-out" }]] },
    { id: "late", group: "Today", when: "After 21:00", line: () => "It's late. Rest, practise tomorrow.",
      pose: { head: 7, eyes: "sleepy", mouth: "soft", brows: "soft", props: ["nightcap"] },
      loop: [["mouthYawn", [], { duration: 4200 }]], slow: true },
    { id: "friday", group: "Today", when: "Friday: time for a backup", line: () => "Friday! Save a backup of your week.",
      pose: { L: [100, 60, -55], R: [80, 120, 55], eyes: "open", mouth: "smile", props: ["box"] },
      loop: [["move", ["translateY(0)", "translateY(-40px)"], { duration: 700, direction: "alternate", easing: "ease-in-out" }]] },
    { id: "offline", group: "Any screen", when: "No internet", line: () => "No internet. Everything still works.",
      pose: { R: [-24, -80, 0], eyes: "open", mouth: "soft", brows: "soft", look: [10, -14], props: ["R-umbrella"] },
      armLoop: { R: { s: [2, 1800, 0], e: [3, 1800, 0.2] } },
      loop: [["move", [A(-3), A(3)], { duration: 1800, direction: "alternate", easing: "ease-in-out" }]] },
    { id: "cert", group: "Moments", when: "The certificate unlocks", line: (v) => (v.first ? `You did it, ${v.first}!` : "You did it!"), big: true,
      pose: { head: -5, eyes: "open", mouth: "proud", props: ["gradcap"] },
      armLoop: { R: { period: 3200, keys: [[0, ...REST_R], [0.27, ...REST_R], [0.36, -12, -40, -30], [0.5, -12, -40, -30], [0.66, ...REST_R], [1, ...REST_R]] } },
      loop: [["capThrow", [], { duration: 3200 }]] },
    { id: "welcome", group: "Moments", when: "After restoring from a backup", line: (v) => (v.first ? `Welcome back, ${v.first}.` : "Welcome back."), big: true,
      pose: { L: [100, 60, -55], R: [80, 120, 55], eyes: "open", mouth: "smile", props: ["box"] },
      enter: [["move", ["translateX(-1100px) translateY(0)", "translateX(-700px) translateY(-60px)", "translateX(-350px) translateY(0)", "translateX(-120px) translateY(-50px)", "translateX(0) translateY(0)"], { duration: 1100, easing: "linear" }]] }
  ];

  function armTarget(m, side, tMs) {
    const base = (m.pose && m.pose[side]) || ARM[side].rest;
    const loop = m.armLoop && m.armLoop[side];
    if (!loop || tMs == null) return base.slice();
    if (loop.keys) {
      const p = ((tMs % loop.period) + loop.period) % loop.period / loop.period;
      const ks = loop.keys;
      let i = 0; while (i < ks.length - 2 && p > ks[i + 1][0]) i++;
      const a = ks[i], b = ks[i + 1], f = smooth((p - a[0]) / Math.max(1e-6, b[0] - a[0]));
      return [lerp(a[1], b[1], f), lerp(a[2], b[2], f), lerp(a[3], b[3], f)];
    }
    const wave = (spec) => (spec ? spec[0] * Math.sin(2 * Math.PI * (tMs / spec[1] + (spec[2] || 0))) : 0);
    return [base[0] + wave(loop.s), base[1] + wave(loop.e), base[2] + wave(loop.c)];
  }

  /* ---------- Movement ---------- */

  const reduceQuery = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let forceStill = false, timeScale = 1;
  const still = () => forceStill || reduceQuery.matches;
  const live = new Set();

  function create(container, options) {
    const opts = options || {};
    const wrap = document.createElement("div");
    wrap.className = "pz " + (opts.layout === "stack" ? "pz--stack" : "pz--side") + (opts.className ? " " + opts.className : "");
    if (opts.size) wrap.style.setProperty("--pz-size", opts.size + "px");
    wrap.innerHTML = `<div class="pz-fig">${markup()}</div>${opts.bubble === false ? "" : '<p class="pz-say"></p>'}`;
    container.appendChild(wrap);
    const svg = wrap.querySelector(".pz-svg");
    const q = (s) => svg.querySelector(s);
    const el = {
      tap: q(".pz-tap"), spin: q(".pz-spin"), move: q(".pz-move"), body: q(".pz-body"), head: q(".pz-head"), eyes: q(".pz-eyes"),
      look: q(".pz-look"), page: q(".pz-heldL .pz-page"), pageR: q(".pz-heldR .pz-page"),
      legs: [".pz-leg2", ".pz-leg3", ".pz-leg4", ".pz-leg5"].map(q), gradcap: q(".pz-p-gradcap"), say: wrap.querySelector(".pz-say"),
      chalk: [".pz-chalk1", ".pz-chalk2", ".pz-chalk3"].map(q), yawn: q(".pz-m-o"),
      arm: { L: q(".pz-armL"), R: q(".pz-armR") },
      held: { L: Array.from(svg.querySelectorAll(".pz-heldL .pz-prop")), R: Array.from(svg.querySelectorAll(".pz-heldR .pz-prop")) }
    };
    const sims = { L: new ArmSim("L"), R: new ArmSim("R") };
    const geo = { L: null, R: null };
    let anims = [], idle = [], blinkTimer = null, mood = null, taps = [], alive = true, raf = 0, last = 0, t = 0;

    const play = (node, frames, timing, list) => {
      if (!node || !node.animate) return null;
      const tm = Object.assign({ iterations: Infinity }, timing);
      const offsets = tm.offsets; delete tm.offsets;
      const kf = frames.map((v, i) => Object.assign(typeof v === "string" ? { transform: v } : v, offsets ? { offset: offsets[i] } : {}));
      const a = node.animate(kf, tm);
      a.playbackRate = timeScale;
      (list || anims).push(a);
      return a;
    };
    const stopAll = (list) => { list.forEach((a) => a.cancel()); list.length = 0; };

    /* Draw both arms from their springs, and put held props at the tips */
    function draw() {
      ["L", "R"].forEach((side) => {
        const sim = sims[side];
        const g = armShape(side, sim.s, sim.e, sim.c());
        geo[side] = g;
        el.arm[side].setAttribute("d", g.d);
        el.held[side].forEach((pe) => {
          const spec = HELD[pe.dataset.prop];
          const p = spec.at === "wrist" ? g.wrist : g.tip;
          const ang = spec.mode === "along" ? p.h - 90 : 0;
          pe._tf = { x: p.x, y: p.y, a: ang };
          pe.setAttribute("transform", `translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(ang)})`);
        });
      });
    }
    function targets(m, tm) { return { L: armTarget(m, "L", tm), R: armTarget(m, "R", tm) }; }
    function frame(now) {
      raf = 0;
      if (!alive || !mood) return;
      const real = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      const dt = real * timeScale;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      for (let i = 0; i < steps; i++) {
        t += (dt / steps) * 1000;
        const tg = targets(mood, t);
        sims.L.step(dt / steps, ...tg.L); sims.R.step(dt / steps, ...tg.R);
      }
      draw();
      const tg = targets(mood, t);
      const busy = mood.armLoop || !sims.L.settled(...tg.L) || !sims.R.settled(...tg.R);
      if (busy && !still()) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && alive && !still()) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    function setPose(p) {
      wrap.dataset.eyes = p.eyes || "open";
      wrap.dataset.mouth = p.mouth || "smile";
      wrap.dataset.brows = p.brows || "";
      wrap.dataset.props = (p.props || []).join(" ");
      el.head.style.transform = `rotate(${p.head || 0}deg)`;
      el.look.style.transform = p.look ? `translate(${p.look[0]}px, ${p.look[1]}px)` : "";
    }

    function startIdle(slow) {
      stopAll(idle);
      if (still()) return;
      const k = slow ? 1.6 : 1;
      play(el.body, ["scale(1, 1)", "scale(1.012, 0.985)"], { duration: 1700 * k, direction: "alternate", easing: "ease-in-out" }, idle);
      play(el.tap, ["translateY(0)", "translateY(-26px)"], { duration: 1700 * k, direction: "alternate", easing: "ease-in-out" }, idle);
      [2600, 3100, 2900, 3400].forEach((d, i) => play(el.legs[i], [A(i < 2 ? -1.4 : 1.4), A(i < 2 ? 1.4 : -1.4)], { duration: d * k, direction: "alternate", easing: "ease-in-out", delay: -i * 700 }, idle));
      scheduleBlink();
    }
    function scheduleBlink() {
      clearTimeout(blinkTimer);
      if (still() || !alive) return;
      blinkTimer = setTimeout(() => {
        if (!alive) return;
        if (!document.hidden && wrap.dataset.eyes === "open" && el.eyes.animate) {
          const a = el.eyes.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)", offset: 0.5 }, { transform: "scaleY(1)" }], { duration: 190, easing: "ease-in-out" });
          a.playbackRate = timeScale;
        }
        scheduleBlink();
      }, (3000 + Math.random() * 3000) / timeScale);
    }

    function runLoops(m) {
      (m.loop || []).forEach(([target, frames, timing]) => {
        if (target === "head") play(el.head, frames, timing);
        else if (target === "move") play(el.move, frames, timing);
        else if (target === "page") [el.page, el.pageR].forEach((pg) => play(pg, frames, timing));
        else if (target === "pageFade") [el.page, el.pageR].forEach((pg) => play(pg, [{ opacity: 1 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: timing.duration, offsets: [0, 0.8, 0.84, 1] }));
        else if (target === "legsOut") el.legs.forEach((leg, i) => play(leg, [A(0), A(i < 2 ? 7 : -7)], Object.assign({ direction: "alternate", easing: "ease-in-out" }, timing)));
        else if (target === "chalk") {
          el.chalk.forEach((c, i) => {
            const s = i / 3, e = (i + 1) / 3;
            play(c, [{ strokeDasharray: "100 100", strokeDashoffset: 100 }, { strokeDasharray: "100 100", strokeDashoffset: 100 }, { strokeDasharray: "100 100", strokeDashoffset: 0 }, { strokeDasharray: "100 100", strokeDashoffset: 0 }],
              { duration: timing.duration, offsets: [0, s * 0.85, e * 0.85, 1] });
          });
        } else if (target === "mouthYawn") {
          wrap.dataset.mouth = "soft";
          play(el.yawn, [{ opacity: 0, transform: "scale(0.3)" }, { opacity: 0, transform: "scale(0.3)" }, { opacity: 1, transform: "scale(1.25)" }, { opacity: 1, transform: "scale(1.1)" }, { opacity: 0, transform: "scale(0.3)" }], { duration: timing.duration, offsets: [0, 0.55, 0.72, 0.85, 1] });
          play(svg.querySelector(".pz-m-soft"), [{ opacity: 1 }, { opacity: 1 }, { opacity: 0 }, { opacity: 0 }, { opacity: 1 }], { duration: timing.duration, offsets: [0, 0.55, 0.6, 0.95, 1] });
        } else if (target === "capThrow") {
          play(el.gradcap, ["translate(0,0) rotate(0deg)", "translate(0,0) rotate(0deg)", "translate(120px,-760px) rotate(200deg)", "translate(0,0) rotate(360deg)", "translate(0,0) rotate(360deg)"], { duration: timing.duration, easing: "ease-in-out", offsets: [0, 0.35, 0.6, 0.85, 1] });
        }
      });
    }

    function setMood(id, vars, instant) {
      const m = MOODS.find((x) => x.id === id) || MOODS[0];
      const first = !mood;
      mood = m;
      stopAll(anims);
      wrap.dataset.mood = m.id;
      setPose(m.pose);
      const v = vars || opts.vars || {};
      if (el.say) el.say.textContent = m.line(v);
      if (v.week) {
        svg.querySelectorAll(".pz-badge-n").forEach((n) => { n.textContent = String(v.week); });
        wrap.style.setProperty("--pz-week", `var(--week-${v.week})`);
      }
      t = 0;
      /* The first pose (and every pose with reduce motion on) is taken straight away; later changes flow */
      if (first || instant || still()) { const tg = targets(m, still() ? null : 0); sims.L.set(...tg.L); sims.R.set(...tg.R); }
      draw();
      startIdle(m.slow);
      if (still()) return;
      kick();
      if (m.enter) m.enter.forEach(([target, frames, timing]) => { const a = play(el[target], frames, Object.assign({}, timing, { iterations: 1 })); if (a) a.onfinish = () => runLoops(m); });
      else runLoops(m);
    }

    /* Tap him: a happy wiggle. Three quick taps: he spins once. */
    function onTap() {
      if (still()) return;
      const now = Date.now();
      taps = taps.filter((x) => now - x < 700); taps.push(now);
      const a = taps.length >= 3
        ? el.spin.animate([{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(180deg) scale(1.08)" }, { transform: "rotate(360deg) scale(1)" }], { duration: 720, easing: "ease-in-out" })
        : el.spin.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-9deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(-5deg)" }, { transform: "rotate(3deg)" }, { transform: "rotate(0deg)" }], { duration: 560, easing: "ease-out" });
      a.playbackRate = timeScale;
      if (taps.length >= 3) taps = [];
    }
    const fig = wrap.querySelector(".pz-fig");
    fig.addEventListener("click", onTap);
    const onMotion = () => { if (mood) setMood(mood.id, opts.vars, true); };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", onMotion);

    /* How far the arms and held props stay from his eyes and glasses right now (negative = covering) */
    function clearance() {
      /* Everything is measured in the drawing's own coordinates, with every movement applied (getCTM) */
      const base = svg.getScreenCTM().inverse();
      const matrixOf = (node) => base.multiply(node.getScreenCTM());
      const toRoot = (node, x, y) => { const m = matrixOf(node); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
      const lenses = Array.from(svg.querySelectorAll(".pz-glasses circle"));
      const head = el.head;
      const face = FACE.map(([cx, cy, r]) => toRoot(head, cx, cy).concat([r]));
      let min = Infinity, what = "";
      const test = (x, y, r, name) => face.forEach(([cx, cy, fr]) => { const d = Math.hypot(x - cx, y - cy) - fr - r; if (d < min) { min = d; what = name; } });
      ["L", "R"].forEach((side) => {
        if (geo[side]) geo[side].pts.forEach((p) => { const [x, y] = toRoot(el.arm[side], p.x, p.y); test(x, y, p.w / 2, side + " arm"); });
        el.held[side].forEach((pe) => {
          if (getComputedStyle(pe).display === "none") return;
          pe.querySelectorAll("path, rect, circle, ellipse").forEach((shape) => {
            const len = shape.getTotalLength ? shape.getTotalLength() : 0;
            const sw = parseFloat(shape.getAttribute("stroke-width") || 0) / 2;
            for (let i = 0; i <= 24 && len; i++) { const p = shape.getPointAtLength((len * i) / 24); const [x, y] = toRoot(shape, p.x, p.y); test(x, y, sw, pe.dataset.prop); }
            /* a filled shape lying over a lens counts too */
            if (shape.isPointInFill && shape.getAttribute("fill") !== "none") {
              const inv = matrixOf(shape).inverse();
              lenses.forEach((lens) => {
                const [lx, ly] = toRoot(lens, +lens.getAttribute("cx"), +lens.getAttribute("cy"));
                const pt = new DOMPoint(inv.a * lx + inv.c * ly + inv.e, inv.b * lx + inv.d * ly + inv.f);
                if (shape.isPointInFill(pt)) { min = Math.min(min, -100); what = pe.dataset.prop; }
              });
            }
          });
        });
      });
      return { min, what };
    }

    const inst = {
      el: wrap,
      setMood: (id, vars) => { if (vars) opts.vars = vars; setMood(id, vars); },
      get mood() { return mood && mood.id; },
      clearance,
      animations: () => anims.concat(idle).filter((a) => a.playState === "running").length + (raf ? 1 : 0),
      _rate() { anims.concat(idle).forEach((a) => { a.playbackRate = timeScale; }); scheduleBlink(); kick(); },
      _restart() { if (mood) setMood(mood.id, opts.vars, true); },
      destroy() {
        alive = false; live.delete(inst); clearTimeout(blinkTimer); cancelAnimationFrame(raf); stopAll(anims); stopAll(idle);
        fig.removeEventListener("click", onTap);
        if (reduceQuery.removeEventListener) reduceQuery.removeEventListener("change", onMotion);
        wrap.remove();
      }
    };
    live.add(inst);
    setMood(opts.mood || "hello", opts.vars);
    return inst;
  }

  /* ---------- The preloader: Pweza waving, as SVG only (no script), for index.html ---------- */
  /* The wave is worked out here with the same springs and saved as frames of the arm's outline,
     played by the SVG itself. A second, still arm shows instead when "reduce motion" is on. */
  function preloaderFrames() {
    const sim = new ArmSim("R"), frames = [], step = 1 / 240, total = 1.1, every = 1 / 30;
    const H = MOODS[0].pose.R;
    const target = (tt) => {
      const env = smooth((tt - 0.28) / 0.12) * (1 - smooth((tt - 0.86) / 0.14));
      const w = Math.sin(2 * Math.PI * (tt - 0.28) / 0.46);
      return [H[0] + 5 * w * env, H[1] + 11 * Math.sin(2 * Math.PI * ((tt - 0.28) / 0.46 - 0.12)) * env, H[2] + 10 * Math.sin(2 * Math.PI * ((tt - 0.28) / 0.46 - 0.22)) * env];
    };
    let tt = 0, next = 0;
    while (tt <= total + 1e-9) {
      if (tt >= next - 1e-9) { frames.push(armShape("R", sim.s, sim.e, sim.c(), true)); next += every; }
      sim.step(step, ...target(tt)); tt += step;
    }
    return frames;
  }
  function preloaderMarkup() {
    const frames = preloaderFrames();
    const values = frames.map((g) => g.d).join(";");
    const anim = `<path class="pz-arm pl-arm-anim" d="${frames[0].d}" fill="var(--pz-body)"><animate attributeName="d" begin="0.38s" dur="1.1s" fill="freeze" calcMode="linear" values="${values}"/></path>`;
    const stillArm = `<path class="pz-arm pl-arm-still" d="${frames[0].d}" fill="var(--pz-body)"/>`;
    return markup("pl-svg", true).replace(/<path class="pz-arm pz-armR" d="[^"]*" fill="var\(--pz-body\)"\/>/, anim + stillArm);
  }

  root.Pweza = {
    create, markup, preloaderMarkup, preloaderFrames, armShape, MOODS, PROPS, ARM_PROPS, PROP_NAMES, FACE, HEAD, PIV,
    lineFor: (id, vars) => { const m = MOODS.find((x) => x.id === id); return m ? m.line(vars || {}) : ""; },
    setForceStill: (on) => { forceStill = !!on; live.forEach((p) => p._restart()); },
    setTimeScale: (x) => { timeScale = x; live.forEach((p) => p._rate()); },
    getTimeScale: () => timeScale,
    isStill: still
  };
})(typeof window !== "undefined" ? window : this);

/*
  Zedlab Blender Course: the screens.
  Set-up, Today, Calendar (month and list), Lesson sheet and Course map.
  Lesson words come from the content folder; dates come from app/calendar.js;
  progress is saved on this device by app/store.js.
*/
(function () {
  "use strict";

  const C = window.COURSE_CONTENT;
  const Cal = window.CourseCalendar;
  const Store = window.CourseStore;
  const LESSONS = C.lessons;
  const WEEKS = C.weeks;
  const DAY0 = C.beforeYouStart;
  const COUNT = C.course.lessonCount;

  const main = document.getElementById("main");
  const tabs = document.getElementById("tabs");
  const dlg = document.getElementById("dlg");
  const toasts = document.getElementById("toasts");
  const nameEl = document.getElementById("learner-name");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let S = loadState();
  let ticker = null;
  let flash = null;
  let calMonth = null;
  let renderedDay = null;
  let setupDaysOff = null;
  let lastPhase = -1;

  /* ---------- Small helpers ---------- */

  function loadState() {
    const st = Store.load();
    return st && st.plan && st.plan.startDate && st.learner ? st : null;
  }
  function save() { Store.save(S); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const todayKey = () => Cal.todayKey();
  const schedule = () => Cal.schedule(S.plan);
  const lessonData = (n) => (n === 0 ? DAY0 : LESSONS[n - 1]);
  const weekVar = (n) => (n === 0 ? "--wk: var(--accent); --wk-ink: var(--on-accent)" : `--wk: var(--week-${lessonData(n).week})`);
  const labelOf = (n) => (n === 0 ? "Before you start" : Cal.lessonLabel(n, WEEKS));
  const isDone = (n) => !!(S && S.done && S.done[n]);
  const kindName = (l) => ({ "week project": "Week project", "final project": "Final project", "certificate day": "Certificate day" }[l.kind] || "");
  const sentence = (s) => (/[.!?]$/.test(s) ? s : s + ".");
  const pad2 = (n) => String(n).padStart(2, "0");
  const hhmm = (d) => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  function dayZeroDone() { return DAY0.checklist.every((_, i) => S.dayZero && S.dayZero[i]); }

  const ICON = {
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8l-5.8 3.3 1.5-6.4-4.9-4.3 6.5-.6z"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/></svg>'
  };

  /* ---------- Blender words you can tap ---------- */

  const TERM_FORMS = [];
  C.glossary.forEach((g) => {
    if (g.word === "Blender") return;
    [g.word].concat(g.alsoMatches || []).forEach((f) => TERM_FORMS.push({ form: f, entry: g }));
  });
  TERM_FORMS.sort((a, b) => b.form.length - a.form.length);
  const TERM_BY_FORM = {};
  TERM_FORMS.forEach((t) => { const k = t.form.toLowerCase(); if (!TERM_BY_FORM[k]) TERM_BY_FORM[k] = t.entry; });
  /* A word joined to others by ".", "_" or "-" (a file name, or "select-mode") stays plain. */
  const TERM_RE = new RegExp("(^|[^A-Za-z0-9_.-])(" +
    TERM_FORMS.map((t) => t.form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![A-Za-z0-9_-])", "gi");

  /* Text with the Blender words it teaches made tappable. Only words taught by lesson `upTo` or earlier. */
  function linked(text, upTo) {
    let out = "", last = 0, m;
    const used = {};
    TERM_RE.lastIndex = 0;
    while ((m = TERM_RE.exec(text)) !== null) {
      const start = m.index + m[1].length, word = m[2], entry = TERM_BY_FORM[word.toLowerCase()];
      if (entry && entry.firstLesson <= upTo && !used[entry.word]) {
        const after = /^[,.;:!?)]/.test(text.slice(start + word.length)) ? text.charAt(start + word.length) : "";
        out += esc(text.slice(last, start)) +
          `<span class="nobr"><button type="button" class="term" data-term="${esc(entry.word)}" aria-haspopup="dialog">${esc(word)}</button>${esc(after)}</span>`;
        used[entry.word] = true;
        last = start + word.length + after.length;
      }
    }
    return out + esc(text.slice(last));
  }

  function showTerm(word) {
    const g = C.glossary.find((x) => x.word === word);
    if (!g) return;
    const where = g.firstLesson === 0 ? "Before you start" : `${labelOf(g.firstLesson)}: ${lessonData(g.firstLesson).title}`;
    openDialog({
      title: g.word,
      html: `<p class="dlg-text">${esc(g.meaning)}</p><p class="small muted dlg-text">First in ${esc(where)}.</p>`,
      actions: [{ label: "Open in Toolbox", value: "toolbox" }, { label: "Got it", value: "ok", primary: true }]
    }).then((r) => { if (r.value === "toolbox") go("#/toolbox/glossary/" + encodeURIComponent(g.word)); });
  }

  /* ---------- Dialogs, messages, celebrations ---------- */

  function openDialog(opts) {
    return new Promise((resolve) => {
      dlg.innerHTML = `<form method="dialog" class="dlg-body">
        <h2 class="dlg-title" id="dlg-title">${esc(opts.title)}</h2>
        ${opts.html || ""}
        <div class="actions">${(opts.actions || []).map((a) =>
          `<button class="btn ${a.primary ? "btn--primary" : "btn--ghost"}" value="${esc(a.value)}">${esc(a.label)}</button>`).join("")}</div>
        <button class="icon-btn dlg-close" value="cancel" aria-label="Close">${ICON.close}</button>
      </form>`;
      dlg.setAttribute("aria-labelledby", "dlg-title");
      dlg.returnValue = "";
      const form = dlg.querySelector("form");
      let chosen = "cancel", settled = false;
      /* Answer once, whichever way the dialog ends: a button, Escape, or the browser closing it. */
      const finish = (value) => {
        if (settled) return;
        settled = true;
        dlg.removeEventListener("close", onClose);
        dlg.removeEventListener("cancel", onCancel);
        if (dlg.open) dlg.close(value);
        resolve({ value, form });
      };
      /* A "closed" signal can arrive late from the previous dialog: ignore it while this one is still open. */
      const onClose = () => { if (dlg.open) return; finish(dlg.returnValue || "cancel"); };
      const onCancel = () => finish("cancel");
      form.querySelectorAll("button[value]").forEach((b) => b.addEventListener("click", () => { chosen = b.value; }));
      form.addEventListener("submit", (e) => { e.preventDefault(); finish((e.submitter && e.submitter.value) || chosen); });
      dlg.addEventListener("close", onClose);
      dlg.addEventListener("cancel", onCancel);
      dlg.showModal();
      if (opts.onOpen) opts.onOpen(dlg);
    });
  }

  function toast(message) {
    toasts.innerHTML = `<div class="toast">${esc(message)}</div>`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { toasts.innerHTML = ""; }, 4200);
  }

  function celebrate(big) {
    if (reduceMotion.matches) return;
    const box = document.createElement("div");
    box.className = "confetti";
    box.setAttribute("aria-hidden", "true");
    let html = "";
    const pieces = big ? 110 : 44;
    for (let i = 0; i < pieces; i++) {
      const colour = i % 7 === 6 ? "var(--accent)" : `var(--week-${(i % 6) + 1})`;
      html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${colour};--dx:${(Math.random() * 30 - 15).toFixed(1)}vw;` +
        `--rot:${Math.round(Math.random() * 900 - 450)}deg;--dur:${Math.round(1100 + Math.random() * 1000)}ms;animation-delay:${Math.round(Math.random() * 250)}ms"></i>`;
    }
    box.innerHTML = html;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2700);
  }

  function noticeHtml(html, kind) {
    return `<div class="notice ${kind === "kind" ? "notice--kind" : ""} enter" role="status"><div>${html}</div></div>`;
  }

  /* ---------- Lesson time ---------- */

  function lessonStart(date) {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = S.settings.lessonTime.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }
  function untilText(ms) {
    const min = Math.max(1, Math.round(ms / 60000));
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h} h ${pad2(m)} min` : `${m} min`;
  }
  function inDays(from, to) {
    const n = Cal.daysBetween(from, to);
    return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
  }
  function countdownHtml(n, date, t) {
    const time = esc(S.settings.lessonTime);
    if (n > 0 && isDone(n)) return "<strong>Ticked off.</strong> Well done.";
    if (date === t) {
      const start = lessonStart(date), end = new Date(start.getTime() + S.settings.lessonMinutes * 60000), now = new Date();
      if (now < start) return `Lesson at <strong>${time}</strong> · starts in <strong>${untilText(start - now)}</strong>`;
      if (now < end) return `<span class="live">Lesson time now</span> · until ${hhmm(end)}`;
      return `Today's lesson time was ${time} to ${hhmm(end)}. There's still time to do it today.`;
    }
    return `Lesson on <strong>${esc(Cal.formatNoYear(date))}</strong> at <strong>${time}</strong> · ${inDays(t, date)}`;
  }

  /* ---------- Lesson timer ---------- */

  function routineScaled() {
    const base = C.course.routine, total = S.settings.lessonMinutes;
    const sum = base.reduce((a, b) => a + b.minutes, 0);
    const exact = base.map((r) => (r.minutes * total) / sum);
    const out = exact.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    exact.map((e, i) => [e - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return base.map((r, i) => ({ part: r.part, minutes: Math.max(1, out[i]) }));
  }
  function timerInfo(now) {
    const T = S.timer, parts = routineScaled();
    const elapsed = ((T.pausedAt || now) - T.startedAt - T.pausedTotal) / 1000;
    let acc = 0;
    for (let i = 0; i < parts.length; i++) {
      const len = parts[i].minutes * 60;
      if (elapsed < acc + len) return { parts, index: i, left: acc + len - elapsed, elapsed, phaseEnd: acc + len, paused: !!T.pausedAt, finished: false };
      acc += len;
    }
    return { parts, index: parts.length, left: 0, elapsed, phaseEnd: acc, paused: !!T.pausedAt, finished: true };
  }
  const clock = (sec) => pad2(Math.floor(Math.ceil(sec) / 60)) + ":" + pad2(Math.ceil(sec) % 60);

  function timerHtml(n) {
    if (!S.timer || S.timer.lesson !== n) return "";
    const i = timerInfo(Date.now());
    if (i.finished) {
      return `<div class="timer" role="group" aria-label="Lesson timer">
        <p class="timer-phase">Time is up</p><p class="timer-time">00:00</p>
        <p class="muted">Well done. Tick it off with “I did it”.</p>
        <div class="actions"><button type="button" class="btn btn--small btn--ghost" data-action="timer-stop">Close the timer</button></div></div>`;
    }
    const p = i.parts[i.index];
    return `<div class="timer" role="group" aria-label="Lesson timer">
      <p class="timer-phase">${i.paused ? "Paused · " : ""}Part ${i.index + 1} of ${i.parts.length}: ${esc(p.part)} · ${p.minutes} min</p>
      <p class="timer-time" id="timer-time" aria-hidden="true">${clock(i.left)}</p>
      <ol class="timer-steps">${i.parts.map((x, k) =>
        `<li class="${k < i.index ? "is-done" : k === i.index ? "is-current" : ""}">${esc(x.part)}<br>${x.minutes} min</li>`).join("")}</ol>
      <div class="actions">
        <button type="button" class="btn btn--small" data-action="timer-pause">${i.paused ? "Resume" : "Pause"}</button>
        <button type="button" class="btn btn--small btn--ghost" data-action="timer-next">Next part</button>
        <button type="button" class="btn btn--small btn--ghost" data-action="timer-stop">Stop</button>
      </div></div>`;
  }

  function redrawTimer() {
    const box = document.getElementById("timer-box");
    if (box && S.timer) box.innerHTML = timerHtml(S.timer.lesson);
  }

  /* Runs every second while a screen is open: the countdown, the timer, and a new day at midnight. */
  function tick() {
    if (!S) return;
    if (renderedDay && renderedDay !== todayKey()) { route(); return; }
    const cd = document.getElementById("countdown");
    if (cd && cd.dataset.n) cd.innerHTML = countdownHtml(+cd.dataset.n, cd.dataset.date, todayKey());
    if (S.timer && document.getElementById("timer-box")) {
      const i = timerInfo(Date.now());
      if (i.index !== lastPhase) {
        if (lastPhase !== -1) {
          if (navigator.vibrate) navigator.vibrate(i.finished ? [200, 120, 200] : 200);
          toast(i.finished ? "Time is up. Well done." : `Next: ${i.parts[i.index].part}, ${i.parts[i.index].minutes} min.`);
        }
        lastPhase = i.index;
        redrawTimer();
      } else if (!i.finished) {
        const el = document.getElementById("timer-time");
        if (el) el.textContent = clock(i.left);
      }
    }
  }

  /* ---------- Shared pieces of a lesson ---------- */

  function overlineHtml(n, s, t) {
    if (n === 0) return `<p class="overline"><span class="tag tag--week" style="--wk: var(--accent); --wk-ink: var(--on-accent)">Before you start</span><span>${esc(DAY0.length)}</span></p>`;
    const l = lessonData(n), date = Cal.dateOf(s, n);
    return `<p class="overline"><span class="tag tag--week">Week ${l.week}</span><span>Day ${l.day}</span>` +
      `<span>${date === t ? "Today" : esc(Cal.formatLong(date))}</span>` +
      (l.kind !== "lesson" ? `<span class="tag tag--project">${esc(kindName(l))}</span>` : "") +
      (isDone(n) ? '<span class="tag tag--done">Done</span>' : "") + "</p>";
  }

  /* The lesson's picture: app/visuals.js puts the animated picture and its caption here. */
  function visualHtml(n) {
    return `<div class="vis-slot" data-vis="${n}"></div>`;
  }
  const thumb = (n) => (window.CourseVisuals ? window.CourseVisuals.thumbUrl(n) : "");

  function mountPictures() {
    if (!window.CourseVisuals) return;
    main.querySelectorAll("[data-vis]").forEach((el) => window.CourseVisuals.mount(el, +el.dataset.vis));
  }

  function chipsHtml(sc) {
    const xyz = /^([A-Z]), ([A-Z]) or ([A-Z])$/.exec(sc.keys);
    if (xyz) return `<span class="keys"><kbd class="key">${xyz[1]}</kbd><span class="key-sep">,</span><kbd class="key">${xyz[2]}</kbd><span class="key-sep">or</span><kbd class="key">${xyz[3]}</kbd></span>`;
    if (sc.type === "place") return `<span class="keys"><span class="key key--place">${esc(sc.keys)}</span></span>`;
    const parts = sc.type === "menu" ? sc.keys.split(", ") : sc.keys.split(" + ");
    const sep = sc.type === "menu" ? '<span class="key-sep" aria-hidden="true">›</span>' : '<span class="key-sep">+</span>';
    return `<span class="keys">${parts.map((k) => `<kbd class="key">${esc(k)}</kbd>`).join(sep)}</span>`;
  }

  function checklistHtml() {
    return `<ul class="checklist">${DAY0.checklist.map((c, i) => `<li><label class="check-item">
      <input type="checkbox" data-action="day0" data-i="${i}" ${S.dayZero && S.dayZero[i] ? "checked" : ""}>
      <span>${esc(c)}</span></label></li>`).join("")}</ul>`;
  }

  /* ---------- Set-up ---------- */

  const DAYS = [[1, "Mon", "Monday"], [2, "Tue", "Tuesday"], [3, "Wed", "Wednesday"], [4, "Thu", "Thursday"], [5, "Fri", "Friday"], [6, "Sat", "Saturday"], [0, "Sun", "Sunday"]];

  function renderSetup() {
    const t = todayKey();
    if (!setupDaysOff) setupDaysOff = C.course.defaultDaysOff.map((d) => ({ month: d.month, day: d.day, name: d.name }));
    main.innerHTML = `
      <div class="screen-head enter">
        <p class="overline">Welcome</p>
        <h1 class="screen-title">Set up your course</h1>
        <p class="screen-lead">Six weeks of Blender 5.2 LTS, one short lesson a day. It takes under a minute, and everything stays on this device.</p>
      </div>
      <form class="card form enter" id="setup" novalidate>
        <div class="field">
          <label class="label" for="su-name">Your name, for the certificate</label>
          <input class="input" id="su-name" autocomplete="name" required aria-describedby="su-name-err">
          <p class="error-text" id="su-name-err" hidden>Please type your name. It goes on your certificate.</p>
        </div>
        <div class="field">
          <label class="label" for="su-start">Start date</label>
          <input class="input" type="date" id="su-start" value="${t}" required aria-describedby="su-start-hint">
          <p class="hint" id="su-start-hint">Lesson 1 is on the first lesson day from this date.</p>
        </div>
        <fieldset class="field">
          <legend class="label">Lesson days</legend>
          <div class="chips">${DAYS.map(([v, short, long]) => `<label class="chip-check"><input type="checkbox" name="su-day" value="${v}" ${v >= 1 && v <= 5 ? "checked" : ""} aria-label="${long}"><span aria-hidden="true">${short}</span></label>`).join("")}</div>
          <p class="error-text" id="su-days-err" hidden>Choose at least one lesson day.</p>
        </fieldset>
        <div class="two-up">
          <div class="field">
            <label class="label" for="su-time">Lesson time</label>
            <input class="input" type="time" id="su-time" value="16:00" required aria-describedby="su-time-hint">
            <p class="hint" id="su-time-hint">Your device's own time.</p>
          </div>
          <div class="field">
            <label class="label" for="su-min">Minutes per lesson</label>
            <input class="input" type="number" id="su-min" value="45" min="15" max="240" step="5" inputmode="numeric" required>
          </div>
        </div>
        <fieldset class="field">
          <legend class="label">Days off</legend>
          <ul class="daysoff" id="su-off-list"></ul>
          <div class="two-up">
            <div class="field"><label class="label" for="su-off-date">Add a date</label><input class="input" type="date" id="su-off-date"></div>
            <div class="field"><label class="label" for="su-off-name">Name (optional)</label><input class="input" id="su-off-name"></div>
          </div>
          <div><button class="btn" type="button" data-action="su-add-off">Add day off</button></div>
        </fieldset>
        <fieldset class="field">
          <legend class="label">Do you have Blender 5.2 LTS?</legend>
          <div class="chips">
            <label class="chip-check"><input type="radio" name="su-blender" value="yes"><span>Yes</span></label>
            <label class="chip-check"><input type="radio" name="su-blender" value="not yet"><span>Not yet</span></label>
          </div>
          <p class="hint"><a href="${esc(C.course.download)}" target="_blank" rel="noopener">Get Blender 5.2 LTS from blender.org</a>. Any 5.2 update is fine.</p>
        </fieldset>
        <p class="muted" id="su-preview" aria-live="polite"></p>
        <div class="actions">
          <button class="btn btn--primary" type="submit">Build my course</button>
          <button class="btn btn--ghost" type="button" data-action="restore">Restore from backup</button>
        </div>
      </form>`;
    drawDaysOff();
    updatePreview();
  }

  function setupValues() {
    const start = document.getElementById("su-start").value;
    const days = Array.from(main.querySelectorAll('input[name="su-day"]:checked')).map((x) => +x.value);
    const time = document.getElementById("su-time").value;
    const minutes = parseInt(document.getElementById("su-min").value, 10);
    const blender = main.querySelector('input[name="su-blender"]:checked');
    return {
      name: document.getElementById("su-name").value.trim(),
      start: Cal.isKey(start) ? start : todayKey(),
      days,
      time: /^\d{2}:\d{2}$/.test(time) ? time : "16:00",
      minutes: Math.min(240, Math.max(15, isNaN(minutes) ? 45 : minutes)),
      blender: blender ? blender.value : ""
    };
  }

  function drawDaysOff() {
    const list = document.getElementById("su-off-list");
    if (!list) return;
    list.innerHTML = setupDaysOff.map((d, i) => {
      const when = d.date ? Cal.formatLong(d.date) : `${d.day} ${Cal.MONTHS[d.month - 1]}, every year`;
      return `<li><span>${esc(when)}${d.name ? " · " + esc(d.name) : ""}</span>
        <button type="button" class="icon-btn" data-action="su-remove-off" data-i="${i}" aria-label="Remove the day off: ${esc(when)}">${ICON.close}</button></li>`;
    }).join("") || '<li><span class="muted">No days off.</span></li>';
  }

  function updatePreview() {
    const out = document.getElementById("su-preview");
    if (!out) return;
    const v = setupValues();
    if (!v.days.length) { out.textContent = "Choose at least one lesson day."; return; }
    const s = Cal.schedule(Cal.newPlan({ startDate: v.start, lessonDays: v.days, daysOff: setupDaysOff, lessonCount: COUNT }));
    out.textContent = s.problem ? s.problem :
      `Your course: ${COUNT} lessons, from ${Cal.formatLong(s.lessons[0].date)} to ${Cal.formatLong(s.finishDate)}.`;
  }

  function submitSetup() {
    const v = setupValues();
    const nameInput = document.getElementById("su-name"), nameErr = document.getElementById("su-name-err");
    const daysErr = document.getElementById("su-days-err");
    nameErr.hidden = !!v.name;
    nameInput.setAttribute("aria-invalid", v.name ? "false" : "true");
    daysErr.hidden = v.days.length > 0;
    if (!v.name) { nameInput.focus(); return; }
    if (!v.days.length) { main.querySelector('input[name="su-day"]').focus(); return; }
    const plan = Cal.newPlan({ startDate: v.start, lessonDays: v.days, daysOff: setupDaysOff, lessonCount: COUNT });
    S = Store.fresh({ name: v.name, lessonTime: v.time, lessonMinutes: v.minutes, hasBlender: v.blender, plan });
    save();
    const s = schedule();
    flash = `Your course is ready, ${v.name}: ${COUNT} lessons, from ${Cal.formatLong(s.lessons[0].date)} to ${Cal.formatLong(s.finishDate)}.`;
    setupDaysOff = null;
    go("#/today");
  }

  function addSetupDayOff() {
    const dateEl = document.getElementById("su-off-date"), nameEl2 = document.getElementById("su-off-name");
    if (!Cal.isKey(dateEl.value)) { dateEl.focus(); toast("Choose a date first."); return; }
    if (!setupDaysOff.some((d) => d.date === dateEl.value)) setupDaysOff.push({ date: dateEl.value, name: nameEl2.value.trim() });
    setupDaysOff.sort((a, b) => (a.date || "9999") < (b.date || "9999") ? -1 : 1);
    dateEl.value = ""; nameEl2.value = "";
    drawDaysOff(); updatePreview();
  }

  /* ---------- Today ---------- */

  function renderToday() {
    const t = todayKey(), s = schedule(), out = [];
    if (flash) { out.push(noticeHtml(`<p>${esc(flash)}</p>`, "kind")); flash = null; }
    if (S.settings.hasBlender === "not yet") {
      out.push(noticeHtml(`<p>Install Blender 5.2 LTS before lesson 1. <a href="${esc(C.course.download)}" target="_blank" rel="noopener">Get it from blender.org</a>.</p>
        <div class="actions"><button type="button" class="btn btn--small" data-action="have-blender">I have it now</button></div>`));
    }
    if (s.problem) { out.push(noticeHtml(`<p>${esc(s.problem)}</p>`)); main.innerHTML = out.join(""); return; }
    out.push(fridayHtml(s, t));

    const first = s.lessons[0].date;
    const behind = s.lessons.find((l) => l.date < t && !isDone(l.number));
    const todays = Cal.lessonOn(s, t);
    if (behind) out.push(catchUpHtml(behind, t));

    if (t < first) {
      out.push(beforeStartHtml(s, t));
    } else if (todays) {
      out.push(heroHtml(todays, s, t));
      out.push(recapTeaserHtml(todays, s));
    } else if (!behind && LESSONS.every((l) => isDone(l.number))) {
      out.push(finishedHtml());
    } else if (!behind && t > s.finishDate) {
      out.push(finishedHtml());
    } else {
      out.push(noLessonHtml(s, t));
    }
    main.innerHTML = out.join("");
  }

  function heroHtml(n, s, t) {
    const l = lessonData(n), date = Cal.dateOf(s, n), done = isDone(n), timing = S.timer && S.timer.lesson === n;
    const actions = done
      ? `<p class="done-mark pop">${ICON.tick} Done${S.done[n].on === t ? " today" : ""}</p>
         <a class="btn btn--ghost" href="#/lesson/${n}">Open the full lesson</a>
         <button type="button" class="btn btn--ghost" data-action="undone" data-n="${n}">Not done after all</button>`
      : `${timing ? "" : `<button type="button" class="btn btn--primary" data-action="timer-start" data-n="${n}">${ICON.timer} Start lesson timer</button>`}
         <button type="button" class="btn ${timing ? "btn--primary" : ""}" data-action="done" data-n="${n}">${ICON.tick} I did it</button>
         ${date === t ? `<button type="button" class="btn btn--ghost" data-action="cant" data-n="${n}">Can't today, move it</button>` : ""}
         <button type="button" class="btn btn--ghost" data-action="copy" data-n="${n}">${ICON.copy} Copy message for my tutor</button>
         <a class="btn btn--ghost" href="#/lesson/${n}">Open the full lesson</a>`;
    return `<article class="card card--hero has-visual enter" style="${weekVar(n)}" aria-labelledby="hero-title">
      <div class="hero-head">
      ${overlineHtml(n, s, t)}
      <h1 class="big-title" id="hero-title">${esc(l.title)}</h1>
      <p class="idea">${linked(l.ideaInOneSentence, n)}</p>
      </div>
      <div class="hero-visual">${visualHtml(n)}</div>
      <div class="hero-body">
      <dl class="facts facts--two">
        <div><dt>What you'll make</dt><dd>${linked(l.youMake, n)}</dd></div>
        <div><dt>Proof to send</dt><dd>${linked(l.proofToSend, n)}</dd></div>
      </dl>
      <p class="countdown" id="countdown" data-n="${n}" data-date="${date}">${countdownHtml(n, date, t)}</p>
      <div id="timer-box">${timerHtml(n)}</div>
      <div class="actions actions--hero">${actions}</div>
      </div>
    </article>`;
  }

  function recapTeaserHtml(n, s) {
    const prev = lessonData(n - 1);
    const recap = `<section class="card enter" aria-labelledby="recap-title">
      <p class="overline">3-minute recap · ${esc(labelOf(n - 1))}</p>
      <h2 class="card-title" id="recap-title">${esc(prev.title)}</h2>
      <p class="muted">${linked(prev.ideaInOneSentence, n)}</p>
      <p class="small muted">You made: ${linked(prev.youMake, n)}</p>
      <a class="btn btn--ghost btn--small" href="#/lesson/${n - 1}">Open it</a>
    </section>`;
    let teaser;
    if (n < COUNT) {
      const nl = lessonData(n + 1), date = Cal.dateOf(s, n + 1);
      teaser = `<section class="card enter" aria-labelledby="next-title">
        <p class="overline">Next · ${esc(Cal.formatNoYear(date))}</p>
        <h2 class="card-title" id="next-title">${esc(nl.title)}</h2>
        <p class="muted">${linked(nl.ideaInOneSentence, n + 1)}</p>
        <a class="btn btn--ghost btn--small" href="#/lesson/${n + 1}">Have a look</a>
      </section>`;
    } else {
      teaser = `<section class="card enter" aria-labelledby="next-title">
        <p class="overline">After the course</p>
        <h2 class="card-title" id="next-title">${esc(lessonData(COUNT).next)}</h2>
      </section>`;
    }
    return `<div class="two-up">${recap}${teaser}</div>`;
  }

  function catchUpHtml(b, t) {
    const preview = Cal.catchUp(S.plan, b.number, t, WEEKS);
    const to = preview.change ? preview.change.to : t;
    return noticeHtml(`<p><strong>${esc(labelOf(b.number))}</strong> was on ${esc(Cal.formatNoYear(b.date))} and isn't ticked yet: ${esc(lessonData(b.number).title)}.</p>
      <div class="actions">
        <button type="button" class="btn btn--small" data-action="done" data-n="${b.number}">I did it</button>
        <button type="button" class="btn btn--small btn--ghost" data-action="catchup" data-n="${b.number}">Move it to ${to === t ? "today" : esc(Cal.formatNoYear(to))}</button>
        <a class="btn btn--small btn--ghost" href="#/lesson/${b.number}">Open it</a>
      </div>`);
  }

  function beforeStartHtml(s, t) {
    const first = s.lessons[0].date, l1 = lessonData(1);
    return `<article class="card card--hero has-visual enter" style="--wk: var(--accent); --wk-ink: var(--on-accent)" aria-labelledby="hero-title">
        <div class="hero-head">
        ${overlineHtml(0, s, t)}
        <h1 class="big-title" id="hero-title">${esc(DAY0.title)}</h1>
        <p class="idea">${linked(DAY0.ideaInOneSentence, 0)}</p>
        </div>
        <div class="hero-visual">${visualHtml(0)}</div>
        <div class="hero-body">
        ${checklistHtml()}
        <p class="countdown">Your first lesson: <strong>${esc(Cal.formatLong(first))}</strong> at <strong>${esc(S.settings.lessonTime)}</strong> · ${inDays(t, first)}</p>
        <div class="actions"><a class="btn btn--ghost" href="#/lesson/0">Open the full step</a></div>
        </div>
      </article>
      <section class="card enter" style="${weekVar(1)}" aria-labelledby="next-title">
        <p class="overline">Lesson 1 · ${esc(Cal.formatNoYear(first))}</p>
        <h2 class="card-title" id="next-title">${esc(l1.title)}</h2>
        <p class="muted">${linked(l1.ideaInOneSentence, 1)}</p>
        <a class="btn btn--ghost btn--small" href="#/lesson/1">Have a look</a>
      </section>`;
  }

  function noLessonHtml(s, t) {
    const info = Cal.dayInfo(S.plan, s, t);
    const next = Cal.nextLessonFrom(s, t);
    const past = s.lessons.filter((l) => l.date < t).pop();
    const title = info.dayOff ? `Day off: ${info.dayOff}` : info.missed ? "No lesson today: it moved" : "No lesson today";
    const practice = past
      ? `<p class="muted">${esc(C.course.dayOff.practice)}</p><p class="small muted">Last lesson, ${esc(labelOf(past.number))}: ${linked(lessonData(past.number).youMake, past.number)}</p>`
      : "";
    let html = `<article class="card card--hero enter" style="--wk: var(--day-off)" aria-labelledby="hero-title">
        <p class="overline">${esc(Cal.formatLong(t))}</p>
        <h1 class="big-title" id="hero-title">${esc(title)}</h1>
        <p class="idea">${esc(C.course.dayOff.text)}</p>
        ${practice ? `<h2 class="section-title">A small practice idea</h2>${practice}` : ""}
      </article>`;
    if (next) {
      const nl = lessonData(next.number);
      html += `<section class="card enter" style="${weekVar(next.number)}" aria-labelledby="next-title">
        <p class="overline"><span class="tag tag--week">Week ${nl.week}</span><span>Day ${nl.day}</span><span>Next lesson</span></p>
        <h2 class="card-title" id="next-title">${esc(nl.title)}</h2>
        <p class="muted">${linked(nl.ideaInOneSentence, next.number)}</p>
        <p class="countdown" id="countdown" data-n="${next.number}" data-date="${next.date}">${countdownHtml(next.number, next.date, t)}</p>
        <div class="actions"><a class="btn btn--ghost btn--small" href="#/lesson/${next.number}">Have a look</a></div>
      </section>`;
    }
    return html;
  }

  function finishedHtml() {
    return `<article class="card card--hero enter" aria-labelledby="hero-title">
      <p class="overline">The end of the course</p>
      <h1 class="big-title" id="hero-title">All ${COUNT} lessons done</h1>
      <p class="idea">Your certificate opens once all nine points of the final project standard are ticked.</p>
      <p class="muted">${esc(lessonData(COUNT).next)}</p>
    </article>`;
  }

  /* ---------- Calendar ---------- */

  function clampMonth(ym, lo, hi) { return ym < lo ? lo : ym > hi ? hi : ym; }
  function shiftMonth(ym, by) {
    let [y, m] = ym.split("-").map(Number);
    m += by;
    while (m < 1) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    return y + "-" + pad2(m);
  }

  function renderCalendar(listView) {
    const s = schedule(), t = todayKey();
    const first = s.lessons[0].date, finish = s.finishDate || s.lessons[s.lessons.length - 1].date;
    const lo = first.slice(0, 7), hi = finish.slice(0, 7);
    calMonth = clampMonth(calMonth || t.slice(0, 7), lo, hi);
    const [y, m] = calMonth.split("-").map(Number);
    const head = `<div class="screen-head enter">
        <h1 class="screen-title">Calendar</h1>
        <p class="screen-lead">${COUNT} lessons, from ${esc(Cal.formatNoYear(first))} to ${esc(Cal.formatLong(finish))}.</p>
      </div>`;
    const seg = `<nav class="seg" aria-label="Calendar view">
        <a href="#/calendar" ${listView ? "" : 'aria-current="page"'}>Month</a>
        <a href="#/calendar/list" ${listView ? 'aria-current="page"' : ""}>List</a>
      </nav>`;
    if (listView) {
      main.innerHTML = head + `<div class="cal-bar enter">${seg}</div>` + lessonListHtml(s, t);
      return;
    }
    main.innerHTML = head + `<div class="cal-bar enter">
        <div class="month-nav">
          <button type="button" class="icon-btn" data-action="month" data-by="-1" aria-label="Previous month" ${calMonth <= lo ? "disabled" : ""}>${ICON.left}</button>
          <h2 class="month-title" aria-live="polite">${Cal.MONTHS[m - 1]} ${y}</h2>
          <button type="button" class="icon-btn" data-action="month" data-by="1" aria-label="Next month" ${calMonth >= hi ? "disabled" : ""}>${ICON.right}</button>
        </div>${seg}</div>` + monthGridHtml(calMonth, s, t) + legendHtml();
  }

  function monthGridHtml(ym, s, t) {
    const [y, m] = ym.split("-").map(Number);
    const firstDay = Cal.makeKey(y, m, 1);
    let d = Cal.addDays(firstDay, -((Cal.weekday(firstDay) + 6) % 7));
    const rows = [];
    for (let r = 0; r < 6; r++) {
      const row = [];
      for (let c = 0; c < 7; c++) { row.push(d); d = Cal.addDays(d, 1); }
      if (row.some((k) => k.slice(0, 7) === ym)) rows.push(row);
    }
    const cell = (key) => {
      if (key.slice(0, 7) !== ym) return '<td><span class="cal-day is-outside" aria-hidden="true"></span></td>';
      const info = Cal.dayInfo(S.plan, s, key), dayNum = +key.slice(8), isT = key === t ? " is-today" : "";
      const long = Cal.formatLong(key) + (key === t ? ", today" : "");
      if (info.lesson) {
        const n = info.lesson, l = lessonData(n), done = isDone(n), proj = l.kind !== "lesson";
        return `<td><a class="cal-day is-lesson${isT}" href="#/lesson/${n}" style="${weekVar(n)}"
          aria-label="${esc(long)}: ${esc(labelOf(n))}, ${esc(l.title)}${proj ? ", " + esc(kindName(l).toLowerCase()) : ""}${done ? ", done" : ""}">
          <span class="cal-top"><span class="d">${dayNum}</span><span class="cal-marks">${proj ? `<span class="star-inline">${ICON.star}</span>` : ""}${done ? `<span class="tick-inline">${ICON.tick}</span>` : ""}</span></span>
          <img class="cal-thumb" src="${thumb(n)}" alt="" loading="lazy" width="192" height="108">
          <span class="cal-bottom"><span class="n">${n}</span><span class="tiny">W${l.week} · D${l.day}</span></span></a></td>`;
      }
      if (info.dayOff) return `<td><div class="cal-day is-off${isT}" role="img" aria-label="${esc(long)}: day off, ${esc(info.dayOff)}"><span class="d">${dayNum}</span><span class="tiny">Day off</span></div></td>`;
      if (info.missed) return `<td><div class="cal-day is-missed${isT}" role="img" aria-label="${esc(long)}: lesson moved"><span class="d">${dayNum}</span><span class="tiny">Moved</span></div></td>`;
      return `<td><div class="cal-day${isT}" role="img" aria-label="${esc(long)}: no lesson"><span class="d">${dayNum}</span></div></td>`;
    };
    return `<table class="cal-grid enter" aria-label="${Cal.MONTHS[m - 1]} ${y}">
      <thead><tr>${DAYS.map(([, short, long]) => `<th scope="col"><abbr title="${long}">${short}</abbr></th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map(cell).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function legendHtml() {
    return `<ul class="legend enter" aria-label="What the colours mean">
      ${WEEKS.map((w) => `<li><span class="swatch" style="--wk: var(--week-${w.week})"></span>Week ${w.week}</li>`).join("")}
      <li><span class="swatch"></span>Day off</li>
      <li><span class="swatch swatch--moved"></span>Moved</li>
      <li><span class="legend-icon star-colour">${ICON.star}</span>Week project</li>
      <li><span class="legend-icon tick-colour">${ICON.tick}</span>Done</li>
    </ul>`;
  }

  function lessonListHtml(s, t) {
    const item = (n) => {
      const l = lessonData(n), date = Cal.dateOf(s, n), done = isDone(n), proj = l.kind !== "lesson";
      return `<li><a class="lesson-link" href="#/lesson/${n}" style="${weekVar(n)}">
        <span class="num">${n}</span><img class="list-thumb" src="${thumb(n)}" alt="" loading="lazy" width="192" height="108">
        <span class="t">${esc(l.title)}<span class="when">${esc(labelOf(n))} · ${date === t ? "Today" : esc(Cal.formatLong(date))}${proj ? " · " + esc(kindName(l)) : ""}</span></span>
        <span class="state">${done ? `<span class="tick-colour" aria-label="Done">${ICON.tick}</span>` : proj ? `<span class="star-colour" aria-hidden="true">${ICON.star}</span>` : ""}</span>
      </a></li>`;
    };
    const day0 = `<section class="week-block enter" style="--wk: var(--accent); --wk-ink: var(--on-accent)">
        <div class="week-head"><span class="tag tag--week">Before you start</span><h2>${esc(DAY0.title)}</h2></div>
        <ul class="lesson-list"><li><a class="lesson-link" href="#/lesson/0">
          <span class="num">0</span><img class="list-thumb" src="${thumb(0)}" alt="" loading="lazy" width="192" height="108"><span class="t">${esc(DAY0.title)}<span class="when">${esc(DAY0.length)}</span></span>
          <span class="state">${dayZeroDone() ? `<span class="tick-colour" aria-label="Done">${ICON.tick}</span>` : ""}</span></a></li></ul>
      </section>`;
    return day0 + WEEKS.map((w) => {
      const nums = [];
      for (let n = w.firstLesson; n <= w.lastLesson; n++) nums.push(n);
      return `<section class="week-block enter" style="--wk: var(--week-${w.week})" aria-labelledby="wk-${w.week}">
        <div class="week-head"><span class="tag tag--week">Week ${w.week}</span><h2 id="wk-${w.week}">${esc(w.theme)}</h2></div>
        <ul class="lesson-list">${nums.map(item).join("")}</ul></section>`;
    }).join("");
  }

  /* ---------- Lesson sheet ---------- */

  function renderLesson(n) {
    if (!(Number.isInteger(n) && n >= 0 && n <= COUNT)) {
      main.innerHTML = `<div class="screen-head"><h1 class="screen-title">There's no lesson here</h1>
        <p class="screen-lead"><a href="#/calendar/list">See all the lessons</a>.</p></div>`;
      return;
    }
    const s = schedule(), t = todayKey(), l = lessonData(n);
    const shortcuts = C.shortcuts.filter((x) => x.firstLesson === n);
    const nextDate = n < COUNT ? Cal.dateOf(s, n + 1) : null;
    const facts = [
      ["The one idea", linked(l.oneIdea, n)],
      ["What you'll make", linked(l.youMake, n)],
      ["Proof to send", linked(l.proofToSend, n)],
      ["Builds on", linked(l.buildsOn, n)],
      ["Next", linked(l.next, n) + (nextDate ? ` <span class="muted">(${esc(Cal.formatNoYear(nextDate))})</span>` : "")]
    ];
    const guide = (l.stepByStepGuide || "").trim();
    const doneBlock = n === 0 ? "" : isDone(n)
      ? `<p class="done-mark">${ICON.tick} Done on ${esc(Cal.formatLong(S.done[n].on))}</p>
         <button type="button" class="btn btn--ghost" data-action="undone" data-n="${n}">Not done after all</button>`
      : `<button type="button" class="btn btn--primary" data-action="done" data-n="${n}">${ICON.tick} I did it</button>`;
    main.innerHTML = `
      <div class="sheet-nav sheet-nav--top enter"><a class="btn btn--ghost btn--small" href="#/calendar/list">${ICON.left} All lessons</a></div>
      <article class="card card--hero has-visual enter" style="${weekVar(n)}" aria-labelledby="sheet-title">
        <div class="hero-head">
        ${overlineHtml(n, s, t)}
        <h1 class="big-title" id="sheet-title">${esc(l.title)}</h1>
        <p class="idea">${linked(l.ideaInOneSentence, n)}</p>
        </div>
        <div class="hero-visual">${visualHtml(n)}</div>
        <div class="hero-body">
        <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        ${n === 0 ? `<h2 class="section-title">Checklist</h2>${checklistHtml()}` : ""}
        ${shortcuts.length ? `<h2 class="section-title">Keys and buttons in this lesson</h2>
          <ul class="shortcut-list">${shortcuts.map((sc) => `<li>${chipsHtml(sc)}<span>${esc(sc.does)}${sc.where ? ` <span class="muted small">${esc(sc.where)}</span>` : ""}</span></li>`).join("")}</ul>` : ""}
        <h2 class="section-title">Step-by-step guide</h2>
        ${guide ? guide.split(/\n+/).map((p) => `<p>${linked(p, n)}</p>`).join("") : '<p class="guide-empty">Filled in after the lesson.</p>'}
        <h2 class="section-title">My work</h2>
        <div id="sheet-work"><p class="muted">Loading…</p></div>
        ${doneBlock ? `<div class="actions">${doneBlock}</div>` : ""}
        </div>
      </article>
      <nav class="sheet-nav enter" aria-label="Other lessons">
        ${n > 0 ? `<a class="btn btn--ghost" href="#/lesson/${n - 1}">${ICON.left} ${esc(labelOf(n - 1))}</a>` : "<span></span>"}
        ${n < COUNT ? `<a class="btn btn--ghost" href="#/lesson/${n + 1}">${esc(labelOf(n + 1))} ${ICON.right}</a>` : ""}
      </nav>`;
    fillSheetWork(n);
  }

  /* ---------- Course map ---------- */

  function currentLesson(s, t) {
    const todays = Cal.lessonOn(s, t);
    if (todays && !isDone(todays)) return todays;
    const open = s.lessons.find((l) => !isDone(l.number));
    return open ? open.number : null;
  }

  function renderMap() {
    const s = schedule(), t = todayKey(), cur = currentLesson(s, t);
    main.innerHTML = `
      <div class="screen-head enter">
        <h1 class="screen-title">Course map</h1>
        <p class="screen-lead">Every lesson is a level. Nothing is locked: look ahead whenever you like.</p>
      </div>
      <a class="map-start enter ${dayZeroDone() ? "is-done" : ""}" href="#/lesson/0">
        <span class="dot">${dayZeroDone() ? ICON.tick : "0"}</span><span>Before you start: ${esc(DAY0.title)}</span></a>
      ${WEEKS.map((w) => weekPathHtml(w, s, t, cur)).join("")}`;
    const here = main.querySelector(".is-current");
    if (here) here.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  function weekPathHtml(w, s, t, cur) {
    const step = 84, nums = [];
    for (let n = w.firstLesson; n <= w.lastLesson; n++) nums.push(n);
    const H = nums.length * step;
    const flip = w.week % 2 === 0;
    const pts = nums.map((n, i) => ({ n, x: (i % 2 === 0) !== flip ? 30 : 70, y: step / 2 + i * step }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += ` C ${a.x} ${a.y + step / 2} ${b.x} ${b.y - step / 2} ${b.x} ${b.y}`;
    }
    const nodes = pts.map((p) => {
      const l = lessonData(p.n), done = isDone(p.n), proj = l.kind !== "lesson", date = Cal.dateOf(s, p.n);
      const cls = ["map-node", done ? "is-done" : "", proj ? "is-project" : "", cur === p.n ? "is-current" : ""].join(" ");
      const where = p.x < 50 ? `left: calc(${p.x}% + 44px); right: 0` : `left: 0; right: calc(${100 - p.x}% + 44px)`;
      return `<a class="${cls}" href="#/lesson/${p.n}" style="left: ${p.x}%; top: ${p.y}px"
          aria-label="${p.n}. ${esc(labelOf(p.n))}: ${esc(l.title)}. ${date === t ? "Today" : esc(Cal.formatLong(date))}${done ? ". Done" : ""}${cur === p.n ? ". You are here" : ""}">
          ${p.n}${proj ? `<span class="star">${ICON.star}</span>` : ""}${done ? `<span class="tick">${ICON.tick}</span>` : ""}</a>
        <span class="map-label ${p.x < 50 ? "" : "is-left"}" style="top: ${p.y}px; ${where}" aria-hidden="true"><strong>Day ${l.day}</strong> · ${esc(l.title)}</span>`;
    }).join("");
    return `<section class="map-week enter" style="--wk: var(--week-${w.week})" aria-labelledby="map-wk-${w.week}">
      <div class="map-week-head"><span class="tag tag--week">Week ${w.week}</span><h2 id="map-wk-${w.week}">${esc(w.theme)}</h2></div>
      <div class="map-path" style="height: ${H}px">
        <svg class="map-line" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>
        ${nodes}
      </div></section>`;
  }

  /* ---------- Actions ---------- */

  async function markDone(n) {
    const l = lessonData(n);
    const r = await openDialog({
      title: `${labelOf(n)}: done?`,
      html: `<p class="dlg-text">${esc(l.title)}. Add a note for yourself if you like. Both are optional.</p>
        <div class="form">
          <div class="field"><label class="label" for="dn-hard">What was hard?</label><textarea class="textarea" id="dn-hard" maxlength="1000"></textarea></div>
          <label class="check-item"><input type="checkbox" id="dn-repeat"><span>Repeat this lesson later</span></label>
        </div>`,
      actions: [{ label: "Not yet", value: "cancel" }, { label: "Tick it off", value: "save", primary: true }]
    });
    if (r.value !== "save") return;
    S.done[n] = { on: todayKey(), hard: r.form.querySelector("#dn-hard").value.trim(), repeat: r.form.querySelector("#dn-repeat").checked };
    if (S.timer && S.timer.lesson === n) S.timer = null;
    save();
    const big = l.kind !== "lesson";
    celebrate(big);
    toast(l.kind === "week project" ? `Week ${l.week} project done. That's the whole of week ${l.week}!` : `${labelOf(n)} done. Nice work.`);
    route();
  }

  function markUndone(n) {
    delete S.done[n];
    save();
    toast(`${labelOf(n)} is not ticked any more.`);
    route();
  }

  async function cantToday(n) {
    const t = todayKey(), preview = Cal.markMissed(S.plan, t, t, WEEKS);
    if (!preview.change) return;
    const r = await openDialog({
      title: "Move today's lesson?",
      html: `<p class="dlg-text">${esc(labelOf(n))} moves to ${esc(Cal.formatNoYear(preview.change.to))}, and every later lesson moves one lesson day. Nothing is squeezed or skipped.</p>`,
      actions: [{ label: "Keep it today", value: "cancel" }, { label: "Yes, move it", value: "move", primary: true }]
    });
    if (r.value !== "move") return;
    S.plan = preview.plan;
    if (S.timer && S.timer.lesson === n) S.timer = null;
    save();
    flash = preview.change.kindMessage;
    route();
    main.focus();
  }

  function catchUp(n) {
    const r = Cal.catchUp(S.plan, n, todayKey(), WEEKS);
    if (!r.change) return;
    S.plan = r.plan;
    save();
    flash = r.change.kindMessage;
    route();
    main.focus();
  }

  async function copyTutor(n) {
    const text = `Start today's lesson: ${labelOf(n)}, ${sentence(lessonData(n).title)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied. Paste it into your chat with your tutor.");
    } catch (e) {
      openDialog({
        title: "Copy this message",
        html: `<label class="sr-only" for="copy-text">Message for your tutor</label><textarea class="textarea" id="copy-text" readonly>${esc(text)}</textarea>`,
        actions: [{ label: "Done", value: "ok", primary: true }],
        onOpen: (d) => { const ta = d.querySelector("#copy-text"); ta.focus(); ta.select(); }
      });
    }
  }

  function timerAction(kind, n) {
    const now = Date.now();
    if (kind === "timer-start") {
      S.timer = { lesson: n, startedAt: now, pausedAt: null, pausedTotal: 0 };
      lastPhase = 0;
      save();
      route();
      const box = document.getElementById("timer-box");
      if (box) box.querySelector("button").focus();
      toast(`Timer started: ${routineScaled()[0].part}, ${routineScaled()[0].minutes} min.`);
      return;
    }
    if (!S.timer) return;
    if (kind === "timer-pause") {
      if (S.timer.pausedAt) { S.timer.pausedTotal += now - S.timer.pausedAt; S.timer.pausedAt = null; }
      else S.timer.pausedAt = now;
    } else if (kind === "timer-next") {
      const i = timerInfo(now);
      if (!i.finished) S.timer.startedAt -= (i.phaseEnd - i.elapsed) * 1000;
    } else if (kind === "timer-stop") {
      S.timer = null;
      save();
      route();
      return;
    }
    save();
    redrawTimer();
    const focusBtn = main.querySelector(`#timer-box [data-action="${kind}"]`);
    if (focusBtn) focusBtn.focus();
  }

  main.addEventListener("click", (e) => {
    const term = e.target.closest(".term");
    if (term) { showTerm(term.dataset.term); return; }
    const el = e.target.closest("[data-action]");
    if (!el || el.tagName === "INPUT") return;
    const n = el.dataset.n !== undefined ? +el.dataset.n : null;
    switch (el.dataset.action) {
      case "done": markDone(n); break;
      case "undone": markUndone(n); break;
      case "cant": cantToday(n); break;
      case "catchup": catchUp(n); break;
      case "copy": copyTutor(n); break;
      case "timer-start": case "timer-pause": case "timer-next": case "timer-stop": timerAction(el.dataset.action, n); break;
      case "month": {
        calMonth = shiftMonth(calMonth, +el.dataset.by);
        route();
        /* Keep keyboard focus on an arrow; if this one is now switched off, use the other. */
        const same = main.querySelector(`[data-action="month"][data-by="${el.dataset.by}"]`);
        const other = main.querySelector(`[data-action="month"][data-by="${-el.dataset.by}"]`);
        if (same && !same.disabled) same.focus(); else if (other) other.focus();
        break;
      }
      case "have-blender": S.settings.hasBlender = "yes"; save(); toast("Great. You're ready."); route(); break;
      case "su-add-off": addSetupDayOff(); break;
      case "su-remove-off": setupDaysOff.splice(+el.dataset.i, 1); drawDaysOff(); updatePreview(); break;
      case "restore": restoreBackup(); break;
      case "backup": downloadBackup(); break;
      case "ics": downloadIcs(); break;
      case "reset": resetCourse(); break;
      case "add-pic": addPicture(n); break;
      case "view-pic": viewPicture(el.dataset.id); break;
      case "print": window.print(); break;
      case "install": installApp(); break;
      case "st-add-off": settingsDayOff("add"); break;
      case "st-remove-off": settingsDayOff("remove", +el.dataset.i); break;
      default: break;
    }
  });

  main.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.action === "day0") {
      S.dayZero = S.dayZero || [];
      S.dayZero[+el.dataset.i] = el.checked;
      save();
      if (el.checked && dayZeroDone()) { celebrate(false); toast("All set. You're ready for lesson 1."); }
      return;
    }
    if (el.dataset && el.dataset.action === "std") {
      S.standard = S.standard || [];
      S.standard[+el.dataset.i] = el.checked;
      save();
      if (el.checked && C.standard.every((_, i) => S.standard[i])) { celebrate(true); toast("All nine points ticked."); }
      return;
    }
    if (el.name === "st-theme") { S.settings.theme = el.value; save(); applyTheme(); return; }
    if (el.closest && el.closest("#setup")) updatePreview();
  });
  main.addEventListener("input", (e) => {
    if (e.target.id === "g-search") { filterGlossary(e.target.value); return; }
    if (e.target.closest && e.target.closest("#setup")) updatePreview();
  });
  main.addEventListener("submit", (e) => {
    if (e.target.id === "setup") { e.preventDefault(); submitSetup(); }
    else if (e.target.id === "settings-form") { e.preventDefault(); saveSettings(); }
    else if (e.target.id === "reviewer-form") {
      e.preventDefault();
      S.reviewer = document.getElementById("cert-reviewer").value.trim();
      save();
      toast(S.reviewer ? "Saved." : "The name was cleared.");
      route();
    }
  });

  /* ---------- Shared for the new screens ---------- */

  const Files = window.CourseFiles;
  let renderToken = 0;
  let objectUrls = [];
  function freeUrls() { objectUrls.forEach((u) => URL.revokeObjectURL(u)); objectUrls = []; }
  function urlFor(blob) { const u = URL.createObjectURL(blob); objectUrls.push(u); return u; }
  const doneCount = () => LESSONS.filter((l) => isDone(l.number)).length;
  const firstName = () => { const f = (S.learner.name || "").trim(); const i = f.search(/\s/); return i > 0 ? f.slice(0, i) : f; };
  function lessonOptions(selected) {
    const opts = [0].concat(LESSONS.map((l) => l.number));
    return opts.map((n) => `<option value="${n}" ${n === selected ? "selected" : ""}>${esc(labelOf(n))}: ${esc(lessonData(n).title)}</option>`).join("");
  }
  function screenHead(title, lead, over) {
    return `<div class="screen-head enter">${over ? `<p class="overline">${esc(over)}</p>` : ""}<h1 class="screen-title">${esc(title)}</h1>${lead ? `<p class="screen-lead">${lead}</p>` : ""}</div>`;
  }

  /* ---------- Progress ---------- */

  function weekRange(t) { const mon = Cal.addDays(t, -((Cal.weekday(t) + 6) % 7)); return [mon, Cal.addDays(mon, 6)]; }

  function streakCount(s, t) {
    let n = 0;
    const past = s.lessons.filter((l) => l.date <= t);
    for (let i = past.length - 1; i >= 0; i--) {
      if (isDone(past[i].number)) n++;
      else if (past[i].date === t) continue;
      else break;
    }
    return n;
  }

  function thisWeekHtml(s, t) {
    const [mon, sun] = weekRange(t);
    const list = s.lessons.filter((l) => l.date >= mon && l.date <= sun);
    const doneN = list.filter((l) => isDone(l.number)).length;
    const notes = list.filter((l) => isDone(l.number) && S.done[l.number].hard);
    const next = s.lessons.find((l) => l.date > sun);
    const friday = Cal.weekday(t) === 5;
    return `<section class="card report enter" id="this-week" aria-labelledby="week-title">
      <p class="overline">${friday ? "Friday report card" : "This week so far"} · ${esc(Cal.formatNoYear(mon))} to ${esc(Cal.formatNoYear(sun))}</p>
      <h2 class="card-title" id="week-title">${list.length ? `${doneN} of ${list.length} lesson${list.length === 1 ? "" : "s"} done this week` : "No lessons this week"}</h2>
      ${list.length ? `<ul class="report-list">${list.map((l) => `<li class="${isDone(l.number) ? "is-done" : ""}">
        <span class="report-mark" aria-hidden="true">${isDone(l.number) ? ICON.tick : ""}</span>
        <a href="#/lesson/${l.number}">${esc(labelOf(l.number))}: ${esc(lessonData(l.number).title)}</a>
        <span class="muted small">${esc(Cal.formatShort(l.date))}${isDone(l.number) ? "" : l.date < t ? " · not ticked" : ""}</span></li>`).join("")}</ul>` : ""}
      ${notes.length ? `<h3 class="section-title">What was hard</h3><ul class="plain-list">${notes.map((l) => `<li><strong>${esc(labelOf(l.number))}:</strong> ${esc(S.done[l.number].hard)}</li>`).join("")}</ul>` : ""}
      ${next ? `<p class="muted">Next week: ${esc(labelOf(next.number))}, ${esc(lessonData(next.number).title)}.</p>` : ""}
      <div class="actions"><button type="button" class="btn ${friday ? "btn--primary" : ""}" data-action="backup">Download a backup</button></div>
      <p class="small muted">A good habit: download a backup every Friday and keep it somewhere safe.</p>
    </section>`;
  }

  function fridayHtml(s, t) {
    if (Cal.weekday(t) !== 5 || S.lastBackup === t) return "";
    const [mon, sun] = weekRange(t);
    const list = s.lessons.filter((l) => l.date >= mon && l.date <= sun);
    const doneN = list.filter((l) => isDone(l.number)).length;
    return noticeHtml(`<p><strong>It's Friday.</strong> ${list.length ? `You ticked ${doneN} of ${list.length} lessons this week. ` : ""}Time for your week report and a backup.</p>
      <div class="actions"><a class="btn btn--small" href="#/progress">See this week</a><button type="button" class="btn btn--small btn--ghost" data-action="backup">Download a backup</button></div>`);
  }

  function renderProgress() {
    const s = schedule(), t = todayKey();
    const done = doneCount(), left = COUNT - done, pct = Math.round((done / COUNT) * 100), streak = streakCount(s, t);
    const bars = WEEKS.map((w) => {
      let d = 0; const total = w.lastLesson - w.firstLesson + 1;
      for (let n = w.firstLesson; n <= w.lastLesson; n++) if (isDone(n)) d++;
      return `<li style="--wk: var(--week-${w.week})"><span class="wk-label">Week ${w.week}</span>
        <span class="wk-bar" role="img" aria-label="Week ${w.week}: ${d} of ${total} lessons done"><i style="width: ${((d / total) * 100).toFixed(0)}%"></i></span>
        <span class="wk-num">${d} of ${total}</span></li>`;
    }).join("");
    const projects = WEEKS.filter((w) => w.week < 6).map((w) => ({ n: w.lastLesson, name: `Week ${w.week} project`, short: `W${w.week}`, wk: `var(--week-${w.week})` }))
      .concat([{ n: COUNT, name: "Final project", short: "Final", wk: "var(--accent); --wk-ink: var(--on-accent)" }]);
    const badges = projects.map((b) => `<li class="badge ${isDone(b.n) ? "is-earned" : ""}" style="--wk: ${b.wk}">
        <span class="badge-disc" aria-hidden="true">${isDone(b.n) ? ICON.star : ""}<b>${esc(b.short)}</b></span>
        <span class="badge-name">${esc(b.name)}</span><span class="small muted">${isDone(b.n) ? "Earned" : "Not yet"}</span></li>`).join("");
    const hard = LESSONS.filter((l) => isDone(l.number) && S.done[l.number].hard);
    const repeat = LESSONS.filter((l) => isDone(l.number) && S.done[l.number].repeat);
    const changes = (S.plan.changes || []).slice().reverse();
    const missed = (S.plan.missed || []).slice().sort();
    main.innerHTML = screenHead("Progress", "", "") + `
      <div class="stats enter">
        <div class="stat"><span class="stat-num">${pct}%</span><span class="stat-label">of the course done</span></div>
        <div class="stat"><span class="stat-num">${done}</span><span class="stat-label">lessons done</span></div>
        <div class="stat"><span class="stat-num">${left}</span><span class="stat-label">lessons left</span></div>
        <div class="stat"><span class="stat-num">${streak}</span><span class="stat-label">ticked in a row</span></div>
      </div>
      ${thisWeekHtml(s, t)}
      <section class="card enter" aria-labelledby="bars-title"><h2 class="card-title" id="bars-title">Week by week</h2><ul class="wk-bars">${bars}</ul></section>
      <section class="card enter" aria-labelledby="badges-title"><h2 class="card-title" id="badges-title">Badges</h2>
        <p class="muted">One for each week project, and one for the final project.</p><ul class="badges">${badges}</ul></section>
      <div class="two-up">
        <section class="card enter" aria-labelledby="hard-title"><h2 class="card-title" id="hard-title">What I struggled with</h2>
          ${hard.length ? `<ul class="plain-list">${hard.map((l) => `<li><a href="#/lesson/${l.number}">${esc(labelOf(l.number))}</a>: ${esc(S.done[l.number].hard)}</li>`).join("")}</ul>` : '<p class="muted">Notes you add with “I did it” show here.</p>'}</section>
        <section class="card enter" aria-labelledby="repeat-title"><h2 class="card-title" id="repeat-title">What to repeat</h2>
          ${repeat.length ? `<ul class="plain-list">${repeat.map((l) => `<li><a href="#/lesson/${l.number}">${esc(labelOf(l.number))}: ${esc(l.title)}</a></li>`).join("")}</ul>` : '<p class="muted">Lessons you mark “Repeat this lesson later” show here.</p>'}</section>
      </div>
      <section class="card enter" aria-labelledby="log-title"><h2 class="card-title" id="log-title">Changes to your timetable</h2>
        ${missed.length ? `<p class="muted">Days marked “Can't today” or moved: ${missed.map((d) => esc(Cal.formatShort(d))).join(", ")}.</p>` : ""}
        ${changes.length ? `<ul class="log-list">${changes.map((c) => `<li>${esc(c.text)}</li>`).join("")}</ul>` : '<p class="muted">No changes yet. Every change gets a dated line here.</p>'}</section>`;
  }

  /* ---------- Toolbox: shortcuts, glossary, standard ---------- */

  function learntUpTo(s, t) {
    let up = 0;
    s.lessons.forEach((l) => { if (isDone(l.number) || l.date <= t) up = Math.max(up, l.number); });
    return up;
  }
  const slug = (w) => "g-" + w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function renderToolbox(tab, focusWord) {
    const s = schedule(), t = todayKey(), up = learntUpTo(s, t);
    const which = tab === "glossary" || tab === "standard" ? tab : "shortcuts";
    const seg = `<nav class="seg enter" aria-label="Toolbox">
      <a href="#/toolbox" ${which === "shortcuts" ? 'aria-current="page"' : ""}>Shortcuts</a>
      <a href="#/toolbox/glossary" ${which === "glossary" ? 'aria-current="page"' : ""}>Glossary</a>
      <a href="#/toolbox/standard" ${which === "standard" ? 'aria-current="page"' : ""}>Standard</a></nav>`;
    let body = "";
    if (which === "shortcuts") {
      const groups = [];
      C.shortcuts.forEach((sc) => {
        let g = groups.find((x) => x.n === sc.firstLesson);
        if (!g) { g = { n: sc.firstLesson, items: [] }; groups.push(g); }
        g.items.push(sc);
      });
      body = `<p class="muted enter">Keys you have learnt so far are bright; keys from later lessons are dimmed.</p>` + groups.map((g) => {
        const future = g.n > up;
        return `<section class="card tool-group enter ${future ? "is-future" : ""}" style="${weekVar(g.n)}" aria-labelledby="sg-${g.n}">
          <p class="overline">${future ? "Coming later · " : ""}${esc(labelOf(g.n))}</p>
          <h2 class="card-title" id="sg-${g.n}"><a href="#/lesson/${g.n}">${esc(lessonData(g.n).title)}</a></h2>
          <ul class="shortcut-list">${g.items.map((sc) => `<li>${chipsHtml(sc)}<span>${esc(sc.does)}${sc.where ? ` <span class="muted small">${esc(sc.where)}</span>` : ""}</span></li>`).join("")}</ul></section>`;
      }).join("");
    } else if (which === "glossary") {
      const sorted = C.glossary.slice().sort((a, b) => a.word.replace(/^\./, "").localeCompare(b.word.replace(/^\./, ""), "en", { sensitivity: "base" }));
      body = `<div class="field enter"><label class="label" for="g-search">Search the glossary</label>
          <input class="input" type="search" id="g-search" autocomplete="off" placeholder="For example: modifier"></div>
        <p class="muted small" id="g-count" aria-live="polite">${sorted.length} Blender words.</p>
        <dl class="glossary enter">${sorted.map((g) => `<div class="g-entry" id="${slug(g.word)}" data-text="${esc((g.word + " " + (g.alsoMatches || []).join(" ") + " " + g.meaning).toLowerCase())}">
          <dt>${esc(g.word)}</dt><dd>${esc(g.meaning)} <span class="muted small">First in ${esc(g.firstLesson === 0 ? "Before you start" : labelOf(g.firstLesson))}.</span></dd></div>`).join("")}</dl>`;
    } else {
      const std = S.standard || [];
      body = `<section class="card enter" aria-labelledby="std-title"><h2 class="card-title" id="std-title">Final project standard</h2>
        <p class="muted">All nine must pass for the certificate. Tick each point once your three final files meet it.</p>
        <ul class="checklist">${C.standard.map((p, i) => `<li><label class="check-item"><input type="checkbox" data-action="std" data-i="${i}" ${std[i] ? "checked" : ""}>
          <span><strong>${p.point}. ${esc(p.short)}</strong>: ${esc(p.text)}</span></label></li>`).join("")}</ul>
        <div class="actions"><a class="btn btn--ghost" href="#/certificate">See the certificate</a></div></section>`;
    }
    main.innerHTML = screenHead("Toolbox", "", "") + `<div class="cal-bar enter">${seg}</div>` + body;
    if (which === "glossary" && focusWord) {
      const el = document.getElementById(slug(decodeURIComponent(focusWord)));
      if (el) { el.classList.add("is-hit"); el.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" }); }
    }
  }

  function filterGlossary(q) {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    main.querySelectorAll(".g-entry").forEach((el) => {
      const hit = words.every((w) => el.dataset.text.indexOf(w) >= 0);
      el.hidden = !hit;
      if (hit) shown++;
    });
    const c = document.getElementById("g-count");
    if (c) c.textContent = shown === 1 ? "1 Blender word." : shown + " Blender words.";
  }

  /* ---------- My work ---------- */

  async function renderWork() {
    const token = renderToken;
    const s = schedule(), t = todayKey(), cur = currentLesson(s, t) || COUNT;
    main.innerHTML = screenHead("My work", "Your screenshots and renders, one lesson at a time. They stay on this device, and go into your backup.", "") +
      `<section class="card enter" aria-labelledby="add-title"><h2 class="card-title" id="add-title">Add a picture</h2>
        <div class="field"><label class="label" for="work-lesson">For which lesson?</label><select class="input" id="work-lesson">${lessonOptions(cur)}</select></div>
        <div class="actions"><button type="button" class="btn btn--primary" data-action="add-pic">Choose a screenshot or render</button></div></section>
      <div id="work-body"><p class="muted">Loading your pictures…</p></div>`;
    const pics = await Store.pictures.all();
    if (token !== renderToken) return;
    const body = document.getElementById("work-body");
    if (!pics.length) { body.innerHTML = '<p class="muted enter">No pictures yet. Add a screenshot of each lesson\'s proof, and they will show here.</p>'; return; }
    const byLesson = [];
    pics.forEach((p) => { let g = byLesson.find((x) => x.n === p.lesson); if (!g) { g = { n: p.lesson, list: [] }; byLesson.push(g); } g.list.push(p); });
    body.innerHTML = byLesson.map((g) => `<section class="work-lesson enter" style="${weekVar(g.n)}" aria-labelledby="wl-${g.n}">
      <h2 class="work-head" id="wl-${g.n}"><span class="tag tag--week">${esc(labelOf(g.n))}</span> <a href="#/lesson/${g.n}">${esc(lessonData(g.n).title)}</a></h2>
      <ul class="work-grid">${g.list.map((p) => `<li><button type="button" class="work-thumb" data-action="view-pic" data-id="${esc(p.id)}">
        <img src="${urlFor(p.blob)}" alt="Your picture for ${esc(labelOf(g.n))}, added on ${esc(Cal.formatLong(p.addedOn))}"></button></li>`).join("")}</ul></section>`).join("");
  }

  async function fillSheetWork(n) {
    const token = renderToken, slot = document.getElementById("sheet-work");
    if (!slot) return;
    const pics = await Store.pictures.forLesson(n);
    if (token !== renderToken || !document.body.contains(slot)) return;
    slot.innerHTML = `${pics.length ? `<ul class="work-grid">${pics.map((p) => `<li><button type="button" class="work-thumb" data-action="view-pic" data-id="${esc(p.id)}">
        <img src="${urlFor(p.blob)}" alt="Your picture, added on ${esc(Cal.formatLong(p.addedOn))}"></button></li>`).join("")}</ul>` : '<p class="muted">No picture yet.</p>'}
      <div class="actions"><button type="button" class="btn btn--ghost" data-action="add-pic" data-n="${n}">Add a screenshot or render</button></div>`;
  }

  async function addPicture(n) {
    const lesson = Number.isInteger(n) ? n : +((document.getElementById("work-lesson") || {}).value || 0);
    const file = await Files.pickFile("image/*");
    if (!file) return;
    try {
      const { blob, w, h } = await Files.shrinkImage(file);
      await Store.pictures.add({ lesson, blob, w, h, addedOn: todayKey() });
      toast(`Picture added to ${labelOf(lesson)}.`);
      route();
    } catch (e) {
      toast("That file couldn't be opened as a picture. Try a PNG or JPG.");
    }
  }

  async function viewPicture(id) {
    const p = (await Store.pictures.all()).find((x) => x.id === id);
    if (!p) return;
    const url = URL.createObjectURL(p.blob);
    const r = await openDialog({
      title: `${labelOf(p.lesson)}: ${lessonData(p.lesson).title}`,
      html: `<img class="dlg-img" src="${url}" alt="Your picture for ${esc(labelOf(p.lesson))}"><p class="small muted dlg-text">Added on ${esc(Cal.formatLong(p.addedOn))}.</p>`,
      actions: [{ label: "Delete", value: "delete" }, { label: "Close", value: "ok", primary: true }]
    });
    URL.revokeObjectURL(url);
    if (r.value !== "delete") return;
    const c = await openDialog({
      title: "Delete this picture?",
      html: '<p class="dlg-text">It is removed from this device. A backup you downloaded earlier still has it.</p>',
      actions: [{ label: "Keep it", value: "cancel" }, { label: "Delete it", value: "delete", primary: true }]
    });
    if (c.value !== "delete") return;
    await Store.pictures.remove(id);
    toast("Picture deleted.");
    route();
  }

  /* ---------- Certificate ---------- */

  function certStatus() {
    const lessonsLeft = LESSONS.filter((l) => !isDone(l.number)).length;
    const std = S.standard || [];
    const stdLeft = C.standard.filter((_, i) => !std[i]).length;
    const reviewer = (S.reviewer || "").trim();
    return { lessonsLeft, stdLeft, reviewer, ready: !lessonsLeft && !stdLeft && !!reviewer };
  }

  function certificateHtml(st, s) {
    const start = s.lessons[0].date;
    const doneDates = LESSONS.filter((l) => isDone(l.number)).map((l) => S.done[l.number].on).sort();
    const end = st.ready ? doneDates[doneDates.length - 1] : s.finishDate;
    const files = (lessonData(28).youMake.match(/BLENDER_\w+\.(png|mp4|glb)/g) || []);
    const skills = WEEKS.map((w) => w.theme.replace(/\.$/, ""));
    return `<div class="cert-wrap"><article class="cert ${st.ready ? "" : "is-locked"}" aria-label="Certificate of completion">
      <span class="cert-logo" aria-hidden="true"></span>
      <p class="cert-kicker">Certificate of completion</p>
      <p class="cert-small">This certifies that</p>
      <p class="cert-name">${esc(S.learner.name)}</p>
      <p class="cert-small">has completed the course</p>
      <p class="cert-course">${esc(C.course.name)}</p>
      <p class="cert-dates">${esc(Cal.formatLong(start))} to ${esc(Cal.formatLong(end))}</p>
      <div class="cert-cols">
        <div><p class="cert-head">Skills covered</p><ul>${skills.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><p class="cert-head">Final project</p><p>A T-shirt and cap, modelled, printed, lit and animated, delivered as ${files.map(esc).join(", ").replace(/, ([^,]*)$/, " and $1")}.</p>
          <p class="cert-head">Reviewed by</p><p>${st.reviewer ? esc(st.reviewer) : "—"}</p></div>
      </div>
      <p class="cert-issuer">Issued by Zedlab and Claude</p>
      <p class="cert-fine">Not issued by the Blender Foundation.</p>
      ${st.ready ? "" : '<span class="cert-lock">Locked until everything above is done</span>'}
    </article></div>`;
  }

  function renderCertificate() {
    const s = schedule(), st = certStatus();
    const item = (ok, text, link) => `<li class="${ok ? "is-done" : ""}"><span class="report-mark" aria-hidden="true">${ok ? ICON.tick : ""}</span><span>${text}</span>${link || ""}</li>`;
    main.innerHTML = screenHead("Certificate", st.ready ? "Everything is done. Well done." : "It unlocks when these three things are done.", "") + `
      <section class="card enter no-print" aria-labelledby="need-title"><h2 class="card-title" id="need-title">${st.ready ? "All done" : "Still to do"}</h2>
        <ul class="report-list">
          ${item(!st.lessonsLeft, st.lessonsLeft ? `${st.lessonsLeft} of ${COUNT} lessons still to tick` : `All ${COUNT} lessons ticked`, st.lessonsLeft ? ' <a href="#/calendar/list" class="small">See the lessons</a>' : "")}
          ${item(!st.stdLeft, st.stdLeft ? `${st.stdLeft} of 9 points of the final project standard still to tick` : "All 9 points of the standard ticked", st.stdLeft ? ' <a href="#/toolbox/standard" class="small">Open the standard</a>' : "")}
          ${item(!!st.reviewer, st.reviewer ? `Reviewed by ${esc(st.reviewer)}` : "The name of the person who reviewed your final files")}
        </ul>
        <form class="form" id="reviewer-form" novalidate>
          <div class="field"><label class="label" for="cert-reviewer">Reviewed by</label>
            <input class="input" id="cert-reviewer" value="${esc(S.reviewer || "")}" autocomplete="off" aria-describedby="rev-hint">
            <p class="hint" id="rev-hint">The person who checked your three final files against the standard, for example your tutor.</p></div>
          <div><button class="btn" type="submit">Save the name</button></div>
        </form>
        ${st.ready ? '<div class="actions"><button type="button" class="btn btn--primary" data-action="print">Print or save as PDF</button></div>' : ""}
      </section>
      ${certificateHtml(st, s)}`;
  }

  /* ---------- Settings ---------- */

  function renderSettings() {
    const s = schedule(), t = todayKey();
    const begun = doneCount() > 0 || t >= s.lessons[0].date;
    const days = Cal.lessonDaysOn(S.plan, t > S.plan.startDate ? t : S.plan.startDate);
    const offs = S.plan.daysOff || [];
    main.innerHTML = screenHead("Settings", "", "") + `
      <form class="card form enter" id="settings-form" novalidate aria-labelledby="set-course">
        <h2 class="card-title" id="set-course">Your course</h2>
        <div class="field"><label class="label" for="st-name">Your name, for the certificate</label>
          <input class="input" id="st-name" autocomplete="name" value="${esc(S.learner.name)}" aria-describedby="st-name-err">
          <p class="error-text" id="st-name-err" hidden>Please type your name.</p></div>
        <div class="field"><label class="label" for="st-start">Start date</label>
          <input class="input" type="date" id="st-start" value="${S.plan.startDate}" ${begun ? "disabled" : ""} aria-describedby="st-start-hint">
          <p class="hint" id="st-start-hint">${begun ? "The start date stays fixed once your first lesson day has come." : "Lesson 1 is on the first lesson day from this date."}</p></div>
        <fieldset class="field"><legend class="label">Lesson days</legend>
          <div class="chips">${DAYS.map(([v, short, long]) => `<label class="chip-check"><input type="checkbox" name="st-day" value="${v}" ${days.includes(v) ? "checked" : ""} aria-label="${long}"><span aria-hidden="true">${short}</span></label>`).join("")}</div>
          <p class="hint">Changes apply from today. Lessons before today keep their dates.</p>
          <p class="error-text" id="st-days-err" hidden>Choose at least one lesson day.</p></fieldset>
        <div class="two-up">
          <div class="field"><label class="label" for="st-time">Lesson time</label><input class="input" type="time" id="st-time" value="${esc(S.settings.lessonTime)}"><p class="hint">Your device's own time.</p></div>
          <div class="field"><label class="label" for="st-min">Minutes per lesson</label><input class="input" type="number" id="st-min" min="15" max="240" step="5" inputmode="numeric" value="${S.settings.lessonMinutes}"></div>
        </div>
        <div><button class="btn btn--primary" type="submit">Save changes</button></div>
      </form>

      <section class="card enter" aria-labelledby="set-off"><h2 class="card-title" id="set-off">Days off</h2>
        <ul class="daysoff">${offs.map((d, i) => {
          const when = d.date ? Cal.formatLong(d.date) : `${d.day} ${Cal.MONTHS[d.month - 1]}, every year`;
          const removable = !d.date || d.date >= t;
          return `<li><span>${esc(when)}${d.name ? " · " + esc(d.name) : ""}</span>${removable ? `<button type="button" class="icon-btn" data-action="st-remove-off" data-i="${i}" aria-label="Remove the day off: ${esc(when)}">${ICON.close}</button>` : '<span class="small muted">Past</span>'}</li>`;
        }).join("") || '<li><span class="muted">No days off.</span></li>'}</ul>
        <div class="two-up" style="margin-top: var(--space-16)">
          <div class="field"><label class="label" for="st-off-date">Add a date</label><input class="input" type="date" id="st-off-date" min="${t}"></div>
          <div class="field"><label class="label" for="st-off-name">Name (optional)</label><input class="input" id="st-off-name"></div>
        </div>
        <div class="actions"><button type="button" class="btn" data-action="st-add-off">Add day off</button></div>
      </section>

      <section class="card enter" aria-labelledby="set-look"><h2 class="card-title" id="set-look">Look</h2>
        <div class="chips" role="radiogroup" aria-labelledby="set-look">
          <label class="chip-check"><input type="radio" name="st-theme" value="dark" ${S.settings.theme !== "light" ? "checked" : ""}><span>Dark</span></label>
          <label class="chip-check"><input type="radio" name="st-theme" value="light" ${S.settings.theme === "light" ? "checked" : ""}><span>Light</span></label>
        </div></section>

      <section class="card enter" aria-labelledby="set-backup"><h2 class="card-title" id="set-backup">Backup</h2>
        <p class="muted">One file, ${esc(Files.backupFileName(t))}, with your progress, notes, dates and pictures. Keep it somewhere safe, such as your email or a cloud drive. A good habit: download one every Friday.</p>
        ${S.lastBackup ? `<p class="small muted">Last backup: ${esc(Cal.formatLong(S.lastBackup))}.</p>` : ""}
        <div class="actions"><button type="button" class="btn btn--primary" data-action="backup">Download a backup</button>
          <button type="button" class="btn btn--ghost" data-action="restore">Restore from a backup</button></div></section>

      <section class="card enter" aria-labelledby="set-ics"><h2 class="card-title" id="set-ics">Phone calendar</h2>
        <p class="muted">Adds all ${COUNT} lessons to your phone's calendar, each with an alert 15 minutes before.</p>
        <div class="actions"><button type="button" class="btn" data-action="ics">Download BLENDER_Calendar_v1.ics</button></div>
        <p class="small muted">Open the file on your phone to add the lessons. If your dates change, download it again.</p></section>

      <section class="card enter" aria-labelledby="set-home"><h2 class="card-title" id="set-home">Put it on your home screen</h2>
        ${window.matchMedia("(display-mode: standalone)").matches ? '<p class="muted">You are using the app from your home screen. It works without internet.</p>' : `
        ${installPrompt ? '<div class="actions"><button type="button" class="btn btn--primary" data-action="install">Add to home screen</button></div>' : ""}
        <p><strong>iPhone or iPad:</strong> open the app in Safari, tap Share, then “Add to Home Screen”.</p>
        <p><strong>Android:</strong> in Chrome, open the menu (⋮) and choose “Install app” or “Add to Home screen”.</p>
        <p class="muted">Once it is on your home screen, it opens like an app and works without internet.</p>`}</section>

      <section class="card enter" aria-labelledby="set-pass"><h2 class="card-title" id="set-pass">How to pass this app on</h2>
        <p>Send the link to anyone who wants to learn Blender 5.2 LTS. When they open it, they get their own fresh, empty course and set it up in under a minute.</p>
        <p>Your course stays on your device. Nobody else can see it, and theirs doesn't change yours.</p>
        <p>New phone? Download a backup here, send the file to yourself, open the app on the new phone and choose “Restore from backup”.</p></section>

      <section class="card enter" aria-labelledby="set-reset"><h2 class="card-title" id="set-reset">Start again</h2>
        <p class="muted">Deletes your course, notes and pictures from this device, and goes back to set-up.</p>
        <div class="actions"><button type="button" class="btn btn--danger" data-action="reset">Reset the course</button></div></section>`;
  }

  function saveSettings() {
    const name = document.getElementById("st-name").value.trim();
    const startEl = document.getElementById("st-start");
    const days = Array.from(main.querySelectorAll('input[name="st-day"]:checked')).map((x) => +x.value);
    const time = document.getElementById("st-time").value;
    const minutes = parseInt(document.getElementById("st-min").value, 10);
    document.getElementById("st-name-err").hidden = !!name;
    document.getElementById("st-days-err").hidden = days.length > 0;
    if (!name) { document.getElementById("st-name").focus(); return; }
    if (!days.length) { main.querySelector('input[name="st-day"]').focus(); return; }
    const t = todayKey(), before = schedule().finishDate;
    S.learner.name = name;
    if (!startEl.disabled && Cal.isKey(startEl.value) && startEl.value !== S.plan.startDate) {
      const r = Cal.setStartDate(S.plan, startEl.value, t, WEEKS);
      if (r.change) S.plan = r.plan;
    }
    const from = t > S.plan.startDate ? t : S.plan.startDate;
    const cur = Cal.lessonDaysOn(S.plan, from);
    if (cur.length !== days.length || days.some((d) => !cur.includes(d))) {
      const r = Cal.setLessonDays(S.plan, days, from, t, WEEKS);
      if (r.change) S.plan = r.plan;
    }
    if (/^\d{2}:\d{2}$/.test(time)) S.settings.lessonTime = time;
    if (!isNaN(minutes)) S.settings.lessonMinutes = Math.min(240, Math.max(15, minutes));
    save();
    const after = schedule().finishDate;
    toast(after && after !== before ? `Saved. Your course now finishes on ${Cal.formatLong(after)}.` : "Saved.");
    route();
  }

  function settingsDayOff(kind, i) {
    const t = todayKey();
    let r;
    if (kind === "add") {
      const dateEl = document.getElementById("st-off-date"), nameEl2 = document.getElementById("st-off-name");
      if (!Cal.isKey(dateEl.value)) { dateEl.focus(); toast("Choose a date first."); return; }
      if ((S.plan.daysOff || []).some((d) => d.date === dateEl.value)) { toast("That day is already a day off."); return; }
      r = Cal.addDayOff(S.plan, { date: dateEl.value, name: nameEl2.value.trim() }, t, WEEKS);
    } else {
      r = Cal.removeDayOff(S.plan, i, t, WEEKS);
    }
    if (!r.change) return;
    S.plan = r.plan;
    save();
    toast(r.change.finishAfter !== r.change.finishBefore ? `Saved. Your course now finishes on ${Cal.formatLong(r.change.finishAfter)}.` : "Saved. No lesson moves.");
    route();
  }

  async function resetCourse() {
    const a = await openDialog({ title: "Reset the course?", html: '<p class="dlg-text">This deletes your progress, notes and pictures from this device and goes back to set-up. Download a backup first if you might want them.</p>',
      actions: [{ label: "Keep my course", value: "cancel" }, { label: "Reset", value: "go", primary: true }] });
    if (a.value !== "go") return;
    const b = await openDialog({ title: "Are you sure?", html: '<p class="dlg-text">This can\'t be undone without a backup.</p>',
      actions: [{ label: "No, keep it", value: "cancel" }, { label: "Yes, reset everything", value: "go", primary: true }] });
    if (b.value !== "go") return;
    await Store.pictures.clear();
    Store.clear();
    S = null;
    setupDaysOff = null;
    applyTheme();
    history.replaceState(null, "", location.pathname);
    route();
    toast("Your course was reset.");
  }

  /* ---------- Backup, restore, phone calendar ---------- */

  async function downloadBackup() {
    const pics = await Store.pictures.all();
    const withData = [];
    for (const p of pics) withData.push({ id: p.id, lesson: p.lesson, addedOn: p.addedOn, w: p.w, h: p.h, data: await Files.blobToDataUrl(p.blob) });
    const name = Files.backupFileName(todayKey());
    Files.download(name, Files.makeBackup(S, withData), "application/json");
    S.lastBackup = todayKey();
    save();
    toast(`Backup downloaded: ${name}, with ${pics.length} picture${pics.length === 1 ? "" : "s"}.`);
    if (location.hash.indexOf("#/settings") === 0) route();
  }

  async function restoreBackup() {
    const file = await Files.pickFile(".json,application/json");
    if (!file) return;
    let parsed;
    try { parsed = Files.parseBackup(await Files.readText(file)); } catch (e) { parsed = { ok: false, reason: "That file couldn't be read." }; }
    if (!parsed.ok) {
      openDialog({ title: "This file can't be restored", html: `<p class="dlg-text">${esc(parsed.reason)}</p>`, actions: [{ label: "OK", value: "ok", primary: true }] });
      return;
    }
    const st = parsed.state, doneN = Object.keys(st.done || {}).length;
    const saved = parsed.savedAt ? Cal.formatLong(Cal.todayKey(new Date(parsed.savedAt))) : "an earlier day";
    const r = await openDialog({
      title: "Restore this backup?",
      html: `<p class="dlg-text">${esc(st.learner.name)}'s course, saved on ${esc(saved)}: ${doneN} lesson${doneN === 1 ? "" : "s"} done and ${parsed.pictures.length} picture${parsed.pictures.length === 1 ? "" : "s"}.</p>
        ${S ? '<p class="dlg-text">It replaces the course on this device.</p>' : ""}`,
      actions: [{ label: "Cancel", value: "cancel" }, { label: "Restore", value: "restore", primary: true }]
    });
    if (r.value !== "restore") return;
    await Store.pictures.clear();
    for (const p of parsed.pictures) {
      const blob = await Files.dataUrlToBlob(p.data);
      await Store.pictures.add({ id: p.id, lesson: p.lesson, addedOn: p.addedOn, w: p.w, h: p.h, blob });
    }
    st.standard = st.standard || [];
    st.dayZero = st.dayZero || [];
    S = st;
    save();
    applyTheme();
    setupDaysOff = null;
    flash = `Welcome back, ${firstName()}. Your course is restored: ${doneN} lesson${doneN === 1 ? "" : "s"} done.`;
    go("#/today");
  }

  function downloadIcs() {
    Files.download("BLENDER_Calendar_v1.ics", Files.makeIcs(Cal, S.plan, C, S.settings, new Date(), S.createdAt), "text/calendar;charset=utf-8");
    toast("Calendar file downloaded. Open it on your phone to add the lessons.");
  }

  /* ---------- More (on phones) ---------- */

  function renderMore() {
    const st = certStatus();
    const row = (href, title, text) => `<li><a class="more-link" href="${href}"><span class="more-title">${title}</span><span class="small muted">${text}</span></a></li>`;
    main.innerHTML = screenHead("More", "", "") + `<ul class="more-list enter">
      ${row("#/progress", "Progress", `${doneCount()} of ${COUNT} lessons done, badges, this week`)}
      ${row("#/work", "My work", "Your screenshots and renders")}
      ${row("#/certificate", "Certificate", st.ready ? "Ready to print" : "What is still missing")}
      ${row("#/settings", "Settings", "Your course, days off, look, backup, phone calendar")}
    </ul>`;
  }

  /* ---------- Light or dark ---------- */

  function applyTheme() {
    const theme = S && S.settings && S.settings.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--surface-primary").trim());
    colourFavicon();
  }

  /* ---------- Moving between screens ---------- */

  function go(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }

  function setNav(active) {
    tabs.hidden = !S;
    const inMore = ["progress", "work", "certificate", "settings", "more"].includes(active);
    tabs.querySelectorAll(".tab").forEach((a) => {
      const on = a.dataset.tab === active || (a.dataset.tab === "more" && inMore);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    /* The top bar on a phone has room for the first name only; the full name shows on laptops and stays in the course. */
    const full = S ? S.learner.name.trim() : "";
    const cut = full.search(/\s/);
    const first = cut > 0 ? full.slice(0, cut) : full, rest = cut > 0 ? full.slice(cut) : "";
    nameEl.innerHTML = full ? `<span class="name-first">${esc(first)}</span><span class="name-rest">${esc(rest)}</span>` : "";
    nameEl.title = full;
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const page = parts[0] || "today";
    renderedDay = S ? todayKey() : null;
    renderToken++;
    freeUrls();
    if (window.CourseVisuals) window.CourseVisuals.unmountAll();
    if (!S) { setNav(null); renderSetup(); return; }
    switch (page) {
      case "today": renderToday(); setNav("today"); break;
      case "calendar": renderCalendar(parts[1] === "list"); setNav("calendar"); break;
      case "map": renderMap(); setNav("map"); break;
      case "lesson": renderLesson(parseInt(parts[1], 10)); setNav(null); break;
      case "progress": renderProgress(); setNav("progress"); break;
      case "toolbox": renderToolbox(parts[1], parts[2]); setNav("toolbox"); break;
      case "work": renderWork(); setNav("work"); break;
      case "certificate": renderCertificate(); setNav("certificate"); break;
      case "settings": renderSettings(); setNav("settings"); break;
      case "more": renderMore(); setNav("more"); break;
      default: location.replace("#/today"); return;
    }
    mountPictures();
    if (S.timer && S.timer.lesson) lastPhase = timerInfo(Date.now()).index;
    if (!Store.canSave()) {
      main.insertAdjacentHTML("afterbegin", noticeHtml("<p>This browser won't let the app save, so your progress will be lost when you close it. Try another browser, or leave private browsing.</p>"));
    }
  }

  window.addEventListener("hashchange", () => {
    route();
    window.scrollTo(0, 0);
    if (location.hash.indexOf("#/map") !== 0) main.focus({ preventScroll: true });
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

  /* The octopus as the tab icon: white on the app's dark colour. The original file is not changed. */
  function colourFavicon() {
    const css = getComputedStyle(document.documentElement);
    const dark = css.getPropertyValue("--surface-primary").trim() || "black";
    const light = css.getPropertyValue("--label-primary").trim() || "white";
    fetch("Zedlab_octopus_logo.svg").then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      const inner = svg.replace(/<\?xml[^>]*>/, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
      const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1920"><rect width="1920" height="1920" rx="420" fill="${dark}"/>` +
        `<g fill="${light}" transform="translate(192 192) scale(0.8)">${inner}</g></svg>`;
      document.getElementById("favicon").href = "data:image/svg+xml," + encodeURIComponent(icon);
    }).catch(() => { /* keep the plain file */ });
  }

  /* ---------- Works offline; says when a new version is ready ---------- */

  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    if (location.hash.indexOf("#/settings") === 0) route();
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; toast("Added to your home screen."); });

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) { /* nothing to do */ }
    installPrompt = null;
    route();
  }

  function showUpdateBar() {
    if (document.getElementById("update-bar")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div class="update-bar" id="update-bar" role="status"><button type="button" class="btn btn--primary" id="update-btn">New version ready, tap to update</button></div>');
    document.getElementById("update-btn").addEventListener("click", () => location.reload());
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "update-ready") showUpdateBar(); });
    navigator.serviceWorker.register("sw.js").then(() => {
      const ask = () => { if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "check", since: Math.round(performance.timeOrigin) }); };
      ask();
      setTimeout(ask, 4000);
    }).catch(() => { /* the app still works, just not offline */ });
  }

  if (S && !location.hash) location.replace("#/today");
  if (S) { S.standard = S.standard || []; S.settings.theme = S.settings.theme || "dark"; }
  applyTheme();
  route();
  ticker = setInterval(tick, 1000);
})();

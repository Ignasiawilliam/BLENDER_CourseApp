/*
  Zedlab Blender Course: files the learner downloads or opens.

  - The backup: one file, BLENDER_Backup_YYYY-MM-DD.json, with the whole course and the attached pictures.
  - Restore: reads that file back, after checking it really is a backup of this course.
  - The phone calendar: BLENDER_Calendar_v1.ics, one event per lesson, with an alert 15 minutes before.
  - Pictures attached to lessons are shrunk before they are kept.
  Nothing is ever sent anywhere: files are made and read on the device.
*/
(function (root) {
  "use strict";

  const APP = "Zedlab Blender Course";
  const FORMAT = 1;

  /* ---------- The backup ---------- */

  function backupFileName(todayKeyValue) { return "BLENDER_Backup_" + todayKeyValue + ".json"; }

  /* pictures: [{ id, lesson, addedOn, w, h, data: "data:image/jpeg;base64,..." }] */
  function makeBackup(state, pictures, savedAtIso) {
    const copy = JSON.parse(JSON.stringify(state));
    copy.timer = null;
    return JSON.stringify({
      app: APP, kind: "backup", format: FORMAT, savedAt: savedAtIso || new Date().toISOString(),
      state: copy, pictures: (pictures || []).map((p) => ({ id: p.id, lesson: p.lesson, addedOn: p.addedOn, w: p.w, h: p.h, data: p.data }))
    });
  }

  function isDayKey(k) {
    const m = typeof k === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  /* Reads a backup. Gives { ok: true, state, pictures, savedAt } or { ok: false, reason } in plain words. */
  function parseBackup(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, reason: "This file isn't a backup from this app. Choose a file named BLENDER_Backup_ and a date." }; }
    if (!data || data.app !== APP || data.kind !== "backup") return { ok: false, reason: "This file isn't a backup from this app. Choose a file named BLENDER_Backup_ and a date." };
    if (data.format > FORMAT) return { ok: false, reason: "This backup was made by a newer version of the app. Update the app, then try again." };
    const st = data.state;
    if (!st || !st.learner || typeof st.learner.name !== "string" || !st.plan || !isDayKey(st.plan.startDate) || !Array.isArray(st.plan.lessonDayPlan)) {
      return { ok: false, reason: "This backup is damaged, so it can't be restored. Try an earlier backup." };
    }
    st.done = st.done && typeof st.done === "object" ? st.done : {};
    st.settings = st.settings || {};
    st.timer = null;
    const pictures = (Array.isArray(data.pictures) ? data.pictures : [])
      .filter((p) => p && typeof p.data === "string" && p.data.indexOf("data:image/") === 0 && Number.isInteger(p.lesson));
    return { ok: true, state: st, pictures, savedAt: data.savedAt || "" };
  }

  /* ---------- The phone calendar file ---------- */

  const pad2 = (n) => String(n).padStart(2, "0");
  function icsText(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  /* Lines longer than 75 bytes are folded, as calendar apps expect. */
  function fold(line) {
    const bytes = (str) => new TextEncoder().encode(str).length;
    if (bytes(line) <= 75) return line;
    const parts = [];
    let current = "";
    for (const ch of line) {
      const limit = parts.length ? 74 : 75;
      if (bytes(current + ch) > limit) { parts.push(current); current = ch; } else current += ch;
    }
    parts.push(current);
    return parts.join("\r\n ");
  }
  const stamp = (key, minutesOfDay) => key.replace(/-/g, "") + "T" + pad2(Math.floor(minutesOfDay / 60)) + pad2(minutesOfDay % 60) + "00";

  /* plan: the learner's plan; content: COURSE_CONTENT; settings: { lessonTime, lessonMinutes }; uidSeed: stays the same for this learner */
  function makeIcs(Cal, plan, content, settings, now, uidSeed) {
    const sched = Cal.schedule(plan);
    const [hh, mm] = String(settings.lessonTime || "16:00").split(":").map(Number);
    const startMin = hh * 60 + mm, length = settings.lessonMinutes || 45;
    const n = now || new Date();
    const dtstamp = n.getUTCFullYear() + pad2(n.getUTCMonth() + 1) + pad2(n.getUTCDate()) + "T" + pad2(n.getUTCHours()) + pad2(n.getUTCMinutes()) + pad2(n.getUTCSeconds()) + "Z";
    const seed = String(uidSeed || plan.startDate).replace(/[^0-9A-Za-z]/g, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zedlab//Blender Course//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Blender course"];
    sched.lessons.forEach((l) => {
      const lesson = content.lessons[l.number - 1];
      const endTotal = startMin + length;
      const endKey = Cal.addDays(l.date, Math.floor(endTotal / 1440));
      const label = Cal.lessonLabel(l.number, content.weeks);
      lines.push("BEGIN:VEVENT",
        "UID:blender-course-" + seed + "-lesson-" + pad2(l.number) + "@zedlab-blender-course",
        "DTSTAMP:" + dtstamp,
        "DTSTART:" + stamp(l.date, startMin),
        "DTEND:" + stamp(endKey, endTotal % 1440),
        "SUMMARY:" + icsText("Blender: " + label + ", " + lesson.title),
        "DESCRIPTION:" + icsText(lesson.ideaInOneSentence + "\nWhat you'll make: " + lesson.youMake + "\nProof to send: " + lesson.proofToSend),
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText("Blender lesson in 15 minutes: " + lesson.title), "TRIGGER:-PT15M", "END:VALARM",
        "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  }

  /* ---------- Working with files on the device ---------- */

  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept || "";
      input.style.display = "none";
      input.addEventListener("change", () => { resolve(input.files && input.files[0] ? input.files[0] : null); input.remove(); });
      document.body.appendChild(input);
      input.click();
    });
  }

  function readText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) { return fetch(dataUrl).then((r) => r.blob()); }

  /* A screenshot or render, made smaller (at most 1280 pixels on its longest side) before it is kept. */
  function shrinkImage(file, maxSide, quality) {
    const max = maxSide || 1280;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d");
        g.fillStyle = "#FFFFFF";
        g.fillRect(0, 0, w, h);
        g.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob((blob) => (blob ? resolve({ blob, w, h }) : reject(new Error("shrink"))), "image/jpeg", quality || 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
      img.src = url;
    });
  }

  root.CourseFiles = { backupFileName, makeBackup, parseBackup, makeIcs, download, pickFile, readText, blobToDataUrl, dataUrlToBlob, shrinkImage };
})(typeof window !== "undefined" ? window : this);

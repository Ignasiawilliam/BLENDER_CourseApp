/*
  Zedlab Blender Course: saving progress on this device.

  Everything stays in this browser on this device (its "local storage").
  Nothing is sent anywhere. Each person who opens the app gets their own, empty course.
*/
(function (root) {
  "use strict";

  var KEY = "zedlabBlenderCourse.v1";
  var memoryOnly = null; /* used when the browser refuses to save */

  function canSave() {
    try {
      var probe = KEY + ".probe";
      root.localStorage.setItem(probe, "1");
      root.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  var saving = canSave();

  function load() {
    if (!saving) return memoryOnly;
    try {
      var raw = root.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    state.savedAt = new Date().toISOString();
    if (!saving) { memoryOnly = state; return false; }
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      memoryOnly = state;
      return false;
    }
  }

  function clear() {
    memoryOnly = null;
    if (saving) { try { root.localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ } }
  }

  /* A fresh course for a new learner. */
  function fresh(options) {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      learner: { name: options.name },
      settings: {
        lessonTime: options.lessonTime || "16:00",
        lessonMinutes: options.lessonMinutes || 45,
        hasBlender: options.hasBlender || "",
        theme: options.theme || "dark"
      },
      plan: options.plan,
      done: {},          /* lesson number -> { on: "YYYY-MM-DD", hard: "", repeat: false } */
      dayZero: [],       /* ticks on the before-you-start checklist */
      standard: [],      /* ticks on the 9-point final project standard */
      reviewer: "",      /* who reviewed the final files, for the certificate */
      lastBackup: "",    /* the day of the last downloaded backup */
      timer: null        /* the lesson timer, so it survives a reload */
    };
  }

  /* ---------- Pictures attached to lessons (screenshots and renders) ----------
     Kept in the browser's picture storage on this device (IndexedDB). If that is not available,
     they are kept only until the app is closed. */
  const DB_NAME = "zedlabBlenderCourse", PICS = "pictures";
  let dbPromise = null;
  const memoryPics = new Map();

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve) => {
        try {
          const req = root.indexedDB.open(DB_NAME, 1);
          req.onupgradeneeded = () => {
            const d = req.result;
            if (!d.objectStoreNames.contains(PICS)) d.createObjectStore(PICS, { keyPath: "id" }).createIndex("lesson", "lesson");
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
      });
    }
    return dbPromise;
  }

  function tx(mode, work) {
    return openDb().then((d) => new Promise((resolve, reject) => {
      if (!d) { resolve(work(null)); return; }
      const t = d.transaction(PICS, mode), s = t.objectStore(PICS);
      let result;
      Promise.resolve(work(s)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }
  const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const pictures = {
    /* rec: { lesson, blob, w, h, addedOn } */
    add(rec) {
      const item = { id: rec.id || newId(), lesson: rec.lesson, addedOn: rec.addedOn, w: rec.w, h: rec.h, blob: rec.blob };
      return tx("readwrite", (s) => { if (!s) { memoryPics.set(item.id, item); return item; } s.put(item); return item; });
    },
    all() {
      return tx("readonly", (s) => (s ? req(s.getAll()) : Array.from(memoryPics.values())))
        .then((list) => (list || []).sort((a, b) => (a.lesson - b.lesson) || String(a.addedOn).localeCompare(String(b.addedOn))));
    },
    forLesson(n) { return pictures.all().then((list) => list.filter((p) => p.lesson === n)); },
    remove(id) { return tx("readwrite", (s) => { if (!s) { memoryPics.delete(id); return true; } s.delete(id); return true; }); },
    clear() { memoryPics.clear(); return tx("readwrite", (s) => { if (s) s.clear(); return true; }); },
    available() { return openDb().then((d) => !!d); }
  };

  root.CourseStore = { KEY: KEY, canSave: function () { return saving; }, load: load, save: save, clear: clear, fresh: fresh, pictures: pictures };
})(window);

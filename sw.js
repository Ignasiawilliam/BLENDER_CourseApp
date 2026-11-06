/*
  Zedlab Blender Course: works offline, and says when a new version is ready.

  The first time the app opens, every file it needs is saved on the device.
  After that, the app opens from those saved files, even with no internet.
  When there is internet, each file is quietly checked against the published one.
  If one has changed, the new copy is saved and the app shows
  "New version ready, tap to update". Tapping it reloads the app with the new files.

  If you add a new file the app needs, add it to the list below.
*/
const CACHE = "zedlab-blender-course";

const FILES = [
  "./", "index.html", "manifest.webmanifest",
  "app/styles.css", "app/calendar.js", "app/store.js", "app/files.js", "app/visuals.js", "app/app.js",
  "content/lessons.js", "content/glossary.js", "content/shortcuts.js", "content/standard.js", "content/visuals.js",
  "fonts/InterVariable.woff2", "Zedlab_logo.svg", "Zedlab_octopus_logo.svg",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
  "vendor/three/three.module.min.js", "vendor/three/three.core.min.js"
];
for (let n = 0; n <= 29; n++) {
  const nn = String(n).padStart(2, "0");
  FILES.push(`img/pictures/lesson-${nn}.jpg`, `img/pictures/lesson-${nn}-small.jpg`);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(FILES.map((f) => cache.add(new Request(f, { cache: "reload" })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

/* Has the published file changed since the saved copy? */
function changed(saved, fresh) {
  const a = saved.headers.get("etag"), b = fresh.headers.get("etag");
  if (a && b) return a !== b;
  const c = saved.headers.get("last-modified"), d = fresh.headers.get("last-modified");
  if (c && d) return c !== d;
  const e = saved.headers.get("content-length"), f = fresh.headers.get("content-length");
  return !!(e && f && e !== f);
}

let updatedAt = 0;
async function tellPages() {
  updatedAt = Date.now();
  const pages = await self.clients.matchAll({ type: "window" });
  pages.forEach((p) => p.postMessage({ type: "update-ready" }));
}

/* A page that has just opened asks whether a new version arrived while it was loading. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "check" && updatedAt > (event.data.since || 0) && event.source) {
    event.source.postMessage({ type: "update-ready" });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  /* The check pages always come straight from the internet. */
  if (/\/check-[^/]*\.html$/.test(url.pathname)) return;
  const key = request.mode === "navigate" ? new URL("index.html", self.registration.scope).href : request;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(key, { ignoreSearch: true });
    const fromNetwork = fetch(request, { cache: "no-cache" }).then(async (fresh) => {
      if (fresh && fresh.ok && fresh.type === "basic") {
        if (!saved) await cache.put(key, fresh.clone());
        else if (changed(saved, fresh)) { await cache.put(key, fresh.clone()); await tellPages(); }
      }
      return fresh;
    }).catch(() => null);
    if (saved) { event.waitUntil(fromNetwork); return saved; }
    const fresh = await fromNetwork;
    return fresh || new Response("You're offline, and this part of the app hasn't been saved yet. Connect once, then it works offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  })());
});

/*
  Zedlab Blender Course: writes Pweza's opening (the preloader drawing) into index.html.

  The opening has to show before any script runs, so his drawing and his wave are written straight
  into index.html, between <!-- pweza:preloader --> and <!-- /pweza:preloader -->.
  They come from app/pweza.js. If Pweza's drawing or his wave ever changes, run this once:

      node tools/make-preloader.js

  It needs Node.js (free), and nothing else. The app itself never uses this file.
*/
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
global.window = { matchMedia: () => ({ matches: false }) };
require(path.join(root, "app", "pweza.js"));
const svg = window.Pweza.preloaderMarkup().replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
const file = path.join(root, "index.html");
const html = fs.readFileSync(file, "utf8");
const start = "<!-- pweza:preloader -->", end = "<!-- /pweza:preloader -->";
const a = html.indexOf(start), b = html.indexOf(end);
if (a < 0 || b < a) throw new Error("index.html has no <!-- pweza:preloader --> markers");
fs.writeFileSync(file, html.slice(0, a + start.length) + svg + html.slice(b));
console.log(`Pweza's opening written into index.html (${Math.round(svg.length / 1024)} KB).`);

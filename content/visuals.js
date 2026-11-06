/*
  Zedlab Blender Course: the picture for each lesson.

  "scene"   which kind of picture it is (the app has a small set and reuses them)
  "mode"    which version of that picture
  "seconds" how long one loop of the animation takes
  "poster"  the moment (0 to 1 through the loop) shown as the still picture
  "chips"   keys shown under the picture. Each one must be written exactly as in content/shortcuts.js.
            "from" and "to" say when it lights up (0 to 1 through the loop).
  "caption" one plain sentence under the picture. Safe to edit.
*/

window.COURSE_CONTENT = window.COURSE_CONTENT || {};

window.COURSE_CONTENT.visuals = [
  { lesson: 0, scene: "setup", mode: "", seconds: 8, poster: 0.8,
    chips: [{ keys: "Edit, Preferences, Input", from: 0.35, to: 0.95 }],
    caption: "Blender comes from blender.org, and Emulate Numpad lets the number keys along the top work like a number pad." },

  /* Week 1 */
  { lesson: 1, scene: "window", mode: "", seconds: 9, poster: 0.55,
    chips: [{ keys: "Drag an edge", from: 0.62, to: 0.84 }],
    caption: "The window's four areas light up one by one: the 3D Viewport, the Outliner, the Properties editor and the Timeline." },
  { lesson: 2, scene: "orbit", mode: "", seconds: 10, poster: 0.42,
    chips: [{ keys: "Middle mouse drag", from: 0.0, to: 0.3 }, { keys: "1", from: 0.34, to: 0.52 }, { keys: "3", from: 0.54, to: 0.72 }, { keys: "7", from: 0.74, to: 0.92 }],
    caption: "Your view circles the cube, then the keys 1, 3 and 7 jump to the front, side and top views." },
  { lesson: 3, scene: "transform", mode: "", seconds: 9, poster: 0.97,
    chips: [{ keys: "G", from: 0.06, to: 0.32 }, { keys: "X, Y or Z", from: 0.12, to: 0.32 }, { keys: "R", from: 0.38, to: 0.62 }, { keys: "S", from: 0.68, to: 0.92 }],
    caption: "One cube moves with G, one turns 45 degrees with R, and one grows to twice the size with S." },
  { lesson: 4, scene: "add", mode: "table", seconds: 10, poster: 0.78,
    chips: [{ keys: "Shift + A", from: 0.02, to: 0.7 }, { keys: "X", from: 0.82, to: 0.95 }],
    caption: "Shapes pop out of the Add menu at the 3D cursor and become a table, and X deletes the one not needed." },
  { lesson: 5, scene: "add", mode: "desk", seconds: 10, poster: 0.95,
    chips: [],
    caption: "A table, a mug, a ball and a lamp come together in one desk scene." },

  /* Week 2 */
  { lesson: 6, scene: "edit", mode: "select", seconds: 10, poster: 0.86,
    chips: [{ keys: "Tab", from: 0.02, to: 0.14 }, { keys: "Select mode buttons", from: 0.16, to: 0.66 }],
    caption: "In Edit Mode the points, the lines and the faces glow in turn, then the top points move to make a ramp." },
  { lesson: 7, scene: "edit", mode: "extrude", seconds: 10, poster: 0.95,
    chips: [{ keys: "E", from: 0.04, to: 0.26 }, { keys: "S", from: 0.28, to: 0.46 }, { keys: "E", from: 0.48, to: 0.68 }, { keys: "I", from: 0.7, to: 0.88 }],
    caption: "A cylinder becomes a bottle: extrude up, scale in, extrude the neck, inset the top." },
  { lesson: 8, scene: "edit", mode: "bevel", seconds: 9, poster: 0.9,
    chips: [{ keys: "Ctrl + R", from: 0.06, to: 0.4 }, { keys: "Ctrl + B", from: 0.46, to: 0.84 }],
    caption: "A ring of cuts slides into place, then the sharp edges of the podium round off softly." },
  { lesson: 9, scene: "garment", mode: "mirror", seconds: 10, poster: 0.9,
    chips: [{ keys: "Wrench tab", from: 0.1, to: 0.55 }, { keys: "Right-click, Shade Smooth", from: 0.74, to: 0.94 }],
    caption: "Half a shirt gets its other half from Mirror, then Subdivision Surface smooths the blocky shape." },
  { lesson: 10, scene: "garment", mode: "shirt", seconds: 9, poster: 0.15,
    chips: [],
    caption: "The finished T-shirt turns slowly, with its collar opening, hem and sleeve ends." },

  /* Week 3 */
  { lesson: 11, scene: "garment", mode: "cap", seconds: 10, poster: 0.92,
    chips: [],
    caption: "Half a sphere and a brim become a cap, and Solidify gives it thickness." },
  { lesson: 12, scene: "material", mode: "colour", seconds: 10, poster: 0.3,
    chips: [{ keys: "Third shading ball", from: 0.0, to: 1.0 }],
    caption: "The colours change, and the shine goes from shiny to matte as Roughness goes up." },
  { lesson: 13, scene: "light", mode: "", seconds: 10, poster: 0.9,
    chips: [{ keys: "Fourth shading ball", from: 0.0, to: 1.0 }],
    caption: "No light, black picture; then a bigger light makes softer shadows, and a weaker fill lights the other side." },
  { lesson: 14, scene: "camera", mode: "frame", seconds: 10, poster: 0.6,
    chips: [{ keys: "Numpad 0", from: 0.3, to: 0.62 }, { keys: "Ctrl + Alt + Numpad 0", from: 0.7, to: 0.92 }],
    caption: "Through the camera, the dark frame shows what ends up in the square picture." },
  { lesson: 15, scene: "camera", mode: "render", seconds: 9, poster: 0.95,
    chips: [{ keys: "F12", from: 0.1, to: 0.6 }, { keys: "Image, Save As", from: 0.68, to: 0.98 }],
    caption: "F12 renders the picture, and Image, Save As keeps it as a PNG." },

  /* Week 4 */
  { lesson: 16, scene: "uv", mode: "", seconds: 10, poster: 0.72,
    chips: [],
    caption: "The box opens flat along its seams like a cardboard box, and that flat map is the UV map." },
  { lesson: 17, scene: "print", mode: "texture", seconds: 10, poster: 0.85,
    chips: [],
    caption: "A print with a see-through background sits on a flat plane, then on the front of the shirt." },
  { lesson: 18, scene: "print", mode: "decal", seconds: 10, poster: 0.35,
    chips: [{ keys: "Add, Image, Mesh Plane", from: 0.02, to: 0.22 }],
    caption: "The print is its own plane hugging the shirt, so it moves, resizes and swaps easily." },
  { lesson: 19, scene: "material", mode: "fabric", seconds: 9, poster: 0.9,
    chips: [],
    caption: "Higher roughness and a fine bump turn a plastic-looking shirt into cotton." },
  { lesson: 20, scene: "print", mode: "mockup", seconds: 10, poster: 0.5,
    chips: [],
    caption: "The shirt and cap with a print, on the podium, lit and framed square." },

  /* Week 5 */
  { lesson: 21, scene: "keyframe", mode: "", seconds: 9, poster: 0.55,
    chips: [{ keys: "I", from: 0.02, to: 0.24 }],
    caption: "Be here at frame 1, be there at frame 90, and Blender fills in the middle as the cap turns a full circle." },
  { lesson: 22, scene: "graph", mode: "", seconds: 6, poster: 0.55,
    chips: [],
    caption: "A curved line eases in and out like the dropping shirt; a straight line keeps the turntable at one speed." },
  { lesson: 23, scene: "camera", mode: "orbit", seconds: 10, poster: 0.12,
    chips: [],
    caption: "The camera is parented to an Empty, so turning the Empty orbits the camera around the product." },
  { lesson: 24, scene: "frames", mode: "", seconds: 8, poster: 0.38,
    chips: [{ keys: "Ctrl + F12", from: 0.04, to: 0.7 }],
    caption: "Many pictures rendered one after the other become a vertical MP4 video." },
  { lesson: 25, scene: "print", mode: "reel", seconds: 6, poster: 0.9,
    chips: [],
    caption: "A vertical product reveal: print on, camera move, background colour, clean ending." },

  /* Week 6 */
  { lesson: 26, scene: "export", mode: "", seconds: 8, poster: 0.9,
    chips: [{ keys: "File, Export, glTF 2.0", from: 0.06, to: 0.4 }],
    caption: "The cap travels as one .glb file and opens on a web page." },
  { lesson: 27, scene: "garment", mode: "build", seconds: 9, poster: 0.85,
    chips: [],
    caption: "From a blank file, a new shirt and cap take shape, clean and smooth." },
  { lesson: 28, scene: "outputs", mode: "", seconds: 8, poster: 0.95,
    chips: [],
    caption: "Three files: a square PNG, a vertical MP4 and a .glb." },
  { lesson: 29, scene: "certificate", mode: "", seconds: 10, poster: 0.97,
    chips: [],
    caption: "The nine points of the standard are ticked one by one, then the certificate." }
];

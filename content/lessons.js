/*
  Zedlab Blender Course: the lessons.

  Every lesson word comes from BLENDER_Timetable_v3, made general for every learner.
  Dates are never written here: the app works them out from each learner's start date.

  To change a word: change it between the quote marks "like this".
  Keep the quote marks, the commas and the brackets exactly where they are.
  "stepByStepGuide" is left empty on purpose: we fill it in after each lesson.
*/

window.COURSE_CONTENT = window.COURSE_CONTENT || {};

window.COURSE_CONTENT.course = {
  name: "Blender 5.2 LTS in 6 weeks",
  blenderVersion: "Blender 5.2 LTS (5.2.3 or any later 5.2 update)",
  manual: "https://docs.blender.org/manual/en/5.2/",
  download: "https://www.blender.org/download/lts/",
  renderEngine: "EEVEE is the default for the whole course. Cycles appears once in week 4 with small images.",
  goals: "By the end of the course: T-shirt and cap mockups with Zedlab prints; product renders for posts; short 3D animations for social; 3D pieces (.glb) for the Zedlab website.",
  lessonCount: 29,

  /* The parts of every lesson, in minutes, for a 45-minute lesson. The app scales them to the learner's own lesson length. */
  routine: [
    { part: "Recap", minutes: 3 },
    { part: "The one idea", minutes: 10 },
    { part: "You build", minutes: 25 },
    { part: "Screenshot check", minutes: 5 },
    { part: "Preview the next lesson", minutes: 2 }
  ],

  /* Days off every learner starts with. They can add more in the set-up. */
  defaultDaysOff: [
    { month: 12, day: 9, name: "Independence Day", note: "Public holiday in Tanzania." }
  ],

  /* What the Today screen says on a day off. */
  dayOff: {
    title: "No lesson today",
    text: "Nothing to do today.",
    practice: "Rest, or keep practising the last lesson if you want to."
  }
};

window.COURSE_CONTENT.weeks = [
  { week: 1, theme: "Finding your way around.", note: "Deliberately slower.", firstLesson: 1, lastLesson: 5 },
  { week: 2, theme: "Shaping things.", note: "", firstLesson: 6, lastLesson: 10 },
  { week: 3, theme: "Colour, light, camera, first picture.", note: "", firstLesson: 11, lastLesson: 15 },
  { week: 4, theme: "Putting the print on.", note: "", firstLesson: 16, lastLesson: 20 },
  { week: 5, theme: "Making it move.", note: "", firstLesson: 21, lastLesson: 25 },
  { week: 6, theme: "Web export and the final project.", note: "", firstLesson: 26, lastLesson: 29 }
];

/* Day 0: done once, before the first lesson. Not a numbered lesson. */
window.COURSE_CONTENT.beforeYouStart = {
  number: 0,
  title: "Install and set up",
  length: "About 20 minutes, not a lesson day.",
  ideaInOneSentence: "Install Blender 5.2 LTS from blender.org and switch on Emulate Numpad.",
  oneIdea: "Blender is a free program from blender.org. We install the version this course uses, Blender 5.2 LTS (5.2.3 or any later 5.2 update), and set two switches so a laptop without a number pad works like a desktop.",
  youMake: "A working Blender 5.2 LTS with Emulate Numpad switched on and a mouse ready.",
  proofToSend: "Two screenshots: the start screen showing the version number, and Edit, Preferences, System.",
  buildsOn: "Nothing. This is the starting line.",
  next: "A tour of the window.",
  checklist: [
    "Download and install Blender 5.2 LTS from blender.org. On Windows, use the Windows Installer. On a Mac (it needs a Mac with Apple silicon) or on Linux, download the version for your computer from the same page.",
    "Edit, Preferences, Input: switch on Emulate Numpad. Blender then treats the number keys along the top of the keyboard as number pad keys, which the lessons use. Trackpad only: also Emulate 3 Button Mouse.",
    "Use a mouse with a scroll wheel and middle button.",
    "Proof: screenshot of the start screen with the version number; screenshot of Edit, Preferences, System."
  ],
  stepByStepGuide: ""
};

window.COURSE_CONTENT.lessons = [

  /* ---------- Week 1: Finding your way around ---------- */

  {
    number: 1, week: 1, day: 1, kind: "lesson",
    title: "The window: four areas you will use every day",
    ideaInOneSentence: "Blender's window is split into areas, and you need four: the 3D Viewport, the Outliner, the Properties editor and the Timeline.",
    oneIdea: "Blender's window is split into areas. Each area shows one editor. You need four: the 3D Viewport (where you build), the Outliner (the list of everything in the scene), the Properties editor (the settings of what you selected) and the Timeline (for animation, later).",
    youMake: "Open Blender, find the four areas, drag an edge to resize one, then save your first file as BLENDER_W1D1_v1.blend.",
    proofToSend: "Screenshot of the whole Blender window with the file name visible in the title bar.",
    buildsOn: "The install, before you start.",
    next: "Moving your view around the scene.",
    stepByStepGuide: ""
  },
  {
    number: 2, week: 1, day: 2, kind: "lesson",
    title: "Moving your view, not the object",
    ideaInOneSentence: "In 3D you move your own eyes around the scene, not the object.",
    oneIdea: "In 3D you move your own eyes around the scene. Middle mouse drag orbits, Shift plus middle drag slides, the scroll wheel zooms. The top-row keys 1, 3 and 7 jump to front, side and top views (that is what Emulate Numpad gives you).",
    youMake: "Open BLENDER_W1D1_v1.blend, the file you saved on day 1. It holds Blender's default scene, the one Blender starts with. Look at the scene from the front, the side, the top, then back to a corner view.",
    proofToSend: "Screenshot of the whole Blender window in front view. The title bar must show the file name, the version 5.2 LTS (for example 5.2.3 LTS) and no star. The text in the top-left corner of the 3D Viewport must say Front Orthographic (that also proves Emulate Numpad is on).",
    buildsOn: "The four areas from day 1.",
    next: "Grabbing and moving things.",
    stepByStepGuide: ""
  },
  {
    number: 3, week: 1, day: 3, kind: "lesson",
    title: "Select, move, rotate, scale",
    ideaInOneSentence: "Click an object to select it, then G moves it, R turns it and S makes it bigger or smaller.",
    oneIdea: "Click an object to select it (it gets an orange outline). Then G moves it, R turns it, S makes it bigger or smaller. Press X, Y or Z straight after to lock to one direction. Left click confirms, right click cancels.",
    youMake: "Three objects in a neat row: one turned 45 degrees, one twice the size.",
    proofToSend: "Screenshot from a corner view showing all three.",
    buildsOn: "Orbiting the view, so you can check your row from the side.",
    next: "Adding new shapes.",
    stepByStepGuide: ""
  },
  {
    number: 4, week: 1, day: 4, kind: "lesson",
    title: "Adding and deleting objects",
    ideaInOneSentence: "Shift plus A opens the Add menu of ready-made shapes, and X deletes.",
    oneIdea: "Shift plus A opens the Add menu with ready-made shapes: cube, sphere, cylinder, plane, cone. X deletes. A new shape appears where the 3D cursor is. The small panel that pops up bottom-left changes what you just added (size, number of segments).",
    youMake: "A simple table: one flat cube for the top and four cylinder legs.",
    proofToSend: "Screenshot from a corner view.",
    buildsOn: "Move, rotate, scale, to place the legs.",
    next: "The week 1 project, a whole desk scene.",
    stepByStepGuide: ""
  },
  {
    number: 5, week: 1, day: 5, kind: "week project",
    title: "Week 1 project: a desk scene",
    ideaInOneSentence: "No new tools: put the whole week together in one file.",
    oneIdea: "No new tools. Put the whole week together in one file: a table, a mug from a cylinder, a ball, a lamp from a cone.",
    youMake: "BLENDER_Week1Project_v1.blend.",
    proofToSend: "One screenshot from a corner view, plus the .blend file.",
    buildsOn: "Everything from days 1 to 4.",
    next: "Week 2: changing the shape of things.",
    stepByStepGuide: ""
  },

  /* ---------- Week 2: Shaping things ---------- */

  {
    number: 6, week: 2, day: 1, kind: "lesson",
    title: "Edit Mode: points, lines, faces",
    ideaInOneSentence: "Tab switches between Object Mode, for moving whole things, and Edit Mode, for changing the shape itself.",
    oneIdea: "Tab switches between Object Mode (moving whole things) and Edit Mode (changing the shape itself). A shape is made of points (vertices), the lines between them (edges) and the flat panels between the lines (faces). The three small buttons in the 3D Viewport header choose which of the three you are selecting.",
    youMake: "Turn a cube into a ramp by moving its top points.",
    proofToSend: "Screenshot in Edit Mode, with the mode name and the three select-mode buttons visible in the top-left of the viewport.",
    buildsOn: "Select and move, now on points instead of objects.",
    next: "Pulling new parts out of a shape.",
    stepByStepGuide: ""
  },
  {
    number: 7, week: 2, day: 2, kind: "lesson",
    title: "Extrude and Inset",
    ideaInOneSentence: "E pulls a new piece out of a face, and I draws a smaller face inside a face.",
    oneIdea: "E extrudes: it pulls a new piece out of a face. I insets: it draws a smaller face inside a face. Most shapes in the world are these two moves repeated.",
    youMake: "A bottle from a cylinder: extrude up, scale in, extrude the neck, inset the top.",
    proofToSend: "Screenshot from the side.",
    buildsOn: "Face selection from day 1.",
    next: "Controlling where a shape bends.",
    stepByStepGuide: ""
  },
  {
    number: 8, week: 2, day: 3, kind: "lesson",
    title: "Loop Cut and Bevel",
    ideaInOneSentence: "Ctrl plus R adds a ring of cuts so you control where a shape bends, and Ctrl plus B rounds off a sharp edge.",
    oneIdea: "Ctrl plus R adds a ring of cuts around a shape so you control where it bends. Ctrl plus B rounds off a sharp edge. Real products have no razor edges, so bevel is what makes a render believable.",
    youMake: "A display podium with softly rounded edges. Your products will sit on it for the rest of the course.",
    proofToSend: "Screenshot, close enough to see the rounded edges.",
    buildsOn: "Edge selection.",
    next: "Modifiers, effects you can switch off.",
    stepByStepGuide: ""
  },
  {
    number: 9, week: 2, day: 4, kind: "lesson",
    title: "Modifiers 1: Mirror and Subdivision Surface",
    ideaInOneSentence: "A modifier is an effect stacked on an object that you can switch off any time.",
    oneIdea: "A modifier is an effect stacked on an object in the Properties editor (the wrench tab). You can switch it off any time. Mirror builds the other half for you, so you model only one side. Subdivision Surface smooths a blocky shape into a soft one.",
    youMake: "Block out the T-shirt body: half a flattened box, Mirror, extrude one sleeve, Subdivision Surface, right-click Shade Smooth.",
    proofToSend: "Screenshot with the Modifiers tab visible on the right.",
    buildsOn: "Extrude, for the sleeve.",
    next: "Week 2 project: finish the shirt.",
    stepByStepGuide: ""
  },
  {
    number: 10, week: 2, day: 5, kind: "week project",
    title: "Week 2 project: the T-shirt",
    ideaInOneSentence: "Finish the shirt with the week's tools: collar opening, hem, sleeve ends.",
    oneIdea: "Finish the shirt with the week's tools: collar opening, hem, sleeve ends.",
    youMake: "BLENDER_Week2Project_v1.blend.",
    proofToSend: "Front and side screenshots, plus the .blend file.",
    buildsOn: "Day 4's block-out.",
    next: "Week 3: a cap, colours, lights, a camera, your first picture.",
    stepByStepGuide: ""
  },

  /* ---------- Week 3: Colour, light, camera, first picture ---------- */

  {
    number: 11, week: 3, day: 1, kind: "lesson",
    title: "Modifiers 2: Solidify, and the cap",
    ideaInOneSentence: "A surface in Blender has no thickness until you give it one, and Solidify adds it.",
    oneIdea: "A surface in Blender has no thickness until you give it one. Solidify adds it. A cap is half a sphere with a brim.",
    youMake: "The cap: a UV Sphere with its bottom half deleted, a brim from a circle, Solidify for thickness, Subdivision Surface for softness.",
    proofToSend: "Screenshot from a three-quarter view.",
    buildsOn: "Modifiers from week 2.",
    next: "Giving things colour.",
    stepByStepGuide: ""
  },
  {
    number: 12, week: 3, day: 2, kind: "lesson",
    title: "Materials and colours",
    ideaInOneSentence: "A material is the skin of an object: Base Color is its colour and Roughness decides shiny or matte.",
    oneIdea: "A material is the skin of an object. Base Color is its colour, Roughness decides shiny or matte. The third shading ball in the top-right of the viewport (Material Preview) shows materials as they will look.",
    youMake: "Colour the shirt, the cap and the podium in Zedlab colours.",
    proofToSend: "Screenshot in Material Preview.",
    buildsOn: "The shirt, cap and podium you built.",
    next: "Light, without which a render is black.",
    stepByStepGuide: ""
  },
  {
    number: 13, week: 3, day: 3, kind: "lesson",
    title: "Lights",
    ideaInOneSentence: "No light, black picture, and the bigger the light, the softer the shadow.",
    oneIdea: "No light, black picture. Blender has Point, Sun and Area lights. The bigger the light, the softer the shadow. Two lights do most product shots: a main light and a weaker fill on the other side.",
    youMake: "Light the podium scene with two Area lights.",
    proofToSend: "Screenshot in Rendered shading (the fourth shading ball).",
    buildsOn: "Materials, which only show properly with light.",
    next: "The camera decides what ends up in the picture.",
    stepByStepGuide: ""
  },
  {
    number: 14, week: 3, day: 4, kind: "lesson",
    title: "The camera",
    ideaInOneSentence: "The render is what the camera sees, not what you see.",
    oneIdea: "The render is what the camera sees, not what you see. Numpad 0 looks through the camera. Ctrl plus Alt plus Numpad 0 moves the camera to your current view. In Output Properties you set the picture size: 1080 by 1080 for a square post.",
    youMake: "Frame the shirt and cap on the podium for a square post.",
    proofToSend: "Screenshot through the camera, with the dark frame around the picture area visible.",
    buildsOn: "Orbiting the view, since you aim the camera by looking first.",
    next: "Week 3 project: the first real picture.",
    stepByStepGuide: ""
  },
  {
    number: 15, week: 3, day: 5, kind: "week project",
    title: "Week 3 project: your first render",
    ideaInOneSentence: "The render engine turns the scene into a picture: F12 renders, then Image, Save As saves a PNG.",
    oneIdea: "The render engine turns the scene into a picture. EEVEE is the fast one and your default. F12 renders, then Image, Save As saves a PNG.",
    youMake: "BLENDER_Week3Project_v1.png, the first finished product picture.",
    proofToSend: "The PNG file.",
    buildsOn: "Lights and camera.",
    next: "Week 4: putting the Zedlab print on the shirt.",
    stepByStepGuide: ""
  },

  /* ---------- Week 4: Putting the print on ---------- */

  {
    number: 16, week: 4, day: 1, kind: "lesson",
    title: "UV unwrap: unfolding the shirt flat",
    ideaInOneSentence: "To put a flat picture on a 3D shape, Blender unfolds the shape flat, like opening a cardboard box.",
    oneIdea: "To put a flat picture on a 3D shape, Blender unfolds the shape flat, like opening a cardboard box. That flat map is the UV map. You tell it where to cut with seams.",
    youMake: "Unwrap a cube, then the T-shirt (seams down the sides and over the shoulders) in the UV Editing workspace.",
    proofToSend: "Screenshot of the UV Editing workspace showing the flat map on the left.",
    buildsOn: "Edge selection, for marking seams.",
    next: "Replacing a colour with a picture.",
    stepByStepGuide: ""
  },
  {
    number: 17, week: 4, day: 2, kind: "lesson",
    title: "Image textures: a picture instead of a colour",
    ideaInOneSentence: "Base Color can be a picture instead of one colour, loaded through an Image Texture.",
    oneIdea: "Base Color does not have to be one colour. It can be a picture, loaded through an Image Texture. A PNG with a see-through background keeps its transparency.",
    youMake: "A Zedlab print on a flat plane, then on the front of the shirt through day 1's UV map.",
    proofToSend: "Screenshot in Material Preview.",
    buildsOn: "The UV map.",
    next: "A faster way to place a print.",
    stepByStepGuide: ""
  },
  {
    number: 18, week: 4, day: 3, kind: "lesson",
    title: "Decals: the fast way to place a print",
    ideaInOneSentence: "A print can be its own flat plane that hugs the shirt, which is easier to move, resize and swap.",
    oneIdea: "A print can also be its own flat plane that hugs the shirt: Add, Image, Mesh Plane for the picture, then a Shrinkwrap modifier to make it wrap onto the shirt. Easier to move, resize and swap than editing the UV map.",
    youMake: "Place a print on the shirt as a decal, move it, resize it, swap the image.",
    proofToSend: "Screenshot with the print in a new position.",
    buildsOn: "Modifiers and image textures.",
    next: "The cap logo, and making cotton look like cotton.",
    stepByStepGuide: ""
  },
  {
    number: 19, week: 4, day: 4, kind: "lesson",
    title: "Logo on the cap, and the fabric look",
    ideaInOneSentence: "Higher roughness plus a bump that fakes weave turns a plastic-looking shirt into fabric.",
    oneIdea: "Plastic and cotton differ in two things: roughness and a tiny surface texture. A bump (a small pattern that fakes weave) plus higher roughness turns a plastic-looking shirt into fabric.",
    youMake: "Logo decal on the cap front, fabric bump on shirt and cap. One small Cycles test render so you know the slow engine exists.",
    proofToSend: "Close-up screenshot in Rendered shading.",
    buildsOn: "Decals from day 3.",
    next: "Week 4 project: the first real mockup.",
    stepByStepGuide: ""
  },
  {
    number: 20, week: 4, day: 5, kind: "week project",
    title: "Week 4 project: the apparel mockup",
    ideaInOneSentence: "Shirt and cap with a real Zedlab client print, on the podium, lit, framed square.",
    oneIdea: "Shirt and cap with a real Zedlab client print, on the podium, lit, framed square.",
    youMake: "BLENDER_Week4Project_v1.png (1080 by 1080) plus the .blend.",
    proofToSend: "The PNG and the .blend file.",
    buildsOn: "Weeks 2 to 4.",
    next: "Week 5: making it move.",
    stepByStepGuide: ""
  },

  /* ---------- Week 5: Making it move ---------- */

  {
    number: 21, week: 5, day: 1, kind: "lesson",
    title: "Keyframes: be here, then be there",
    ideaInOneSentence: "Animation is two instructions: be here at frame 1, be there at frame 90, and Blender fills in the middle.",
    oneIdea: "Animation is two instructions: be here at frame 1, be there at frame 90. Blender fills in the middle. Press I over the viewport to insert a keyframe; it shows as a diamond in the Timeline. 30 frames make one second.",
    youMake: "The cap turns a full circle in 3 seconds (a turntable).",
    proofToSend: "Two screenshots, at frame 1 and frame 45, with the Timeline visible.",
    buildsOn: "Rotate, from week 1.",
    next: "Making motion feel natural.",
    stepByStepGuide: ""
  },
  {
    number: 22, week: 5, day: 2, kind: "lesson",
    title: "Easing: the Graph Editor",
    ideaInOneSentence: "The Graph Editor shows motion as a curve: a curved line eases in and out, a straight line is constant speed.",
    oneIdea: "The Graph Editor shows motion as a curve. A curved line eases in and out, which feels natural. A straight line is constant speed, which is right for a turntable so it loops without a stutter.",
    youMake: "The shirt drops in and settles; the turntable set to Linear so it loops cleanly.",
    proofToSend: "Screenshot of the Graph Editor showing both curves.",
    buildsOn: "Day 1's keyframes.",
    next: "Moving the camera instead of the product.",
    stepByStepGuide: ""
  },
  {
    number: 23, week: 5, day: 3, kind: "lesson",
    title: "Camera moves",
    ideaInOneSentence: "The camera is an object, so it can be animated like any other.",
    oneIdea: "The camera is an object, so it can be animated like any other. Parent it to an Empty (an invisible helper point) and turn the Empty to orbit smoothly around the product.",
    youMake: "A slow push-in and a half orbit around the shirt and cap.",
    proofToSend: "Screenshots through the camera at the first and last frame.",
    buildsOn: "Keyframes and the camera.",
    next: "Turning frames into a video file.",
    stepByStepGuide: ""
  },
  {
    number: 24, week: 5, day: 4, kind: "lesson",
    title: "Rendering a video",
    ideaInOneSentence: "A video is many pictures rendered one after the other.",
    oneIdea: "A video is many pictures rendered one after the other. Output Properties: 1080 by 1920 vertical, 30 frames per second, file format FFmpeg Video, container MPEG-4. Ctrl plus F12 renders the animation. EEVEE keeps this to minutes, not hours.",
    youMake: "A 5-second MP4 of the turntable: BLENDER_W5D4_v1.mp4.",
    proofToSend: "The MP4 file.",
    buildsOn: "The turntable from day 1.",
    next: "Week 5 project: a vertical reel.",
    stepByStepGuide: ""
  },
  {
    number: 25, week: 5, day: 5, kind: "week project",
    title: "Week 5 project: a 6-second reel",
    ideaInOneSentence: "A product reveal: print on, camera move, background colour, clean ending.",
    oneIdea: "A product reveal: print on, camera move, background colour, clean ending.",
    youMake: "BLENDER_Week5Project_v1.mp4, 1080 by 1920.",
    proofToSend: "The MP4 file.",
    buildsOn: "The whole of week 5.",
    next: "Week 6: the website export, then the final project.",
    stepByStepGuide: ""
  },

  /* ---------- Week 6: Web export and the final project ---------- */

  {
    number: 26, week: 6, day: 1, kind: "lesson",
    title: "Export for the website: the .glb file",
    ideaInOneSentence: "Websites load 3D as one .glb file holding the shape, materials, pictures and animation.",
    oneIdea: "Websites load 3D as one .glb file holding the shape, materials, pictures and animation. File, Export, glTF 2.0. Keep it light: apply modifiers, textures at 1024 pixels, few polygons, so the page loads fast.",
    youMake: "Export the cap as BLENDER_Cap_v1.glb and open it in a free online glTF viewer to check it.",
    proofToSend: "Screenshot of the viewer showing the cap with its logo.",
    buildsOn: "Everything built so far.",
    next: "Final project, day 1.",
    stepByStepGuide: ""
  },
  {
    number: 27, week: 6, day: 2, kind: "final project",
    title: "Final project, day 1: build",
    ideaInOneSentence: "From a blank file, no help: a new shirt and cap.",
    oneIdea: "From a blank file, no help: a new shirt and cap. One hint per blocker, never the answer first.",
    youMake: "The two models, clean and smooth.",
    proofToSend: "Screenshot at the end of the lesson.",
    buildsOn: "Weeks 1 to 3.",
    next: "Final project, day 2.",
    stepByStepGuide: ""
  },
  {
    number: 28, week: 6, day: 3, kind: "final project",
    title: "Final project, day 2: print, materials, light, camera, outputs set up",
    ideaInOneSentence: "Print, fabric, two lights and the camera, then the three outputs set up to render after the lesson.",
    oneIdea: "The client print placed, fabric materials, two lights, camera framed for both formats. Then the three outputs are set up inside the lesson and the renders run after it, on your own time: EEVEE takes minutes, not hours.",
    youMake: "The finished scene, plus the three files rendered and exported before the next lesson: BLENDER_Final_v1.png (1080 by 1080), BLENDER_Final_v1.mp4 (1080 by 1920, 6 to 8 seconds), BLENDER_Final_v1.glb.",
    proofToSend: "Screenshot in Rendered shading at the end of the lesson. The three files before the next lesson.",
    buildsOn: "Weeks 3 to 6.",
    next: "The files are judged, then the certificate.",
    stepByStepGuide: ""
  },
  {
    number: 29, week: 6, day: 4, kind: "certificate day",
    title: "The three files judged against the standard, then the certificate",
    ideaInOneSentence: "The three outputs are checked line by line against the nine-point standard.",
    oneIdea: "The three outputs are checked line by line against the nine-point standard. All nine pass: certificate of completion issued by Zedlab and Claude, with your name, dates, skills covered and the final project. Not all nine: a plain list of what is left, and a date to resubmit.",
    youMake: "Fixes, if any lines fail.",
    proofToSend: "The three files, sent before the lesson. This is the judging day.",
    buildsOn: "The whole course.",
    next: "Your own projects for Zedlab.",
    stepByStepGuide: ""
  }
];

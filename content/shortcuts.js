/*
  Zedlab Blender Course: the shortcut cheat sheet.

  Only keys, mouse moves and menu paths that the lessons teach.
  "keys"        what to press. " + " means press together; each part shows as a key chip.
  "asWritten"   the exact words in the lesson (the check page makes sure they are there)
  "does"        what it does, in plain words
  "where"       when it works, if that matters
  "firstLesson" the lesson that teaches it (0 = before you start). Keys from lessons not reached yet show dimmed.
  "type"        "key", "mouse", "menu" (a path through Blender's menus) or "place" (somewhere to click)
*/

window.COURSE_CONTENT = window.COURSE_CONTENT || {};

window.COURSE_CONTENT.shortcuts = [

  /* Before you start */
  { keys: "Edit, Preferences, Input", asWritten: "Edit, Preferences, Input", type: "menu", firstLesson: 0,
    does: "Opens the settings where you switch on Emulate Numpad.", where: "" },
  { keys: "Edit, Preferences, System", asWritten: "Edit, Preferences, System", type: "menu", firstLesson: 0,
    does: "The settings page for your before-you-start screenshot.", where: "" },

  /* Week 1 */
  { keys: "Drag an edge", asWritten: "drag an edge to resize one", type: "mouse", firstLesson: 1,
    does: "Resizes an area.", where: "On the edge between two areas." },
  { keys: "Middle mouse drag", asWritten: "Middle mouse drag orbits", type: "mouse", firstLesson: 2,
    does: "Orbits: turns your view around the scene.", where: "In the 3D Viewport." },
  { keys: "Shift + Middle drag", asWritten: "Shift plus middle drag slides", type: "mouse", firstLesson: 2,
    does: "Slides your view sideways.", where: "In the 3D Viewport." },
  { keys: "Scroll wheel", asWritten: "the scroll wheel zooms", type: "mouse", firstLesson: 2,
    does: "Zooms in and out.", where: "In the 3D Viewport." },
  { keys: "1", asWritten: "The top-row keys 1, 3 and 7 jump to front, side and top views", type: "key", firstLesson: 2,
    does: "Front view.", where: "Top-row key, with Emulate Numpad on." },
  { keys: "3", asWritten: "The top-row keys 1, 3 and 7 jump to front, side and top views", type: "key", firstLesson: 2,
    does: "Side view.", where: "Top-row key, with Emulate Numpad on." },
  { keys: "7", asWritten: "The top-row keys 1, 3 and 7 jump to front, side and top views", type: "key", firstLesson: 2,
    does: "Top view.", where: "Top-row key, with Emulate Numpad on." },
  { keys: "Click", asWritten: "Click an object to select it", type: "mouse", firstLesson: 3,
    does: "Selects an object. It gets an orange outline.", where: "" },
  { keys: "G", asWritten: "G moves it", type: "key", firstLesson: 3,
    does: "Moves what you selected.", where: "" },
  { keys: "R", asWritten: "R turns it", type: "key", firstLesson: 3,
    does: "Turns (rotates) what you selected.", where: "" },
  { keys: "S", asWritten: "S makes it bigger or smaller", type: "key", firstLesson: 3,
    does: "Makes what you selected bigger or smaller (scale).", where: "" },
  { keys: "X, Y or Z", asWritten: "Press X, Y or Z straight after to lock to one direction", type: "key", firstLesson: 3,
    does: "Locks the move, turn or size change to one direction.", where: "Straight after G, R or S." },
  { keys: "Left click", asWritten: "Left click confirms", type: "mouse", firstLesson: 3,
    does: "Confirms.", where: "During G, R or S." },
  { keys: "Right click", asWritten: "right click cancels", type: "mouse", firstLesson: 3,
    does: "Cancels.", where: "During G, R or S." },
  { keys: "Shift + A", asWritten: "Shift plus A opens the Add menu", type: "key", firstLesson: 4,
    does: "Opens the Add menu of ready-made shapes.", where: "In the 3D Viewport." },
  { keys: "X", asWritten: "X deletes", type: "key", firstLesson: 4,
    does: "Deletes what you selected.", where: "" },

  /* Week 2 */
  { keys: "Tab", asWritten: "Tab switches between Object Mode (moving whole things) and Edit Mode (changing the shape itself)", type: "key", firstLesson: 6,
    does: "Switches between Object Mode and Edit Mode.", where: "" },
  { keys: "Select mode buttons", asWritten: "The three small buttons in the 3D Viewport header choose which of the three you are selecting", type: "place", firstLesson: 6,
    does: "Choose points, lines or faces.", where: "In the 3D Viewport header, in Edit Mode." },
  { keys: "E", asWritten: "E extrudes", type: "key", firstLesson: 7,
    does: "Extrudes: pulls a new piece out of a face.", where: "In Edit Mode." },
  { keys: "I", asWritten: "I insets", type: "key", firstLesson: 7,
    does: "Insets: draws a smaller face inside a face.", where: "In Edit Mode." },
  { keys: "Ctrl + R", asWritten: "Ctrl plus R adds a ring of cuts", type: "key", firstLesson: 8,
    does: "Loop Cut: adds a ring of cuts around a shape.", where: "In Edit Mode." },
  { keys: "Ctrl + B", asWritten: "Ctrl plus B rounds off a sharp edge", type: "key", firstLesson: 8,
    does: "Bevel: rounds off a sharp edge.", where: "In Edit Mode." },
  { keys: "Wrench tab", asWritten: "in the Properties editor (the wrench tab)", type: "place", firstLesson: 9,
    does: "Where modifiers live.", where: "In the Properties editor." },
  { keys: "Right-click, Shade Smooth", asWritten: "right-click Shade Smooth", type: "menu", firstLesson: 9,
    does: "Makes the object look smooth.", where: "" },

  /* Week 3 */
  { keys: "Third shading ball", asWritten: "The third shading ball in the top-right of the viewport (Material Preview)", type: "place", firstLesson: 12,
    does: "Material Preview: shows materials as they will look.", where: "Top-right of the 3D Viewport." },
  { keys: "Fourth shading ball", asWritten: "Rendered shading (the fourth shading ball)", type: "place", firstLesson: 13,
    does: "Rendered shading: shows the scene with its lights.", where: "Top-right of the 3D Viewport." },
  { keys: "Numpad 0", asWritten: "Numpad 0 looks through the camera", type: "key", firstLesson: 14,
    does: "Looks through the camera.", where: "With Emulate Numpad on, the top-row 0." },
  { keys: "Ctrl + Alt + Numpad 0", asWritten: "Ctrl plus Alt plus Numpad 0 moves the camera to your current view", type: "key", firstLesson: 14,
    does: "Moves the camera to your current view.", where: "With Emulate Numpad on, the top-row 0." },
  { keys: "Output Properties", asWritten: "In Output Properties you set the picture size", type: "place", firstLesson: 14,
    does: "Sets the picture size, and later the video settings.", where: "" },
  { keys: "F12", asWritten: "F12 renders", type: "key", firstLesson: 15,
    does: "Renders a picture.", where: "" },
  { keys: "Image, Save As", asWritten: "Image, Save As saves a PNG", type: "menu", firstLesson: 15,
    does: "Saves the rendered picture as a PNG.", where: "" },

  /* Week 4 */
  { keys: "UV Editing workspace", asWritten: "in the UV Editing workspace", type: "place", firstLesson: 16,
    does: "The window layout for unwrapping.", where: "" },
  { keys: "Add, Image, Mesh Plane", asWritten: "Add, Image, Mesh Plane for the picture", type: "menu", firstLesson: 18,
    does: "Adds a picture as a flat plane, ready to become a decal.", where: "" },

  /* Week 5 */
  { keys: "I", asWritten: "Press I over the viewport to insert a keyframe", type: "key", firstLesson: 21,
    does: "Inserts a keyframe. It shows as a diamond in the Timeline.", where: "In Object Mode, with the mouse over the 3D Viewport." },
  { keys: "Ctrl + F12", asWritten: "Ctrl plus F12 renders the animation", type: "key", firstLesson: 24,
    does: "Renders the animation.", where: "" },

  /* Week 6 */
  { keys: "File, Export, glTF 2.0", asWritten: "File, Export, glTF 2.0", type: "menu", firstLesson: 26,
    does: "Exports a .glb file for the website.", where: "" }
];

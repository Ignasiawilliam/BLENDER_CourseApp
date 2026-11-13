# Zedlab Blender Course

A friendly companion for a six-week course in **Blender 5.2 LTS**, made by Zedlab.

Anyone who opens the link gets their own fresh course. They type their name and start date, and the app builds their personal calendar of 29 lessons. Each lesson has a short animated picture, what to make, what to send as proof, a lesson timer, the keys it teaches and the Blender words it uses. Progress is saved on their own device, with a backup button. There is no login, no database and no tracking.

The app lives at: **https://ignasiawilliam.github.io/BLENDER_CourseApp/**

Made by Zedlab. Not affiliated with the Blender Foundation.

---

## Using the app

1. **Open the link** on a phone or a laptop.
2. **Set up your course** (under a minute): your name for the certificate, the start date, your lesson days and time, and any days off. 9 December, Independence Day, is a day off already.
3. **Today** shows the lesson for today, with a countdown to lesson time. Press **Start lesson timer** to be guided through the five parts of the lesson.
4. When you finish, press **I did it**. If a day doesn't work, press **Can't today**: that lesson and every later one move along by one lesson day. Nothing is squeezed or skipped.
5. **Copy message for my tutor** (lower down on Today) copies a line like "Start today's lesson: Week 1, day 3, Select, move, rotate, scale." to paste into your chat.
6. Every Friday, download a **backup** (Settings, or the reminder on Today). Keep the file somewhere safe, such as your email.
7. **Put it on your home screen** (Settings explains how). After the first visit it works without internet.

When a new version is published, the app shows **"New version ready, tap to update"**. Tap it to get the new version.

---

## What is in this folder

| Folder or file | What it is |
|---|---|
| `index.html` | The app itself. |
| `content/` | **The lesson words.** These are the files to edit when a lesson changes. |
| `app/` | How the app works: screens, dates, saving, backup, pictures, look, Pweza the teacher (`app/pweza.js`), and the 3D world behind every screen, like a Blender viewport (`app/scene.js`). |
| `img/pictures/` | A still image of each lesson's picture, and a small one for the calendar. |
| `icons/` | The app icon for home screens and the browser tab: the orange octopus (#F08A24) on pitch black. |
| `fonts/` | The Plus Jakarta Sans font (free), so the app works offline. |
| `vendor/three/` | three.js (free), which draws the 3D pictures and the 3D world behind the screens. |
| `vendor/lucide/` | The licence for the Lucide icons used in the tabs. |
| `sw.js`, `manifest.webmanifest` | Let the app work offline and go on a home screen. |
| `check-content.html`, `check-calendar.html`, `check-visuals.html`, `check-pweza.html` | **Check pages**: they test the lesson words, the dates, the pictures and Pweza (every mood and the opening, with a slow-motion button). |
| `tools/make-preloader.js` | Writes Pweza's opening into `index.html`. Only needed if his drawing changes: run `node tools/make-preloader.js`. |
| `Zedlab_logo.svg`, `Zedlab_octopus_logo.svg` | The Zedlab logos, unchanged. The app colours them itself. |

These stay on this computer and are **never published** (the `.gitignore` file makes sure): `BLENDER_Timetable_v*.md`, `BLENDER_AppBrief_v*.md` and `private-words.js`. They hold personal details.

---

## The look, in three rules

These keep the app calm and easy to read. Please keep them when changing anything.

1. **Layers, not flat.** Today and every lesson open with a hero in three layers: the lesson number, huge and faint, at the back; the lesson's 3D picture floating in the middle with no box; the words and the one button in front, on a soft black fade so no line of the 3D world shows behind them. Scrolling moves the number at half speed and the picture at three-quarter speed (not with Reduce motion). The Map has each week's number at the back in the same way.
2. **Orange means "tap this".** Orange (#F08A24) is only for the one filled button on a screen, the next lesson on the Map, today in the Calendar, focus rings, Pweza's glasses and the key highlights inside lesson pictures. Everything else is white and greys. The week colours are only in the Calendar and on the Map. Red is only for error messages and the Reset button.
3. **Three text sizes.** Huge (Plus Jakarta Sans 800, 34 to 40 px), exactly one per screen: the lesson title on Today (the timer's digits while it runs), the month in the Calendar, "Course map", "Toolbox", the percent on Me, the name on the certificate, and each other screen's title. Normal (15 px) for everything you read. Small (11 px) for labels in capitals, captions and the phone's tab labels. The only font is Plus Jakarta Sans.

**Calm.** Black page, cards #0D0D0D, raised things (buttons, fields, chips, keys) #161616, and no borders or lines. Text is white, with #8A8A8A for anything secondary. Phones have 20 px side margins; on a laptop the content is at most 880 px wide. Every Huge line has 32 px above it (above its small label, when it has one) and 12 px below. Buttons are 48 px tall with 14 px corners; the one orange button per screen is the only filled colour, the others are white words on #161616. Movement takes 320 to 450 ms and slows gently to a stop; the tab pill and the 3D camera still spring, with only a touch of overshoot. The opening (Pweza's preloader) is the one exception to this movement rule: it is slower on purpose, so you can see what it is.

**The opening, every time.** Every time the app opens, Pweza's opening plays: he drops in (0.9 s, with a small bounce), "BLENDER COURSE" fades in, he blinks and waves, and a thin orange line fills. It stays until his wave has finished, about 1.8 s, even when the app is ready sooner, then fades out over 0.5 s. If the app is ever not ready, it leaves by itself at 4 s. The moment the app goes to the background, the same screen goes up again, still, so the phone's app switcher shows Pweza and coming back never flashes the old screen. Coming back from another app plays it again for the same 1.8 s (Pweza is already there, so without the drop). A tap anywhere (or any key) skips it, and that tap never presses anything underneath. It never pauses or resets the lesson timer, which follows the real clock. With Reduce motion there is no drop and no wave: Pweza and the title show still for 1 s, then fade over 0.5 s. Try both on `check-pweza.html`.

**Depth, kept subtle.** The top bar and tab bar are frosted glass (black at 70%, blurred), so the screen slides softly underneath; Pweza's speech bubble and the two chips on Today are dark glass too, and a big moment blurs what is behind it. At most three glass surfaces show at once (the bars first); the rest show the same colour, solid. Glass turns solid with Reduce motion, Reduce transparency, or where the browser can't blur. The only glows: a soft orange one under the orange button, the same on the Map's next lesson, and a faint white halo behind the floating 3D model. Buttons and cards have a soft white highlight along their top edge. While you scroll, the 3D picture holds still for a moment, so scrolling stays smooth on a phone.

---

## Changing the lesson words

All the words live in the `content` folder. Open a file in **Notepad** (right-click, Open with, Notepad).

- `content/lessons.js`: every lesson. Each lesson has a `title`, `ideaInOneSentence` (the short version on Today), `oneIdea`, `youMake`, `proofToSend`, `buildsOn`, `next` and `stepByStepGuide`.
- `content/glossary.js`: the Blender words and what they mean.
- `content/shortcuts.js`: the keys for the cheat sheet. Write keys exactly as the lessons do.
- `content/standard.js`: the 9 points of the final project standard.
- `content/visuals.js`: the words that describe each lesson's picture (`caption`). Screen readers read them out; on Today and on a lesson the picture floats with no caption under it.

**The rules:**

- Change only the words **between the quote marks** `"like this"`. Keep every quote mark, comma and bracket where it is.
- Inside the words, write `\"` if you need a quote mark.
- **Never type a date** into a lesson. Dates are worked out from each learner's start date.
- Every Blender instruction comes from the course timetable or the Blender 5.2 manual (docs.blender.org/manual/en/5.2).

**Filling in a step-by-step guide after a lesson:** find the lesson in `content/lessons.js` and write between the quote marks of `stepByStepGuide`. To start a new paragraph, type `\n` (a backslash, then n). For example:

```
stepByStepGuide: "Open Blender and the file BLENDER_W1D1_v1.blend.\nPress 1 for the front view.\nTake a screenshot of the whole window."
```

**Then check your change:** double-click `check-content.html` to open it in your browser. It shows every lesson as a table and runs checks. Everything should be green. Do the same with `check-calendar.html` after any change to dates or days off.

If a lesson's **picture** needs to change (not just its caption), ask for help: the still images in `img/pictures` are made from the animations and need remaking.

---

## Publishing an update

After changing something:

1. Open **GitHub Desktop**. Your changes show on the left.
2. Bottom left, write a short summary, for example "Step-by-step guide for week 1, day 3".
3. Press **Commit to main**, then **Push origin** (top).
4. Wait about a minute. Everyone who opens the app sees "New version ready, tap to update".

If you add a brand-new file the app needs, also add its name to the list at the top of `sw.js`, so it works offline.
For a bigger change, also change the `VERSION` line at the top of `sw.js` (any new words will do): phones then fetch every file fresh.

---

## Publishing for the first time

1. Install **GitHub Desktop** (free, desktop.github.com) and sign in with your GitHub account.
2. **File, Add local repository**, choose this `BLENDER_CourseApp` folder. When it says this is not a repository, choose **create a repository** here, name `BLENDER_CourseApp`, then **Create repository**.
3. Check the list of files: the timetable, the brief and `private-words.js` must **not** be there.
4. Press **Publish repository**. **Untick** "Keep this code private", then **Publish repository**.
5. On github.com, open the repository, then **Settings**, then **Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
6. After a minute or two, the page shows the link: `https://YOUR-ACCOUNT.github.io/BLENDER_CourseApp/`.

---

## Passing the app on

Send the link. Each person who opens it gets their own fresh, empty course. Their progress stays on their device, and nobody sees anyone else's.

To move a course to a new phone: download a backup, send the file to yourself, open the app on the new phone and choose **Restore from backup**.

---

## Privacy

- Nothing is sent anywhere. No accounts, no tracking, no ads.
- Progress, notes and attached pictures stay in the browser on the learner's device.
- The backup file contains the learner's course and pictures. It is theirs to keep.
- The published code contains no personal details.

---

## Free tools used

- **Plus Jakarta Sans** font, SIL Open Font License (`fonts/PlusJakartaSans-LICENSE.txt`).
- **Lucide** icons for the tabs and menu, ISC licence (`vendor/lucide/LICENSE`).
- **three.js** 0.187.0, MIT licence (`vendor/three/LICENSE`).
- Blender is a trademark of the Blender Foundation. This app is made by Zedlab and is not affiliated with the Blender Foundation.

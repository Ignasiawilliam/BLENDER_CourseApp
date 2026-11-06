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
4. When you finish, press **I did it**. If a day doesn't work, press **Can't today, move it**: that lesson and every later one move along by one lesson day. Nothing is squeezed or skipped.
5. **Copy message for my tutor** copies a line like "Start today's lesson: Week 1, day 3, Select, move, rotate, scale." to paste into your chat.
6. Every Friday, download a **backup** (Settings, or the reminder on Today). Keep the file somewhere safe, such as your email.
7. **Put it on your home screen** (Settings explains how). After the first visit it works without internet.

When a new version is published, the app shows **"New version ready, tap to update"**. Tap it to get the new version.

---

## What is in this folder

| Folder or file | What it is |
|---|---|
| `index.html` | The app itself. |
| `content/` | **The lesson words.** These are the files to edit when a lesson changes. |
| `app/` | How the app works: screens, dates, saving, backup, pictures, look. |
| `img/pictures/` | A still image of each lesson's picture, and a small one for the calendar. |
| `icons/` | The octopus icon for phone home screens. |
| `fonts/` | The Inter font (free), so the app works offline. |
| `vendor/three/` | three.js (free), which draws the 3D pictures. |
| `sw.js`, `manifest.webmanifest` | Let the app work offline and go on a home screen. |
| `check-content.html`, `check-calendar.html`, `check-visuals.html` | **Check pages**: they test the lesson words, the dates and the pictures. |
| `Zedlab_logo.svg`, `Zedlab_octopus_logo.svg` | The Zedlab logos, unchanged. The app colours them itself. |

These stay on this computer and are **never published** (the `.gitignore` file makes sure): `BLENDER_Timetable_v*.md`, `BLENDER_AppBrief_v*.md` and `private-words.js`. They hold personal details.

---

## Changing the lesson words

All the words live in the `content` folder. Open a file in **Notepad** (right-click, Open with, Notepad).

- `content/lessons.js`: every lesson. Each lesson has a `title`, `ideaInOneSentence` (the short version on Today), `oneIdea`, `youMake`, `proofToSend`, `buildsOn`, `next` and `stepByStepGuide`.
- `content/glossary.js`: the Blender words and what they mean.
- `content/shortcuts.js`: the keys for the cheat sheet. Write keys exactly as the lessons do.
- `content/standard.js`: the 9 points of the final project standard.
- `content/visuals.js`: the caption under each lesson's picture (`caption`).

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

- **Inter** font, SIL Open Font License (`fonts/Inter-LICENSE.txt`).
- **three.js** 0.187.0, MIT licence (`vendor/three/LICENSE`).
- Blender is a trademark of the Blender Foundation. This app is made by Zedlab and is not affiliated with the Blender Foundation.

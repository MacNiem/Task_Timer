# Task Timer

**Open the app: https://macniem.github.io/Task_Timer/**

A stopwatch for tasks. Create a list, add tasks and time your work on each one with a single tap.
Save a closed list as a PDF. Built for phones and tablets; it also works on desktop and offline.

## Install on your phone

- **Android (Chrome):** open the app link → ⋮ menu → “Install app”.
- **iPhone / iPad (Safari):** open the app link → Share → “Add to Home Screen”.

The installed app gets its own icon, works offline, and the browser won't clear its data.

### Running on a computer

Open `index.html` in a browser, or double-click `Create-shortcut.cmd`. It creates a **Task Timer**
shortcut with a stopwatch icon (on the desktop and in this folder) that opens the app in its own
window without an address bar — in Google Chrome, or in Brave or Edge if Chrome isn't installed.
After moving the folder, run `Create-shortcut.cmd` again.

## Features

- Named task lists
- Tap a task to start or pause its timer; only one timer runs at a time
- A bar at the bottom with a large clock for the running task, plus Pause and Finish buttons
- The circle next to a task finishes or reopens it; press and hold a task to rename or delete it
- A list can be closed only when all its tasks are finished
- Save a closed list to PDF (task times and total) via the browser's print dialog — “Save as PDF”
- Dark mode follows your system setting
- Phone: separate screens for lists and tasks; tablet and desktop: side by side

Your data stays in your browser (`localStorage`) on each device. Nothing is sent to a server.

## Copyright

© 2026 MacNiem. All rights reserved. Apart from the rights GitHub's Terms of Service give
to view and fork this repository on GitHub, you may not copy, modify, distribute or use this code
without the author's permission.

The Barlow and Barlow Condensed fonts are licensed under the SIL Open Font License (`fonts/OFL.txt`).


### Files

- `index.html` — page skeleton
- `css/app.css` — styles, dark mode, print
- `js/store.js` — state and task logic (no DOM)
- `js/app.js` — views, events, sheets, clock dock, PDF
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA (`icons/icon.ico` — Windows shortcut icon)
- `Create-shortcut.cmd`, `tools/create-shortcut.ps1` — Task Timer desktop shortcut
- `fonts/` — Barlow and Barlow Condensed fonts

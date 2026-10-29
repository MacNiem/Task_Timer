# Changelog

Version numbers follow MAJOR.MINOR.PATCH: a big change, new features, fixes.
The version is set in `js/version.js` and shown in the app under ⋯ on the Lists screen.

## 2.4.4 — 2026-10-29

- Keep the first-list name field at full input height on desktop and mobile
- Use a single-column grid for the empty-state form to avoid conflicting flex sizes

## 2.4.3 — 2026-10-28

- Bypass stale HTTP-cached version scripts during service worker updates
- Recover older installations with a fresh version import URL
- Check for updates at startup, when returning to the app and after reconnecting
- Restrict old-cache cleanup to Task Timer caches
- Restyle My lists with a subtle matte grain canvas and opaque rounded list cards
- Use clearer system typography and a prominent yellow New list button
- Use the same matte background on the task screen, preserving its layout and controls
- Match the Add task button to the yellow New list button
- Use a separate cache revision for this reissued release

## 2.4.2 — 2026-10-28

- Keep the timer bar within the visible mobile viewport, including keyboard and browser resizing
- Show paused timers with Resume inside their own list; hide them on My lists
- Close an unsubmitted New list form on outside click, focus leaving the form, or navigation

## 2.4.1 — 2026-10-28

- English interface, accessibility labels, installation description and PDF reports
- Timer bar appears only while a task is running
- Vertical menu buttons throughout the app; main menu aligned with the Task Timer brand
- List names and totals use the same font size and align at the top
- Undo notifications expire after 10 seconds; a new deletion restarts the countdown

## 2.4.0 — 2026-10-27

- Polish interface and PDF reports
- Refreshed task cards, a labeled total and clearer progress
- Separate start/pause and completion controls, visible task menus
- Persistent paused timer with Resume, including after reloading
- Undo the last deleted task or list; reopen archived lists
- Protect timer values when the system clock moves backwards
- Validate saved data before loading

## 2.3.0 — 2026-10-24

- Theme switch: Auto (follows the system), Light or Dark — ⋯ → Theme
- “New version available — Reload” bar when an update has been downloaded
- Version number shown in the ⋯ menu; the offline cache is named after it
- Fixed: the list name field on the empty screen was squashed on wide screens
- Shorter placeholder names for new lists and tasks

## 2.2.0 — 2026-10-20

- Backup: export all lists to a file and import them again (⋯ on the Lists screen)

## 2.1.0 — 2026-10-20

- The app is now in English (PDF report dates in the en-GB format)
- Windows desktop shortcut with a stopwatch icon (`Create-shortcut.cmd`)

## 2.0.0 — 2026-10-20

- New “workshop stopwatch” design for phones and tablets
- Dock at the bottom with a large clock for the running task
- Only one timer runs at a time across the whole app
- Tap a task to start or pause it; press and hold for its menu
- Dark mode, installable app (PWA), works offline

## 1.0.0 — 2026-10-18

- Task lists, start / pause timers, finishing tasks
- A list can be closed only when all its tasks are finished
- Closed lists can be saved as PDF

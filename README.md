# Task Timer

**Open the app: https://macniem.github.io/Task_Timer/**

A stopwatch for tasks. Create a list, add tasks and time your work on each one with a single tap.
Save a closed list as a PDF. Built for phones and tablets; it also works on desktop and offline.

## Install on your phone

- **Android (Chrome):** open the app link → ⋮ menu → “Install app”.
- **iPhone / iPad (Safari):** open the app link → Share → “Add to Home Screen”.

The installed app gets its own icon, works offline, and the browser won't clear its data.

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

## For the author

### Running on a computer

Open `index.html` in a browser, or double-click `Create-shortcut.cmd`. It creates a **Task Timer**
shortcut with a stopwatch icon (on the desktop and in this folder) that opens the app in its own
window without an address bar — in Google Chrome, or in Brave or Edge if Chrome isn't installed.
After moving the folder, run `Create-shortcut.cmd` again.

### GitHub Pages

Settings → Pages → “Deploy from a branch”, branch `main`, folder `/ (root)`.

### Releasing a new version

After changing the app files, bump the version in `sw.js` (`const CACHE = 'stoper-v3'` and so on)
so installed copies download the new files.

### Tests

The app logic (`js/store.js`) is tested in `tests/` (Node.js 18+):

```bash
npm test
```

### Files

- `index.html` — page skeleton
- `css/app.css` — styles, dark mode, print
- `js/store.js` — state and task logic (no DOM)
- `js/app.js` — views, events, sheets, clock dock, PDF
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA (`icons/icon.ico` — Windows shortcut icon)
- `Create-shortcut.cmd`, `tools/create-shortcut.ps1` — Task Timer desktop shortcut
- `fonts/` — Barlow and Barlow Condensed fonts

---

## Po polsku

**Otwórz aplikację: https://macniem.github.io/Task_Timer/**

Stoper do zadań. Tworzysz listę, dodajesz zadania i jednym stuknięciem mierzysz czas pracy
nad każdym z nich. Zamkniętą listę zapisujesz do PDF. Aplikacja jest zrobiona z myślą
o telefonie i tablecie, działa też na komputerze i bez internetu. Interfejs jest po angielsku.

### Zainstaluj na telefonie

- **Android (Chrome):** otwórz adres aplikacji → menu ⋮ → „Zainstaluj aplikację”.
- **iPhone / iPad (Safari):** otwórz adres aplikacji → przycisk Udostępnij → „Do ekranu początkowego”.

### Funkcje

- Listy zadań z własnymi nazwami
- Stuknięcie w zadanie uruchamia lub wstrzymuje licznik; naraz biegnie tylko jeden licznik
- Pasek na dole ekranu z dużym zegarem biegnącego zadania oraz przyciskami Pause i Finish
- Kółko przy zadaniu kończy je lub wznawia; przytrzymanie zadania otwiera menu (zmiana nazwy, usuwanie)
- Listę można zamknąć dopiero po zakończeniu wszystkich zadań
- Zamkniętą listę można zapisać do PDF (czasy zadań i suma) przez okno drukowania
- Tryb ciemny według ustawień systemu
- Telefon: osobne ekrany list i zadań; tablet i komputer: listy i zadania obok siebie

Dane zapisują się tylko w Twojej przeglądarce (`localStorage`), osobno na każdym urządzeniu.
Nic nie jest wysyłane na serwer.

### Prawa autorskie

© 2026 MacNiem. Wszelkie prawa zastrzeżone. Poza prawami, które regulamin GitHuba daje
do oglądania i forkowania tego repozytorium na GitHubie, nie wolno kopiować, zmieniać,
rozpowszechniać ani używać tego kodu bez zgody autora.

Czcionki Barlow i Barlow Condensed są na licencji SIL Open Font License (`fonts/OFL.txt`).

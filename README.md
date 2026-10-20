# Task Timer

**Otwórz aplikację: https://macniem.github.io/Task_Timer/**

Stoper do zadań. Tworzysz listę, dodajesz zadania i jednym stuknięciem mierzysz czas pracy
nad każdym z nich. Zamkniętą listę zapisujesz do PDF. Aplikacja jest zrobiona z myślą
o telefonie i tablecie, działa też na komputerze i bez internetu.

## Zainstaluj na telefonie

- **Android (Chrome):** otwórz adres aplikacji → menu ⋮ → „Zainstaluj aplikację”.
- **iPhone / iPad (Safari):** otwórz adres aplikacji → przycisk Udostępnij → „Do ekranu początkowego”.

Zainstalowana aplikacja ma własną ikonę, działa bez internetu, a przeglądarka nie kasuje jej danych.

## Funkcje

- Listy zadań z własnymi nazwami
- Stuknięcie w zadanie uruchamia lub wstrzymuje licznik; naraz biegnie tylko jeden licznik
- Pasek na dole ekranu z dużym zegarem biegnącego zadania oraz przyciskami Wstrzymaj i Zakończ
- Kółko przy zadaniu kończy je lub wznawia; przytrzymanie zadania otwiera menu (zmiana nazwy, usuwanie)
- Listę można zamknąć dopiero po zakończeniu wszystkich zadań
- Zamkniętą listę można zapisać do PDF (czasy zadań i suma) przez okno drukowania — „Zapisz jako PDF”
- Tryb ciemny według ustawień systemu
- Telefon: osobne ekrany list i zadań; tablet i komputer: listy i zadania obok siebie

Dane zapisują się tylko w Twojej przeglądarce (`localStorage`), osobno na każdym urządzeniu.
Nic nie jest wysyłane na serwer.

## Prawa autorskie

© 2026 MacNiem. Wszelkie prawa zastrzeżone. Kod jest publiczny wyłącznie do wglądu —
bez zgody autora nie wolno go kopiować, zmieniać ani rozpowszechniać.

Czcionki Barlow i Barlow Condensed są na licencji SIL Open Font License (`fonts/OFL.txt`).

## Dla autora

### Uruchomienie na komputerze

Otwórz `index.html` w przeglądarce albo kliknij dwa razy `Utworz-skrot.cmd`. Powstanie skrót
**Task Timer** z ikoną stopera (na pulpicie i w tym folderze), który otwiera aplikację w osobnym
oknie, bez paska adresu — w Google Chrome, a gdy go nie ma, w Brave albo Edge.
Po przeniesieniu folderu uruchom `Utworz-skrot.cmd` ponownie.

### GitHub Pages

Settings → Pages → „Deploy from a branch”, Branch `main`, folder `/ (root)`.

### Aktualizacja wersji

Po zmianie plików aplikacji podnieś wersję w `sw.js` (`const CACHE = 'stoper-v2'` itd.),
żeby zainstalowane kopie pobrały nowe pliki.

### Testy

Logika aplikacji (`js/store.js`) ma testy w `tests/` (Node.js 18+):

```bash
npm test
```

### Pliki

- `index.html` — szkielet strony
- `css/app.css` — wygląd, tryb ciemny, wydruk
- `js/store.js` — stan i logika zadań (bez DOM)
- `js/app.js` — widoki, zdarzenia, arkusze, dok z zegarem, PDF
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA (`icons/icon.ico` — ikona skrótu Windows)
- `Utworz-skrot.cmd`, `narzedzia/utworz-skrot.ps1` — skrót Task Timer na pulpicie
- `fonts/` — czcionki Barlow i Barlow Condensed

---

## English

**Open the app: https://macniem.github.io/Task_Timer/**

A stopwatch for tasks. Create a list, add tasks and time your work on each one with a single tap.
Save a closed list as a PDF. Built for phones and tablets; it also works on desktop and offline.
The interface is currently in Polish.

### Install on your phone

- **Android (Chrome):** open the app link → ⋮ menu → “Install app”.
- **iPhone / iPad (Safari):** open the app link → Share → “Add to Home Screen”.

### Features

- Named task lists
- Tap a task to start or pause its timer; only one timer runs at a time
- A bar at the bottom with a large clock for the running task, plus Pause and Finish buttons
- The circle next to a task finishes or reopens it; press and hold a task to rename or delete it
- A list can be closed only when all its tasks are finished
- Save a closed list to PDF (task times and total) via the browser's print dialog
- Dark mode follows your system setting
- Phone: separate screens for lists and tasks; tablet and desktop: side by side

Your data stays in your browser (`localStorage`) on each device. Nothing is sent to a server.

### Copyright

© 2026 MacNiem. All rights reserved. The source code is public for viewing only —
you may not copy, modify or distribute it without the author's permission.

The Barlow and Barlow Condensed fonts are licensed under the SIL Open Font License (`fonts/OFL.txt`).

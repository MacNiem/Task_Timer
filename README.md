# Task Timer

Aplikacja do mierzenia czasu pracy nad zadaniami, zrobiona głównie z myślą o telefonie i tablecie.
Działa w przeglądarce i można ją zainstalować na ekranie głównym.

## Funkcje

- Listy zadań z własnymi nazwami
- Stuknięcie w zadanie uruchamia lub wstrzymuje licznik; naraz biegnie tylko jeden licznik w całej aplikacji
- Pasek na dole ekranu z dużym zegarem biegnącego zadania oraz przyciskami Wstrzymaj i Zakończ
- Kółko przy zadaniu kończy je lub wznawia; przytrzymanie zadania otwiera menu (zmiana nazwy, usuwanie)
- Listę można zamknąć dopiero po zakończeniu wszystkich zadań
- Zamkniętą listę można zapisać do PDF (z czasami zadań i sumą) przez okno drukowania przeglądarki — opcja „Zapisz jako PDF”
- Tryb ciemny według ustawień systemu
- Telefon: osobne ekrany list i zadań; tablet i komputer: listy i zadania obok siebie
- Działa bez internetu po pierwszym otwarciu (PWA)

Dane zapisywane są lokalnie w przeglądarce (`localStorage`), osobno na każdym urządzeniu.

## Uruchomienie

- **Na komputerze:** otwórz `index.html` w przeglądarce albo kliknij dwa razy `Utworz-skrot.cmd`.
  Powstanie skrót **Task Timer** z ikoną stopera (na pulpicie i w tym folderze), który otwiera aplikację
  w osobnym oknie, bez paska adresu — w Google Chrome, a gdy go nie ma, w Brave albo Edge.
  Po przeniesieniu folderu uruchom `Utworz-skrot.cmd` ponownie.
- **Na telefonie i tablecie:** wystaw aplikację przez GitHub Pages (niżej) i otwórz jej adres.

### GitHub Pages

1. W repozytorium na GitHubie: **Settings → Pages**.
2. **Source:** „Deploy from a branch”, **Branch:** `main`, folder `/ (root)`, **Save**.
3. Po chwili aplikacja będzie pod adresem `https://<użytkownik>.github.io/Task_Timer/`.

### Instalacja na ekranie głównym

- **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.
- **iPhone / iPad (Safari):** przycisk Udostępnij → „Do ekranu początkowego”.

Zainstalowana aplikacja działa bez internetu, a przeglądarka nie kasuje jej danych.

### Aktualizacja wersji

Po zmianie plików aplikacji podnieś wersję w `sw.js` (`const CACHE = 'stoper-v2'` itd.),
żeby zainstalowane kopie pobrały nowe pliki.

## Testy

Logika aplikacji (`js/store.js`) ma testy w `tests/` (wymaga Node.js 18+):

```bash
npm test
```

## Pliki

- `index.html` — szkielet strony
- `css/app.css` — wygląd, tryb ciemny, wydruk
- `js/store.js` — stan i logika zadań (bez DOM)
- `js/app.js` — widoki, zdarzenia, arkusze, dok z zegarem, PDF
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA (`icons/icon.ico` — ikona skrótu Windows)
- `Utworz-skrot.cmd`, `narzedzia/utworz-skrot.ps1` — skrót Task Timer na pulpicie
- `fonts/` — czcionki Barlow i Barlow Condensed (licencja SIL OFL, `fonts/OFL.txt`)

# Stoper warsztatowy — nowy wygląd i PWA

Data: 2026-10-20
Status: do akceptacji

## Cel

Task Timer ma być wygodny głównie na **telefonie i tablecie**. Licznik
biegnącego zadania ma być zawsze widoczny i w zasięgu kciuka. Aplikację
można zainstalować na ekranie głównym i działa bez internetu.

### Kryteria sukcesu

1. Na telefonie (375 × 812) biegnący licznik i przyciski Pauza / Zakończ są
   widoczne bez przewijania, na każdym ekranie listy.
2. Każdy element dotykowy ma co najmniej 48 × 48 px.
3. Tablet (768 px i szerzej) pokazuje listy i zadania obok siebie, bez
   łamania krótkich nazw zadań.
4. Tryb ciemny włącza się automatycznie według ustawień systemu.
5. Aplikacja instaluje się z GitHub Pages (Android: „Zainstaluj”,
   iPhone: „Do ekranu początkowego”) i otwiera się bez internetu.
6. Wszystkie obecne wymagania działają dalej: listy z nazwami, zadania,
   start / pauza, zakończenie zadania, blokada zamknięcia listy przed
   zakończeniem wszystkich zadań, zapis zamkniętej listy do PDF.
7. Dane zapisane w obecnej wersji (klucz `taskTimer.v1`) wczytują się
   w nowej wersji bez utraty.

## Zakres

**W zakresie**

- nowy układ telefon / tablet / komputer,
- pasek z zegarem na dole („dok”),
- duże elementy dotykowe, stuknięcie w wiersz = start / pauza,
- własne okna (arkusze) zamiast `prompt()` / `confirm()`,
- tryb ciemny,
- PWA: manifest, ikony, service worker, trwały zapis danych,
- podział kodu na pliki i testy logiki.

**Poza zakresem** (na później)

- ręczna poprawka czasu zadania,
- synchronizacja danych między urządzeniami (wymaga serwera),
- eksport / import kopii zapasowej,
- powiadomienia, wibracje, blokada wygaszania ekranu,
- czyszczenie historii repozytorium na GitHubie.

## Decyzje

| # | Decyzja | Dlaczego |
|---|---|---|
| D1 | Zostaje czysty HTML + CSS + JS, bez frameworka i bez kroku budowania. | Aplikacja jest mała, a brak budowania ułatwia hosting na GitHub Pages. |
| D2 | Skrypty klasyczne (`<script src>`), nie moduły ES. | Moduły ES nie działają przy otwarciu pliku dwuklikiem (`file://`). |
| D3 | **Naraz biegnie tylko jeden licznik w całej aplikacji** (dziś: jeden na listę). Start zadania wstrzymuje każde inne biegnące zadanie, także w innej liście. | Dok pokazuje jeden zegar. Dwa liczniki naraz to zwykle pomyłka. |
| D4 | Czcionki Barlow i Barlow Condensed (licencja OFL) w repozytorium, w folderze `fonts/` (woff2). | Działają bez internetu i w PWA. |
| D5 | PDF zostaje przez okno drukowania (`window.print()` + `@media print`). | Działa bez bibliotek. W PWA na iPhonie trzeba to sprawdzić na urządzeniu (patrz Ryzyka). |
| D6 | Nawigacja na telefonie przez adres w `#` (`#/` = listy, `#/lista/<id>` = lista). | Systemowy przycisk / gest „wstecz” wraca do listy list. |

## Układ

### Telefon (szerokość < 768 px)

Dwa ekrany.

**Ekran „Listy”**
- nagłówek „Listy”,
- sekcja aktywnych list: nazwa, „X z Y gotowe”, łączny czas,
- sekcja zamkniętych list (zwinięta, z licznikiem),
- przycisk „Nowa lista” na dole, nad dokiem.

**Ekran „Lista”**
```
┌──────────────────────┐
│ ‹ Listy          ⋯   │
│ Remont łazienki      │
│ 1 z 3 gotowe 1:42:05 │
│ ▬▬▬▬▬░░░░░░░░░       │  pasek postępu
├──────────────────────┤
│ ✓ Skucie płytek 0:44 │
│ ▶ Hydraulika    0:57 │  biegnie: bursztynowe tło
│ ○ Fugowanie     0:00 │
│ + Dodaj zadanie      │
├──────────────────────┤
│ ● Hydraulika         │  dok
│   0:57:12   (⏸) (✓)  │
└──────────────────────┘
```

### Tablet i komputer (≥ 768 px)

Dwie kolumny: listy po lewej (szer. 260 px), wybrana lista po prawej.
Dok na dole prawej kolumny. Na komputerze treść ma maksymalnie 1100 px
szerokości i jest wyśrodkowana.

## Elementy

### Wiersz zadania
- Wysokość min. 56 px, cały wiersz klikalny.
- **Stuknięcie w wiersz** = start albo pauza.
- **Kółko po lewej** (48 × 48 px pola dotyku) = zakończ zadanie; przy
  zakończonym zadaniu = wznów (cofnij zakończenie).
- **Długie przytrzymanie** (500 ms) albo prawy klik = arkusz zadania:
  „Zmień nazwę”, „Usuń zadanie”. Przy pierwszym dodanym zadaniu pod
  listą pojawia się jednorazowa podpowiedź „Przytrzymaj zadanie, aby
  zmienić nazwę lub usunąć” (znika po pierwszym przytrzymaniu albo
  zamknięciu; zapamiętana w `localStorage`).
- Stany: nie zaczęte (puste kółko), biegnie (bursztynowe tło wiersza
  i kółko), wstrzymane (puste kółko, czas > 0), zakończone (zielone kółko
  z ✓, przekreślona nazwa).
- Na zamkniętej liście wiersze nie reagują na dotyk.

### Dodawanie zadania
- Wiersz „+ Dodaj zadanie” zmienia się w pole tekstowe. Enter dodaje
  zadanie i zostawia pole otwarte na następne. Esc lub puste pole i utrata
  fokusu zamyka pole.

### Dok
- Widoczny, gdy jakieś zadanie biegnie. Pokazuje nazwę zadania, nazwę
  listy (gdy to inna lista niż oglądana), duży zegar i dwa okrągłe
  przyciski 56 × 56 px: Pauza, Zakończ.
- Stuknięcie w nazwę w doku otwiera listę tego zadania.
- Gdy nic nie biegnie, doku nie ma.
- Uwzględnia `env(safe-area-inset-bottom)` (pasek gestów iPhone'a).

### Menu listy „⋯” (arkusz od dołu)
- Lista otwarta: „Zmień nazwę”, „Zamknij listę”, „Usuń listę”.
- „Zamknij listę” jest zawsze klikalne. Gdy są niezakończone zadania,
  arkusz pokazuje komunikat „Zakończ najpierw wszystkie zadania
  (zostało: N)” zamiast zamykać.
- Lista zamknięta: „Zapisz do PDF”, „Usuń listę”.
- Gdy wszystkie zadania są zakończone, pod listą pojawia się też duży
  przycisk „Zamknij listę”, a po zamknięciu „Zapisz do PDF”.

### Arkusze (zamiast `prompt` / `confirm`)
- Jeden komponent arkusza od dołu (telefon) / okna na środku (tablet).
- Rodzaje: menu (lista akcji), pytanie (tekst + „Anuluj” / akcja),
  pole tekstowe (zmiana nazwy).
- Akcje usuwające w kolorze czerwonym. Esc i stuknięcie w tło zamykają.
- Fokus wchodzi do arkusza i wraca na element, który go otworzył.

### Puste stany
- Brak list: „Zacznij pierwszą listę” + pole nazwy i przycisk „Utwórz listę”.
- Pusta lista: „Dodaj pierwsze zadanie” z otwartym polem.

## Wygląd

### Kolory

| Token | Jasny | Ciemny | Użycie |
|---|---|---|---|
| `--bg` | `#EEF1F4` | `#161C24` | tło |
| `--surface` | `#FFFFFF` | `#1F2731` | wiersze, kolumna list |
| `--line` | `#DCE1E7` | `#2E3946` | linie między wierszami |
| `--ink` | `#1B2430` | `#E8EDF2` | tekst |
| `--ink-2` | `#5B6676` | `#93A0AF` | tekst pomocniczy |
| `--run` | `#F2A900` | `#F2A900` | **tylko** biegnący czas |
| `--run-soft` | `#FFF6DC` | `#3A3018` | tło biegnącego wiersza |
| `--done` | `#2E7D5B` | `#3FA77A` | zakończone |
| `--danger` | `#C2412D` | `#E0614B` | usuwanie |
| `--dock` | `#1B2430` | `#263040` | tło doku |

Bursztyn nie pojawia się nigdzie poza biegnącym czasem, żeby zawsze
znaczył „czas leci”.

### Pismo
- Zegary i czasy: Barlow Condensed 500/600, cyfry `tabular-nums`.
- Reszta: Barlow 400/500/600.
- Skala: 13 (pomocniczy), 15 (wiersz), 17 (nagłówek kolumny),
  24 (nazwa listy na telefonie), 40 (zegar w doku).
- Bez napisów wielkimi literami.

### Zasady
- Jeden mocny element: dok z zegarem. Reszta spokojna, bez cieni,
  wiersze rozdzielone linią zamiast osobnych kart.
- Ruch tylko w odpowiedzi na akcję (wysunięcie arkusza, pojawienie się
  doku), max 200 ms, wyłączony przy `prefers-reduced-motion`.
- Widoczny fokus klawiatury (obrys 2 px w `--ink`).
- Kontrast tekstu min. 4.5 : 1 w obu trybach.

## PWA

- `manifest.webmanifest`: `name` „Task Timer”, `short_name` „Stoper”,
  `display: standalone`, `start_url: "./"`, `theme_color` i
  `background_color` z palety, ikony 192, 512 i 512 maskable.
- `apple-touch-icon` 180 px i `<meta name="theme-color">` dla obu trybów.
- `sw.js`: przy instalacji zapisuje w pamięci podręcznej wszystkie pliki
  aplikacji; odpowiada z pamięci, a gdy pliku brak — z sieci. Nazwa
  pamięci zawiera wersję (`stoper-v1`); nowa wersja usuwa starą pamięć.
- Rejestracja service workera tylko przez `http(s)`, nie przy `file://`.
- Po starcie: `navigator.storage.persist()`, żeby przeglądarka nie
  kasowała danych.
- Ikona: tarcza stopera w bursztynie na `--ink`, przygotowana jako SVG
  i wyeksportowana do PNG.

## Struktura plików

```
index.html              szkielet strony, linki do plików
css/app.css             wygląd, tryb ciemny, druk
js/store.js             stan, zapis, akcje, czasy (bez dostępu do DOM)
js/app.js               widoki, zdarzenia, arkusze, dok, PDF
sw.js                   service worker
manifest.webmanifest
icons/                  icon.svg, icon-192.png, icon-512.png,
                        icon-maskable-512.png, apple-touch-icon.png
fonts/                  barlow-*.woff2, barlow-condensed-*.woff2, OFL.txt
tests/store.test.js     testy logiki (node --test)
```

`js/store.js` działa w przeglądarce (obiekt globalny `TaskStore`) i w Node
(`module.exports`), żeby testy szły bez przeglądarki.

## Dane

- Ten sam klucz `taskTimer.v1` i ten sam kształt danych:
  `{ lists: [{ id, name, createdAt, closedAt, tasks: [{ id, name,
  elapsedMs, runningSince, done }] }], selectedId }`.
- Przy wczytaniu, jeśli biegnie więcej niż jedno zadanie (dane ze starej
  wersji), zostaje to, które wystartowało najpóźniej; pozostałe dostają
  doliczony czas do chwili startu tego najnowszego i są wstrzymane.
- Zapis po każdej akcji oraz przy `visibilitychange` → `hidden`
  (pewniejsze na telefonie niż `beforeunload`).
- Brak dostępu do pamięci: aplikacja działa, ale pokazuje pasek
  „Dane nie zapisują się w tej przeglądarce”.

## Testy

- **Logika** (`node --test`): start / pauza / jeden licznik naraz,
  zakończenie i wznowienie, blokada zamknięcia, zamknięcie listy,
  usuwanie, migracja kilku biegnących zadań, formatowanie czasu.
- **Przeglądarka** (panel testowy): 375 × 812 i 768 × 1024, jasny
  i ciemny tryb; sprawdzenie, że dok jest widoczny bez przewijania;
  pomiar wszystkich elementów dotykowych ≥ 48 px; podgląd wydruku.
- **PWA**: wpis manifestu i service worker bez błędów w konsoli;
  ponowne otwarcie bez sieci.
- **Na urządzeniu** (Ty): instalacja na telefonie, PDF z zainstalowanej
  aplikacji.

## Ryzyka

- **Druk w PWA na iPhonie**: w trybie „z ekranu początkowego” okno
  drukowania może nie działać. Jeśli nie zadziała: przycisk „Zapisz do PDF”
  otworzy raport w Safari, gdzie druk działa.
- **Service worker i stare pliki**: po aktualizacji telefon może pokazać
  starą wersję do następnego otwarcia. Akceptowalne; przy nowej wersji
  zmieniamy nazwę pamięci podręcznej.
- **Długie przytrzymanie** jest mało widoczne. Akcje listy są w menu „⋯”.
  Pod przytrzymaniem są tylko akcje zadania (zmiana nazwy, usuwanie),
  a jednorazowa podpowiedź mówi o nich przy pierwszym zadaniu.

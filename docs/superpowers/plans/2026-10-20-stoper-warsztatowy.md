# Stoper warsztatowy — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Przebudować Task Timer na wygląd „Stoper warsztatowy” (telefon / tablet, dok z zegarem, duże elementy dotykowe, tryb ciemny) i zrobić z niego PWA.

**Architecture:** Czysty HTML + CSS + JS bez budowania. Logika i stan w `js/store.js` (czyste funkcje, bez DOM, testowane w Node). Widoki, zdarzenia, arkusze i dok w `js/app.js`, który po każdej akcji zapisuje stan i odświeża widok. Service worker z pamięcią podręczną plików aplikacji.

**Tech Stack:** HTML, CSS (custom properties, `prefers-color-scheme`), klasyczne skrypty JS, Node `node --test` do testów logiki, Service Worker, Web App Manifest.

**Spec:** `docs/superpowers/specs/2026-10-20-stoper-warsztatowy-design.md`

## Global Constraints

- Bez frameworków, bez kroku budowania, bez zależności npm w aplikacji.
- Skrypty klasyczne (`<script src>`), nie moduły ES — aplikacja musi działać po otwarciu `index.html` dwuklikiem (`file://`).
- Naraz biegnie tylko jeden licznik w całej aplikacji (D3).
- Klucz danych `taskTimer.v1`, kształt danych bez zmian: `{ lists: [{ id, name, createdAt, closedAt, tasks: [{ id, name, elapsedMs, runningSince, done }] }], selectedId }`.
- Elementy dotykowe min. 48 × 48 px; wiersz zadania min. 56 px; przyciski doku 56 × 56 px.
- Kolory tylko z tabeli tokenów w specu; `--run` (`#F2A900`) wyłącznie dla biegnącego czasu.
- Pismo: Barlow Condensed (czasy, `tabular-nums`), Barlow (reszta); bez napisów wielkimi literami.
- Ruch max 200 ms, wyłączony przy `prefers-reduced-motion: reduce`.
- Teksty interfejsu po polsku, zdania zwykłą wielkością liter, przyciski zaczynają się od czasownika.
- Granica telefon / tablet: 768 px.

## Review Focus

1. Bardzo długa nazwa listy lub zadania (np. 200 znaków bez spacji) na 375 px — tekst się łamie lub skraca, nic nie wychodzi poza ekran, czas w wierszu zostaje widoczny. Test: Task 3, krok 6.
2. Aplikacja otwarta ponownie po kilku godzinach z biegnącym zadaniem — czas liczy się od `runningSince`, dok jest widoczny od razu. Test: Task 1 (`elapsed`), Task 4 krok 4.
3. Usunięcie biegnącego zadania albo listy z biegnącym zadaniem — dok znika, brak błędów w konsoli. Test: Task 1 (`deleteTask`/`deleteList` → `running()` = null), Task 5 krok 7.
4. Brak dostępu do `localStorage` (tryb prywatny, `file://` w niektórych przeglądarkach) — aplikacja działa i pokazuje pasek ostrzeżenia. Test: Task 7 krok 5.
5. Adres `#/lista/<id>` do nieistniejącej listy (usunięta, stara zakładka) — pokazuje ekran list zamiast pustej strony. Test: Task 2 krok 6.

---

### Task 1: Logika i stan (`js/store.js`)

**Files:**
- Create: `js/store.js`
- Create: `tests/store.test.js`
- Create: `package.json` (tylko `{"name":"task-timer","private":true,"scripts":{"test":"node --test tests/"}}`)

**Interfaces:**
- Produces (globalnie `window.TaskStore`, w Node `module.exports`), wszystkie funkcje mutują `state` w miejscu; `now` to liczba ms:
  - `load(raw: string|null) -> State` — parsuje; błędny JSON lub `null` → `{ lists: [], selectedId: null }`; migracja wielu biegnących zadań (spec, „Dane”).
  - `serialize(state) -> string`
  - `uid() -> string`
  - `findList(state, listId) -> List|undefined`
  - `createList(state, name, now) -> List` (ustawia `selectedId`)
  - `renameList(state, listId, name) -> void` (pusta nazwa po `trim` = bez zmian)
  - `deleteList(state, listId) -> void` (czyści `selectedId`, jeśli wskazywał tę listę)
  - `addTask(state, listId, name) -> Task|null` (null dla zamkniętej listy lub pustej nazwy)
  - `renameTask(state, listId, taskId, name) -> void`
  - `deleteTask(state, listId, taskId) -> void`
  - `startTask(state, listId, taskId, now) -> void` — wstrzymuje każde inne biegnące zadanie we wszystkich listach; nic nie robi dla zamkniętej listy i zakończonego zadania.
  - `pauseTask(state, listId, taskId, now) -> void`
  - `toggleTask(state, listId, taskId, now) -> void` — biegnie → pauza, inaczej → start.
  - `finishTask(state, listId, taskId, now) -> void` (wstrzymuje i ustawia `done`)
  - `reopenTask(state, listId, taskId) -> void` (tylko na otwartej liście)
  - `remaining(list) -> number` (liczba niezakończonych)
  - `canClose(list) -> boolean` (≥ 1 zadanie i wszystkie zakończone)
  - `closeList(state, listId, now) -> boolean`
  - `running(state) -> { list, task } | null`
  - `elapsed(task, now) -> number`, `listTotal(list, now) -> number`
  - `fmt(ms) -> string` (`H:MM:SS`, np. `0:57:12`, `12:00:05`)

- [ ] **Step 1: Napisz testy w `tests/store.test.js`** (`node:test` + `node:assert/strict`, `const S = require('../js/store.js')`):
  - `fmt`: `fmt(0) === '0:00:00'`, `fmt(3432000) === '0:57:12'`, `fmt(43205000) === '12:00:05'`, `fmt(999) === '0:00:00'`.
  - `load`: `load(null)` i `load('{zly')` dają `{ lists: [], selectedId: null }`; dane v1 z jednym zadaniem wczytują się bez zmian.
  - migracja: dwie listy, zadanie A `runningSince: 1000, elapsedMs: 0`, zadanie B `runningSince: 5000, elapsedMs: 0` → po `load` B biegnie (`runningSince === 5000`), A `runningSince === null` i `elapsedMs === 4000`.
  - `startTask` w liście 2, gdy biegnie zadanie w liście 1 (`now` 1000 → 3000) → zadanie z listy 1 ma `elapsedMs === 2000`, `runningSince === null`; `running(state).task` to nowe zadanie.
  - `startTask` na zakończonym zadaniu i na zamkniętej liście → `running(state) === null`.
  - `toggleTask` dwa razy (`now` 0 → 1500) → `elapsedMs === 1500`, nie biegnie.
  - `elapsed` dla biegnącego zadania: `elapsedMs: 500, runningSince: 1000`, `now: 4000` → `3500`.
  - `canClose`: pusta lista → false; 2 zadania, 1 zakończone → false, `remaining === 1`; oba zakończone → true.
  - `closeList` przy niezakończonych → `false`, `closedAt === null`; przy zakończonych → `true`, `closedAt === now`; potem `addTask` zwraca `null`, `reopenTask` nie zmienia `done`.
  - `deleteTask` biegnącego zadania → `running(state) === null`; `deleteList` z biegnącym zadaniem → `running(state) === null`, `selectedId === null`.
  - `addTask` z nazwą `'   '` → `null`; `renameList` na `''` → nazwa bez zmian.

- [ ] **Step 2: Uruchom testy, mają nie przejść**
  Run: `npm test`
  Expected: FAIL — `Cannot find module '../js/store.js'`.

- [ ] **Step 3: Zaimplementuj `js/store.js`**
  Owinięcie: `(function (root) { const S = {...}; if (typeof module !== 'undefined') module.exports = S; else root.TaskStore = S; })(this);`. Logikę `elapsed`, `fmt`, `uid`, `canClose`, wstrzymywania przenieś z obecnego `index.html:244-336`.

- [ ] **Step 4: Uruchom testy**
  Run: `npm test`
  Expected: wszystkie PASS.

- [ ] **Step 5: Commit**
  `git add js/store.js tests/store.test.js package.json && git commit -m "Logika aplikacji w js/store.js z testami"`

---

### Task 2: Szkielet, wygląd bazowy i ekran „Listy”

**Files:**
- Modify: `index.html` (całość: tylko szkielet i linki; stary `<style>` i `<script>` usunięte)
- Create: `css/app.css`
- Create: `js/app.js`
- Create: `fonts/` — `barlow-{latin,latin-ext}-{400,500,600}.woff2`, `barlow-condensed-{latin,latin-ext}-{500,600}.woff2` (10 plików; latin-ext daje polskie znaki), `OFL.txt`

**Interfaces:**
- Consumes: `TaskStore` (Task 1).
- Produces w `js/app.js`:
  - `state` (obiekt z `TaskStore.load`), `save()` — zapis `serialize` do `localStorage['taskTimer.v1']`, błędy łapane.
  - `act(fn)` — wywołuje `fn()`, potem `save()` i `render()`. Każda akcja użytkownika idzie przez `act`.
  - `route() -> { view: 'lists' } | { view: 'list', listId }` z `location.hash` (`#/`, `#/lista/<id>`); nieznane id → `{ view: 'lists' }`.
  - `render()` — rysuje `#app` według `route()` i szerokości (`matchMedia('(min-width: 768px)')`).
  - `renderLists(container)`, `renderList(container, list)` — Task 3 wypełnia drugą.
  - Kontenery w `index.html`: `<div id="app">`, `<div id="dock">`, `<div id="sheet-root">`, `<div id="printReport">`.

- [ ] **Step 1: Pobierz czcionki**
  Pliki `barlow-<subset>-<waga>-normal.woff2` z `https://cdn.jsdelivr.net/npm/@fontsource/barlow@5/files/` i `barlow-condensed-<subset>-<waga>-normal.woff2` z `@fontsource/barlow-condensed@5/files/`; zapisz pod nazwami z listy Files. W `@font-face` każdy subset osobno z `unicode-range` (wartości z pliku `<waga>.css` tego pakietu). `OFL.txt` z `LICENSE` pakietu. Każdy pobrany plik sprawdź: `file fonts/*.woff2` → „Web Open Font Format (Version 2)”.

- [ ] **Step 2: `css/app.css` — tokeny i baza**
  Tokeny z tabeli w specu na `:root` i w `@media (prefers-color-scheme: dark)`; `body` z tłem `var(--bg)`; `@font-face`; klasa `.clock` (Barlow Condensed, `tabular-nums`); `:focus-visible` obrys 2 px `var(--ink)`; `@media (prefers-reduced-motion: reduce)` zeruje `transition`/`animation`; reguły druku przeniesione z obecnego `index.html:176-192`.

- [ ] **Step 3: `index.html`**
  `lang="pl"`, `viewport` z `viewport-fit=cover`, `<link rel="stylesheet" href="css/app.css">`, kontenery z Interfaces, na końcu `<script src="js/store.js">` i `<script src="js/app.js">`.

- [ ] **Step 4: Ekran „Listy” w `renderLists`**
  Nagłówek „Listy”; aktywne listy (nazwa, „X z Y gotowe”, łączny czas `.clock`); zamknięte listy w `<details>` z licznikiem w `<summary>` („Zamknięte (N)”); przycisk „Nowa lista” otwiera pole nazwy (Enter = `createList` + przejście do `#/lista/<id>`); pusty stan „Zacznij pierwszą listę” z polem i przyciskiem „Utwórz listę”. Wiersz listy: min. 56 px, cały klikalny (link `#/lista/<id>`). Nasłuch `hashchange` → `render()`.

- [ ] **Step 5: Sprawdź w przeglądarce (375 × 812)**
  Serwer testowy (`.claude/launch.json` z serwerem statycznym, nie commitować), widok `mobile`. Expected: utworzenie listy przenosi na `#/lista/<id>`; „wstecz” wraca na listy; dane sprzed zmiany (`taskTimer.v1`) widoczne; polskie znaki w czcionce Barlow (`document.fonts.check('16px Barlow')` → `true`).

- [ ] **Step 6: Sprawdź nieznany adres**
  Ustaw `location.hash = '#/lista/nie-ma'`. Expected: ekran „Listy”, brak błędów w konsoli.

- [ ] **Step 7: Commit**
  `git add index.html css fonts js/app.js && git commit -m "Nowy szkielet, wygląd bazowy i ekran list"`

---

### Task 3: Ekran listy i wiersze zadań

**Files:**
- Modify: `js/app.js`, `css/app.css`

**Interfaces:**
- Consumes: `act`, `route`, `TaskStore.*`.
- Produces: `renderList(container, list)`; `tick()` co 500 ms aktualizuje elementy `[data-time="<taskId>"]` i `[data-total="<listId>"]` bez przebudowy DOM; zdarzenie `taskmenu` (CustomEvent na `document`, `detail: { listId, taskId }`) wysyłane po długim przytrzymaniu / prawym kliku — Task 5 je obsługuje.

- [ ] **Step 1: Nagłówek listy**
  Na telefonie: „‹ Listy” (link `#/`), przycisk „⋯” z `aria-label="Menu listy"` (na razie wysyła `CustomEvent('listmenu', { detail: { listId } })`), nazwa listy 24 px, „X z Y gotowe”, łączny czas, pasek postępu (szerokość = zakończone / wszystkie, kolor `--done`). Na zamkniętej liście dopisek „Zamknięta”.

- [ ] **Step 2: Wiersz zadania**
  Struktura i stany z sekcji „Wiersz zadania” w specu. Kółko to osobny `<button>` 48 × 48 (`aria-label` „Zakończ zadanie” / „Wznów zadanie”), reszta wiersza to `<button>` z `aria-pressed` = biegnie. Kliknięcie wiersza → `act(() => TaskStore.toggleTask(...))`; kółko → `finishTask` / `reopenTask`. Długie przytrzymanie: `pointerdown` + timer 500 ms, anulowany przy `pointerup`/`pointermove` > 10 px; po wywołaniu blokuje następny `click`. Prawy klik (`contextmenu`) robi to samo.

- [ ] **Step 3: Dodawanie zadania**
  Wiersz „+ Dodaj zadanie” → pole tekstowe w miejscu wiersza (zachowanie z sekcji „Dodawanie zadania” w specu). Po `render()` fokus wraca do pola, jeśli było otwarte. Pusta lista: pole otwarte od razu, nagłówek „Dodaj pierwsze zadanie”.

- [ ] **Step 4: Przycisk zamknięcia / PDF pod listą**
  Gdy `canClose(list)` i lista otwarta: duży przycisk „Zamknij listę” (wysyła `CustomEvent('closelist', { detail: { listId } })`). Na zamkniętej liście: przycisk „Zapisz do PDF” (`CustomEvent('printlist', ...)`). Obsługa w Task 5.

- [ ] **Step 5: Sprawdź (375 × 812)**
  Expected: stuknięcie w wiersz startuje / wstrzymuje; start w drugiej liście wstrzymuje pierwszą; kółko kończy i wznawia; czas tyka; skrypt mierzący `getBoundingClientRect()` wszystkich `button, a, input` w `#app` nie zwraca nic poniżej 48 px wysokości (wiersze ≥ 56).

- [ ] **Step 6: Sprawdź długie nazwy**
  Lista i zadanie z nazwą 200 × „a” bez spacji. Expected: `document.documentElement.scrollWidth <= 375`, czas w wierszu widoczny (`getBoundingClientRect().right <= 375`).

- [ ] **Step 7: Commit**
  `git commit -am "Ekran listy: wiersze zadań, dodawanie, postęp"`

---

### Task 4: Dok z zegarem

**Files:**
- Modify: `js/app.js`, `css/app.css`

**Interfaces:**
- Consumes: `TaskStore.running`, `act`, `tick`.
- Produces: `renderDock()` wywoływane na końcu `render()`; element zegara `[data-time="<taskId>"]`, więc `tick()` go aktualizuje.

- [ ] **Step 1: Dok**
  Zgodnie z sekcją „Dok” w specu: kropka i nazwa zadania w `--run`, nazwa listy pod spodem, gdy różna od oglądanej; zegar 40 px (tablet 36 px); przyciski 56 × 56: „Wstrzymaj” (`--run`, ikona pauzy, `aria-label`) i „Zakończ” (`--done`). Nazwa to link `#/lista/<id>`. `padding-bottom: calc(12px + env(safe-area-inset-bottom))`. Brak biegnącego zadania → `#dock` pusty i ukryty.

- [ ] **Step 2: Układ**
  Na telefonie dok przyklejony do dołu ekranu (`position: sticky; bottom: 0` w kolumnie flex o wysokości `100dvh`), treść nad nim przewija się sama. Pojawienie się: wysunięcie od dołu 200 ms.

- [ ] **Step 3: Sprawdź (375 × 812)**
  Lista z 15 zadaniami, uruchom ostatnie. Expected: dok widoczny bez przewijania (`#dock.getBoundingClientRect().bottom <= 812`), Wstrzymaj chowa dok, Zakończ zaznacza zadanie.

- [ ] **Step 4: Sprawdź powrót po czasie**
  W `localStorage` ustaw zadaniu `runningSince = Date.now() - 3 * 3600 * 1000`, przeładuj. Expected: dok od razu widoczny, zegar ≥ `3:00:00`.

- [ ] **Step 5: Commit**
  `git commit -am "Dok z zegarem biegnącego zadania"`

---

### Task 5: Arkusze, menu, zamykanie listy i PDF

**Files:**
- Modify: `js/app.js`, `css/app.css`

**Interfaces:**
- Consumes: zdarzenia `listmenu`, `taskmenu`, `closelist`, `printlist` (Task 3), `act`.
- Produces: `openSheet({ title, body?, actions: [{ label, danger?, run }] , input?: { value, placeholder } }) -> void`, `closeSheet() -> void`.

- [ ] **Step 1: `openSheet` / `closeSheet`**
  Arkusz od dołu na telefonie, okno na środku od 768 px, w `#sheet-root`. Tło półprzezroczyste; Esc i stuknięcie w tło zamykają; fokus wchodzi do pierwszego elementu, Tab nie wychodzi poza arkusz, po zamknięciu fokus wraca na element, który otworzył arkusz. Przycisk „Anuluj” zawsze ostatni. Akcja `danger` w `--danger`. Gdy `input`: pole z wartością i przyciskiem akcji, Enter = akcja.

- [ ] **Step 2: Menu listy (`listmenu`)**
  Akcje z sekcji „Menu listy” w specu. „Zamknij listę” przy niezakończonych zadaniach → arkusz z tekstem „Zakończ najpierw wszystkie zadania (zostało: N).” i tylko „OK”. Przy zakończonych → pytanie „Zamknąć listę „<nazwa>”? Potem nie da się jej zmieniać.” z akcją „Zamknij listę”. „Usuń listę” → pytanie „Usunąć listę „<nazwa>”? Tego nie da się cofnąć.”, akcja „Usuń listę” (danger), po usunięciu `location.hash = '#/'`.

- [ ] **Step 3: Menu zadania (`taskmenu`)**
  „Zmień nazwę” (arkusz z polem), „Usuń zadanie” (pytanie, danger). Na zamkniętej liście menu się nie otwiera.

- [ ] **Step 4: Podpowiedź o przytrzymaniu**
  Zachowanie i tekst z sekcji „Wiersz zadania” w specu; flaga `localStorage['taskTimer.hintSeen'] = '1'`.

- [ ] **Step 5: `closelist` i `printlist`**
  `closelist` → to samo pytanie co w menu. `printlist` → funkcja druku przeniesiona z obecnego `index.html:339-366` (wypełnia `#printReport`, ustawia `document.title`, `window.print()`).

- [ ] **Step 6: Sprawdź**
  `window.confirm` i `window.prompt` nie są nigdzie używane (`grep -n "confirm(\|prompt(" js/app.js` → brak). W panelu: zmiana nazwy listy i zadania, usunięcie zadania, próba zamknięcia z niezakończonym zadaniem (komunikat z liczbą), zamknięcie, „Zapisz do PDF” wywołuje `window.print` (podmieniony na licznik) z tytułem „<nazwa> - raport czasu”.

- [ ] **Step 7: Sprawdź usuwanie biegnącego**
  Uruchom zadanie, usuń je przez menu zadania; uruchom inne, usuń całą listę. Expected: dok znika w obu przypadkach, brak błędów w konsoli.

- [ ] **Step 8: Commit**
  `git commit -am "Arkusze zamiast confirm/prompt, menu listy i zadania, PDF"`

---

### Task 6: Układ tablet / komputer

**Files:**
- Modify: `js/app.js`, `css/app.css`

**Interfaces:**
- Consumes: `renderLists`, `renderList`, `renderDock`.
- Produces: brak nowych.

- [ ] **Step 1: Dwie kolumny od 768 px**
  `render()` przy `min-width: 768px` rysuje obok siebie `renderLists` (kolumna 260 px, tło `--surface`, linia `--line`) i `renderList` dla `route().listId` albo `state.selectedId`; aktywna lista w kolumnie wyróżniona tłem `--run-soft` tylko gdy coś w niej biegnie, inaczej tłem `--bg`. Bez „‹ Listy” w nagłówku. Dok na dole prawej kolumny. Treść max 1100 px, wyśrodkowana. Zmiana szerokości (`matchMedia` `change`) → `render()`.

- [ ] **Step 2: Sprawdź (768 × 1024 i 1280 × 800)**
  Expected: obie kolumny widoczne, krótkie nazwy zadań w jednej linii, dok w prawej kolumnie, brak poziomego przewijania.

- [ ] **Step 3: Commit**
  `git commit -am "Układ dwukolumnowy na tablet i komputer"`

---

### Task 7: PWA, zapis danych i ostrzeżenie

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png`
- Modify: `index.html`, `js/app.js`, `css/app.css`

**Interfaces:**
- Consumes: `save()`.
- Produces: brak nowych.

- [ ] **Step 1: Ikona**
  `icons/icon.svg`: tarcza stopera (okrąg + przycisk na górze + wskazówka) w `#F2A900` na tle `#1B2430`; wersja maskable z tłem na całą powierzchnię i rysunkiem w środkowych 80 %. PNG przez Edge bez okna (pełna ścieżka, np. `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`; sprawdź ją najpierw): `msedge --headless --disable-gpu --screenshot=icons/icon-512.png --window-size=512,512 icons/icon.svg` (analogicznie 192, 180 i maskable). Sprawdź: każdy PNG ma właściwy rozmiar (`file icons/*.png`).

- [ ] **Step 2: Manifest i meta**
  Wartości z sekcji „PWA” w specu; `<link rel="manifest">`, `<link rel="apple-touch-icon">`, dwa `<meta name="theme-color">` z `media` dla jasnego i ciemnego trybu (`#EEF1F4`, `#161C24`), `<meta name="apple-mobile-web-app-capable" content="yes">`.

- [ ] **Step 3: `sw.js`**
  `CACHE = 'stoper-v1'`; lista plików: `./`, `index.html`, `css/app.css`, `js/store.js`, `js/app.js`, `manifest.webmanifest`, wszystkie pliki z `fonts/` i `icons/`. `install` → `cache.addAll`; `activate` → usuń pamięci o innej nazwie; `fetch` (tylko GET) → najpierw pamięć, potem sieć. Rejestracja w `js/app.js` tylko gdy `location.protocol` zaczyna się od `http`.

- [ ] **Step 4: Zapis i trwałość**
  `save()` także przy `visibilitychange` → `hidden`; usuń `beforeunload`. Po starcie `navigator.storage?.persist?.()`.

- [ ] **Step 5: Ostrzeżenie o braku zapisu**
  Gdy zapis do `localStorage` rzuci wyjątek, nad treścią pasek „Dane nie zapisują się w tej przeglądarce.” (tło `--bg`, tekst `--ink-2`, bez przycisku). Sprawdź: podmień `Storage.prototype.setItem` na funkcję rzucającą błąd, wykonaj akcję → pasek widoczny, aplikacja dalej działa.

- [ ] **Step 6: Sprawdź PWA**
  Przez serwer `http://localhost`: konsola bez błędów; `navigator.serviceWorker.controller` po przeładowaniu nie jest `null`; `caches.keys()` → `['stoper-v1']`; po zatrzymaniu serwera i przeładowaniu aplikacja się otwiera. Przez `file://`: aplikacja działa, brak próby rejestracji SW.

- [ ] **Step 7: Commit**
  `git add manifest.webmanifest sw.js icons index.html js css && git commit -m "PWA: manifest, ikony, service worker, trwały zapis"`

---

### Task 8: Sprawdzenie końcowe i README

**Files:**
- Modify: `README.md`, `.gitignore` (dodaj `.claude/`)

- [ ] **Step 1: Testy logiki**
  Run: `npm test` → wszystkie PASS.

- [ ] **Step 2: Przegląd w panelu**
  375 × 812 i 768 × 1024, każdy w trybie jasnym i ciemnym (`colorScheme`). Przejdź cały scenariusz z kryteriów sukcesu 1–7 ze specu. Zrzuty ekranu każdego widoku obejrzyj pod kątem kontrastu i obcinania tekstu.

- [ ] **Step 3: Podgląd wydruku**
  Przenieś reguły `@media print` do zwykłego CSS (jak w poprzednim teście) i obejrzyj raport: polskie znaki, tabela, suma.

- [ ] **Step 4: README**
  Opis nowego wyglądu, instalacja jako aplikacja, włączenie GitHub Pages (Settings → Pages → Branch `main`, folder `/`), `npm test`.

- [ ] **Step 5: Commit**
  `git commit -am "README: instalacja, GitHub Pages, testy"`

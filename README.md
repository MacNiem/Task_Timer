# Task Timer

Prosta aplikacja w przeglądarce do mierzenia czasu spędzonego nad zadaniami.

## Funkcje

- Tworzenie list zadań z własnymi nazwami
- Dodawanie zadań do listy
- Start i pauza odliczania czasu dla każdego zadania (w danej liście czas liczy się tylko dla jednego zadania naraz)
- Oznaczanie zadań jako zakończone
- Zamykanie listy — możliwe dopiero po zakończeniu wszystkich zadań
- Podgląd i zapis zamkniętej listy do PDF (z czasami poszczególnych zadań i sumą)

Dane zapisywane są lokalnie w przeglądarce (`localStorage`).

## Uruchomienie

Otwórz plik `index.html` w przeglądarce. Nie trzeba niczego instalować, aplikacja działa bez internetu.

Folder `lib/` musi znajdować się obok `index.html`.

## Biblioteki

- [pdfmake](https://github.com/bpampuch/pdfmake) 0.2.10 (licencja MIT) — generowanie PDF, w folderze `lib/`

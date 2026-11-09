# Drzewko dworskie — Regestr Dworu Kuttenberskiego

Interaktywna hierarchia urzędów i osób z ozdobnymi kartami, ruchomymi połączeniami oraz osobnymi trybami **edycji** i **czytania**. Działa **w całości na GitHub Pages** — bez Cloudflare, bazy danych, logowania i tokenu GitHub.

## Adresy

**Edytor (możesz przekazać każdemu):** https://hogcraft2-cpu.github.io/drzewko/editor.html

**Publiczny schemat domyślny:** https://hogcraft2-cpu.github.io/drzewko/

**Każda osobna publikacja** otrzymuje link postaci:

```text
https://hogcraft2-cpu.github.io/drzewko/index.html#pub=g.H4sI...
```

Nie jest to nowy serwer ani podstrona dodawana do repozytorium: to **osobny URL tej samej strony z zapisanym stanem drzewka**. Zawartość publikacji jest zapakowana i zakodowana w części adresu po `#pub=`. Dlatego może być odczytana na innym urządzeniu **bez żadnego backendu**.

## Krótkie linki

Dla wersji zapisanych bezpośrednio w repozytorium można używać krótkich identyfikatorów:

- **Wersja d1:** https://hogcraft2-cpu.github.io/drzewko/?s=d1
- Zapisany plik: `published/d1.json`.
- Viewer pobiera dane wskazanego `published/<identyfikator>.json`, a edytor może otworzyć taką wersję jako własną kopię.

Aby każdy mógł skracać własne wersje **bez konta, tokenu i serwera**, w edytorze po opublikowaniu dodałem przycisk **✂ Skróć link**. Otwiera on bezpłatną usługę [is.gd](https://is.gd/create.php), gdzie otrzymujesz krótki adres przekierowujący do konkretnej, zapisanej w linku wersji drzewka. Usługa jest zewnętrzna: otrzymuje pełny adres docelowy i przechowuje go, a link działa tylko dopóki ta usługa istnieje. Obsługuje adresy docelowe do 5000 znaków. To nie zapisuje nowych danych do repozytorium.

**Istotne ograniczenie:** automatyczne tworzenie krótkich linków **własnej domeny GitHub Pages** dla każdego użytkownika, bez uprawnień zapisu do repozytorium ani backendu, nie jest możliwe. Dla dodatkowych krótkich wersji pod `?s=...` trzeba dodać plik JSON do repozytorium. Istniejące długie linki `#pub=...` nadal działają bez usług zewnętrznych.

## Jak opublikować nowe drzewko

1. Otwórz **edytor**.
2. Klikaj urzędy, edytuj nazwy i obsadę, dodawaj i usuwaj role. Przeciągnij karty, żeby je przemieścić; użyj przycisku **Połącz**, aby stworzyć nowe relacje.
3. Kliknij **↗ Publikuj nowy link** na pasku albo **Publikuj jako osobny link** po prawej.
4. W okienku kliknij **Kopiuj link** i wyślij go na Discordzie / znajomym. Przeglądający otworzą wersję **tylko do odczytu**, bez narzędzi edycji.
5. Po następnych zmianach kliknij ponownie **Publikuj nowy link**, aby uzyskać **nowy URL**. Poprzedni nadal pokazuje niezmienioną wcześniejszą wersję.
6. Osoba oglądająca publikację może kliknąć **Edytuj kopię drzewka**, wprowadzić własne zmiany i wydać **kolejny osobny link**. Nie nadpisze przez to pierwotnej publikacji.

Zadania, role, opisy, osoby i połączenia znajdują się w adresie, nie znikną po zamknięciu przeglądarki **jeśli zachowasz pełny link**. Autor widzi też listę do 20 ostatnich linków na swoim urządzeniu (w pamięci przeglądarki, bez synchronizacji urządzeń).

## Edycja a publikacja

- Edytor jest otwarty dla **każdego, kto zna jego adres**. Nie daje to nikomu prawa zapisu do Twojego konta GitHub ani modyfikacji plików repozytorium.
- W trakcie edycji jest automatycznie zachowywany szkic w **localStorage** na danym urządzeniu.
- Każda publikacja tworzy **niezmienny link do konkretnej wersji**. Otwieranie linku publicznego nie pozwala edytować oryginalnego wydania.
- Strona główna bez `#pub=...` wyświetla domyślne `data/tree.json` z repozytorium. **Nie aktualizuje się automatycznie po publikowaniu** wersji-linków.
- Jeżeli chcesz zmieniać tę samą, krótką stronę publiczną dla wszystkich w czasie rzeczywistym, potrzebny byłby serwer lub baza danych. Tego ten wariant nie zapewnia.
- Publikowany link może być długi, ponieważ zawiera komplet danych. Duże drzewka nie zmieszczą się w bezpiecznym limicie URL; wtedy nadal dostępne są **Eksport JSON** i **Import JSON**.
- Wersje będą się otwierać, dopóki projekt GitHub Pages działa pod tym samym adresem i obsługuje obecny format.
- Adresy można przesyłać bez loginu i hasła; publikacje są **publiczne dla każdego, kto ma link**. Nie dodawaj do drzewa poufnych danych.

## Wdrożenie GitHub Pages

W repozytorium: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Workflow `.github/workflows/pages.yml` uruchamia publikację po commitach na `main`.

Wszystkie zmiany w edytorze działają po stronie przeglądarki, więc GitHub Pages potrzebne jest wyłącznie do udostępnienia plików aplikacji. Nie konfigurujesz już żadnej usługi chmurowej do przechowywania danych.

## Pliki

- `index.html` — panel tylko do przeglądania.
- `editor.html` — panel tworzenia i publikacji.
- `assets/share.js` — kodowanie, kompresja i odczyt samodzielnych linków.
- `assets/app.js` — wizualizacja, karty, relacje, edycja i eksport/import.
- `assets/style.css` — średniowieczny wygląd.
- `data/tree.json` — przykładowe drzewko, wykorzystywane bez specjalnego URL.

Projekt nie wymaga Node.js i można go testować lokalnie:

```bash
python -m http.server 8000
```

Otwórz `http://localhost:8000/editor.html`.

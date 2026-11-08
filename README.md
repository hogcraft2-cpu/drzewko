# Regestr Dworu — interaktywne drzewko hierarchii

Średniowieczny schemat urzędów, osób i zależności na dworze. Projekt powstał na podstawie przesłanego szkicu i jest gotowy do hostowania na GitHub Pages.

## Dwie osobne strony

- **Widok publiczny:** `https://hogcraft2-cpu.github.io/drzewko/` — odczyt schematu, wyszukiwanie, przesuwanie, powiększanie, podgląd osób i obowiązków. Bez funkcji edycji.
- **Panel edytora:** `https://hogcraft2-cpu.github.io/drzewko/editor.html` — dodawanie/usuwanie urzędów, obsada, opisy, grupy, przeciąganie kart, tworzenie i usuwanie powiązań, automatyczne rozmieszczanie, cofanie/ponawianie, eksport/import JSON, publikacja do GitHub.

> Linki GitHub Pages zadziałają po włączeniu publikowania witryny w ustawieniach repozytorium.

## Uruchomienie GitHub Pages

1. Otwórz **Settings → Pages** w repozytorium `hogcraft2-cpu/drzewko`.
2. W **Build and deployment → Source** wybierz **GitHub Actions**. Zatwierdź ustawienie.
3. Plik `.github/workflows/pages.yml` wdroży witrynę po kolejnym wypchnięciu zmian na `main` (można także ręcznie uruchomić workflow w zakładce **Actions**).
4. Otwórz powyższe adresy. Jeżeli Pages nie jest jeszcze aktywne, sprawdź stan akcji „Publish regestr”.

Alternatywnie możesz w Pages wskazać **Deploy from a branch → main → /(root)**; wtedy plik workflow nie jest wymagany.

## Jak edytować

1. Otwórz `editor.html` i kliknij istniejący urząd; właściwości pojawią się z prawej strony.
2. **Nowy urząd** dodaje kartę (gdy urząd był zaznaczony, od razu powstaje również powiązanie z nim).
3. Przeciągnij kartę w dowolne miejsce. Kliknij **Połącz**, a potem urząd docelowy, aby dodać strzałkę. Kółko **+** przy wybranej karcie również rozpoczyna tworzenie połączenia.
4. Zaznacz połączenie, by je usunąć; albo użyj przycisku × obok relacji w panelu po prawej.
5. Wszystkie robocze zmiany zachowują się w pamięci **tej przeglądarki** (localStorage). Inni nie zobaczą ich, dopóki ich nie opublikujesz.
6. Kliknij **Opublikuj na GitHubie** i wprowadź *fine-grained personal access token* z dostępem **Contents: Read and write** wyłącznie do `drzewko`. Token jest używany tylko do bieżącego żądania do GitHub API i nie jest zapisywany. Operacja aktualizuje `data/tree.json` na gałęzi `main`.
7. **Bez tokenu:** kliknij **Eksport**, pobierz JSON i wgraj jego zawartość do `data/tree.json` na GitHubie (zachowując tę samą nazwę). Po wdrożeniu GitHub Pages strona publiczna pokaże zmiany.

**Uwaga:** adres `editor.html` nie jest zabezpieczony hasłem. Każdy posiadający link może lokalnie przygotowywać zmiany, ale bez tokenu z prawami do repozytorium nie może ich opublikować. Nie umieszczaj tokenu w repozytorium, kodzie ani wiadomościach.

## Dane

Wspólny schemat znajduje się w `data/tree.json`:

- `nodes`: karty urzędów (`id`, `title`, `people`, `note`, `group`, `x`, `y`),
- `edges`: skierowane relacje (`id`, `from`, `to`),
- `title`, `subtitle`: tytuł i podtytuł regestru.

Dozwolone grupy: `wladza`, `dwor`, `wojsko`, `kosciol`, `gospodarstwo`.

## Testowanie lokalne

Przy uruchamianiu z dysku należy użyć serwera HTTP (przeglądarki nie pozwalają zwykle pobierać JSON przez `file://`):

```bash
python -m http.server 8000
```

Otwórz `http://localhost:8000/` oraz `http://localhost:8000/editor.html`.

Projekt jest statyczny i nie wymaga Node.js ani bazy danych. GitHub Pages obsługuje pliki bezpośrednio z repozytorium.
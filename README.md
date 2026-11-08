# Regestr Dworu Kuttenberskiego — współdzielone drzewko

Interaktywny, średniowieczny schemat hierarchii z osobnym **edytorem** i **widokiem publicznym**. Można dodawać urzędy i osoby, usuwać role, przeciągać karty, łączyć je strzałkami, wyszukiwać, przybliżać, importować i eksportować plik JSON.

**Nowość:** osoby posiadające prywatny link edycyjny mogą zapisać schemat dla wszystkich **bez logowania i bez tokenu GitHub**. Właściciel musi **jednorazowo uruchomić backend** Cloudflare Worker + D1. Na razie backend nie jest jeszcze uruchomiony — patrz kroki poniżej.

## Linki

- Publiczny odczyt: https://hogcraft2-cpu.github.io/drzewko/
- Edytor (bez prawa publikacji, jeśli brakuje sekretu): https://hogcraft2-cpu.github.io/drzewko/editor.html
- Właściwy prywatny link edycyjny: `https://hogcraft2-cpu.github.io/drzewko/editor.html#edit=TWOJ_LOSOWY_SEKRET`

W trybie publicznym nie ma przycisków edytowania ani odnośnika do edytora. Sam adres edytora bez klucza pozwala tworzyć szkic tylko lokalnie, ale **nie pozwala zapisać do wspólnej bazy**.

## Jak jednorazowo uruchomić zapis online

Potrzebne: własne konto [Cloudflare](https://dash.cloudflare.com/), komputer z [Node.js](https://nodejs.org/) i terminal. Nie potrzebujesz tokenu GitHub, aby udostępniać edycję.

1. Pobierz repozytorium na komputer (GitHub → Code → Download ZIP i rozpakuj) lub użyj `git clone https://github.com/hogcraft2-cpu/drzewko.git`.
2. W terminalu przejdź do folderu `drzewko/worker`.
3. Zaloguj się jednorazowo do Cloudflare i utwórz bazę:
   ```bash
   npx wrangler login
   npx wrangler d1 create drzewko-db
   ```
4. Skopiuj `database_id` z odpowiedzi Cloudflare. W pliku `worker/wrangler.toml` zastąp `REPLACE_WITH_YOUR_D1_DATABASE_ID` tym identyfikatorem. Nie zmieniaj `binding = "DB"`.
5. Wygeneruj na swoim komputerze losowy sekret dostępu. Przykładowa komenda:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   **Zapisz wynik w menedżerze haseł, nie wysyłaj go do czatu i nie wstawiaj go do GitHuba.**
6. Uruchom backend:
   ```bash
   npx wrangler deploy
   npx wrangler secret put EDIT_SECRET
   ```
   Przy drugim poleceniu wklej wygenerowany sekret. Worker zapisze go jako poufną zmienną środowiskową. Komenda `deploy` poda adres np. `https://drzewko-api.twoja-nazwa.workers.dev`.
7. Otwórz na GitHubie plik **`assets/config.js`**, wybierz edycję i wstaw adres:
   ```js
   window.DRZEWKO_API_BASE = 'https://drzewko-api.twoja-nazwa.workers.dev';
   ```
   Zapisz commit. GitHub Pages powinno automatycznie opublikować plik.
8. Otwórz prywatny link `editor.html#edit=...`, wpisując jako końcową część **ten sam** sekret ustawiony w Cloudflare. Kliknij **Zapisz online**, żeby po raz pierwszy wgrać istniejące drzewko do bazy.
9. Wyślij publiczny link każdemu, kto ma tylko oglądać. Prywatny link z sekretem wyślij wyłącznie upoważnionym edytorom.

### Włączenie GitHub Pages (jeśli jeszcze nie jest aktywne)

Repozytorium → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Workflow `.github/workflows/pages.yml` publikuje stronę po zmianach na `main`. Można także wybrać **Deploy from a branch → main → / (root)**.

### Jak działa edytowanie

1. Otwórz prywatny link — **bez podawania tokenu GitHub i bez formularza logowania**.
2. Dodawaj role, przypisuj osoby, łącz stanowiska i przestawiaj karty. Wszystko w trakcie pracy zapisuje się jako **lokalny szkic** w przeglądarce.
3. Kliknij **☁ Zapisz online**. Dane zapisują się w D1, a witryna publiczna sprawdza aktualizacje co **20 sekund**.
4. Jeśli ktoś w międzyczasie opublikuje nowszą wersję, edytor nie nadpisze jej automatycznie. Pojawi się komunikat o **konflikcie wersji**. Najpierw wyeksportuj swój szkic i odśwież stronę.

Pierwsze uruchomienie bez opublikowanych danych pokazuje `data/tree.json` jako przykładową wersję. Po pierwszym zapisie online wspólna baza jest źródłem aktualnych danych.

## Bezpieczeństwo

- Klucz dostępu znajduje się w części `#edit=...` linku, czyli **fragmencie URL** (przeglądarka nie wysyła go do serwera w żądaniu otwarcia strony). Przy zapisie aplikacja przesyła go wyłącznie do Workera w nagłówku `Authorization`.
- Klucz znajduje się wyłącznie w sekretach Cloudflare, **nie** w repozytorium. Nie dziel go przez publiczny Discord. Każdy posiadający pełny link może publikować zmiany.
- Backend dopuszcza żądania przeglądarki z `https://hogcraft2-cpu.github.io` (oraz lokalnie podczas testów), kontroluje rozmiar danych i wymaga zgodnej wersji schematu.
- Aby odebrać dostęp wszystkim posiadaczom starego linku, ustaw nowy `EDIT_SECRET` w Cloudflare i wygeneruj nowy prywatny link.
- Publiczny odczyt działa bez klucza. Klucza nie należy przechowywać w kodzie ani plikach JSON.
- Przy braku konfiguracji API lub bez prywatnego linku **nie można** opublikować zmian; komunikat w edytorze informuje o tym wprost.

## Struktura

- `index.html` — publiczna przeglądarka hierarchii.
- `editor.html` — edytor.
- `assets/app.js`, `assets/style.css` — wspólny interfejs.
- `assets/config.js` — adres Workera, bez sekretów.
- `data/tree.json` — dane początkowe i zapasowe.
- `worker/index.js`, `worker/wrangler.toml` — kod serwera i konfiguracja Cloudflare.
- `.github/workflows/pages.yml` — publikacja strony na GitHub Pages.

Dane schematu mają postać `{version,title,subtitle,nodes,edges}`. Zapis w D1 odbywa się atomowo, z numerem rewizji. Nie ma synchronizacji pozycji kursora ani edycji wielu osób w czasie rzeczywistym; zmiany są publikowane jako całe wersje po kliknięciu przycisku.

### Test lokalny frontendu

W katalogu głównym repozytorium:
```bash
python -m http.server 8000
```
Otwórz `http://localhost:8000` oraz `http://localhost:8000/editor.html`. Jeżeli API nie jest skonfigurowane, można edytować tylko lokalny szkic i wyeksportować JSON.

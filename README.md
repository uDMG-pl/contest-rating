# Contest rating

## Uruchomienie

Wymagany Node.js 22.18+ lub 24+ oraz npm.

```sh
npm ci
npm run dev
```

## Średnia z czatu Kick

Strona automatycznie łączy się z publicznym czatem `kick.com/dmgpoland`.
Podpowiedź przy kategorii o ID `audience-rating` pokazuje średnią i liczbę
głosujących. Ręczna ocena nadal decyduje o rankingu i eksporcie.

- Głos to cała wiadomość z liczbą od 0 do 10 co 0,5, np. `8`, `1.5` lub `8,5`.
  Inne ułamki (np. `7,83`) są pomijane, również przy odczycie zapisanych głosów.
  Średnia jest obliczana z poprawnych głosów bez zaokrąglania do pół punktu.
- Liczy się ostatnia poprawna ocena danego ID użytkownika, osobno dla każdego zgłoszenia.
- Głosy są zbierane od wejścia na zgłoszenie. Powrót kontynuuje zapisane głosy;
  podsumowanie i brak kategorii widzów wstrzymują zbieranie.
- Stan zapisuje się lokalnie w przeglądarce. Reset konkursu usuwa także głosy.
  Przy zablokowanym lub pełnym magazynie przeglądarki dane pozostają w pamięci.
- Po utracie połączenia aplikacja zachowuje wynik i ponawia połączenie.
  Nie pobiera historii ani wiadomości z czasu przerwy.

Połączenie nie wymaga konta, backendu ani kluczy API. Korzysta z nieoficjalnego
transportu Kick, którego adres i identyfikator czatu znajdują się w
`src/lib/kick-chat.ts`. Zmiany po stronie Kick mogą wymagać aktualizacji tego modułu.
Komputer powinien mieć poprawnie ustawiony czas — czas wysłania wiadomości
wyznacza, czy głos należy do bieżącego okna oceniania.

## Weryfikacja

```sh
npm test
npm run build
npm run lint
```

Testy używają wbudowanego runnera Node.js, symulowanego WebSocket i zegara.
Obejmują parser, średnią, korekty, duplikaty, granice czasowe, zapis/reset,
potwierdzenie subskrypcji, heartbeat, ponawianie i sprzątanie połączenia.

Po uruchomieniu serwera deweloperskiego `/tests/browser-smoke.html` udostępnia
rzeczywistą aplikację z symulowanym czatem. Przyciski wysyłają dwa głosy (średnia 9),
korektę (średnia 8) i symulują rozłączenie. Można sprawdzić przejście dalej/powrót,
odświeżenie, ręczne oceny i reset. Dane tego testu są odizolowane od prawdziwych
ocen i przechowywane tylko w sesji karty. Fixture nie jest częścią buildu produkcyjnego.

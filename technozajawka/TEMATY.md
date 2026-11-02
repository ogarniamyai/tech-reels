# Tematy rolek technozajawka

Ten plik czyta i aktualizuje nocne zadanie „Nocna rolka technozajawka”.

**Zasady** (pełny opis w skillu `technozajawka-tematy-rolek`):
- Kolejność linii w sekcji „Lista” to kolejka. Numer jest tylko stałym identyfikatorem tematu i nie oznacza kolejności.
- Następna rolka bierze pierwszy temat od góry oznaczony `- [ ]`.
- Po dostarczeniu rolki temat dostaje `- [x]`, datę i pozę robocika z okładki, a jego linia trafia zaraz pod ostatni zrobiony temat.
- Gdy temat zostaje pominięty (słaby albo nie da się go zweryfikować), zostaje `- [ ]` z dopiskiem `pominięty RRRR-MM-DD: powód`, a zadanie bierze kolejny.
- Nowy temat dostaje numer o jeden większy od największego i ląduje zaraz pod ostatnim zrobionym, czyli jako pierwszy niezrobiony.
- Kolejność możesz zmieniać ręcznie: przesuń linię wyżej, żeby temat poszedł szybciej.
- Temat może mieć pole `opis: ...` wpisane zaraz po tytule. To konkretny plan rolki: kąt, hak, kolejne sceny z tekstem lektora, co pokazać i czego unikać. Autor rolki trzyma się opisu, a gdy research pokaże, że jakiś fakt się nie zgadza, poprawia go i mówi o tym użytkownikowi. Pole `uwaga: ...` zostaje na krótkie ostrzeżenia.
- Kolejność pól w linii: znacznik, numer, tytuł, `opis:`, `uwaga:`, `pominięty`, `zrobione`, `poza:`. Pola `opis` i `uwaga` są opcjonalne. Wewnątrz opisu nie używaj pionowej kreski, bo oddziela ona pola.

Pozy robocika na okładce: `wychyla się zza górnej krawędzi`, `siedzi i macha`, `zerka zza boku`, `stoi obok i wskazuje`.

## Lista

- [x] 00 | Mikrofalówka: dlaczego grzeje wodę w jedzeniu, a talerz zostaje chłodny | zrobione przed 2026-11-01 | poza: nieznana
- [x] 01 | Face ID: tysiące niewidzialnych kropek podczerwieni na twarzy | zrobione 2026-11-01 | poza: siedzi i macha
- [x] 02 | Kluczyk bezkluczykowy w aucie: jak auto wie, że masz go w kieszeni | zrobione 2026-11-02 | poza: wychyla się zza górnej krawędzi
- [x] 42 | Atak na giełdę Binance: jak jeden laptop otworzył drogę do 6,3 mld dolarów | uwaga: temat newsowy (atak 29.10.2026, największa kradzież krypto w historii). Opowiedz, jak się stało: przejęty laptop inżyniera DevOps, z niego dostęp do wewnętrznego kontenera, który mógł zlecać wypłaty, a system Binance sam podpisał przelewy (według Binance klucze prywatne nie wyciekły); na Ethereum atakujący użył EIP-7702, żeby gorący portfel wykonał jego kod; większość środków wyszła w ok. 20 minut na kilku sieciach. FBI przypisało atak Korei Północnej (grupa TraderTraitor). Jak Binance nie podał, jak przejęto laptop, mów to wprost. Zakończenie historii sprawdź świeżo przed nagraniem; stan na 2026-11-02: ok. 3 mld dolarów zamrożone, Binance pokrył ok. 95% strat z własnych funduszy i od 1.11 etapami przywraca wypłaty | zrobione 2026-11-02 | poza: zerka zza boku
- [x] 43 | Smart TV: jak telewizor kilka razy na sekundę sprawdza, co oglądasz | opis: Kąt: odwracamy role, telewizor obserwuje widza. Mocna emocja na starcie, potem spokojne wyjaśnienie mechanizmu krok po kroku i ulga na końcu, że da się to wyłączyć. HAK (do ok. 3 s): lektor „Twój telewizor na Ciebie donosi. Wiesz, komu i jak często?”; obraz z perspektywy telewizora (kamera za ekranem patrzy na ciemny salon i sylwetkę na kanapie), po salonie dwa razy na sekundę przechodzi zimny cyjanowy błysk skanowania; robocik wychyla się zza krawędzi telewizora; nagłówek TWÓJ TELEWIZOR / DONOSI. BEAT 1: „Kilka razy na sekundę łapie klatkę z ekranu i wysyła informacje o niej do producenta. To funkcja ACR, czyli automatyczne rozpoznawanie treści, a włączasz ją sam, gdy przy pierwszym uruchomieniu akceptujesz wszystkie zgody. Działa nawet z obrazem z konsoli albo laptopa podłączonego kablem.” Obraz: szeroki plan salonu z osobą grającą na konsoli, zbliżenie na wtyczkę HDMI i impuls światła biegnący kablem do telewizora; karta z liczbą: Samsung 2 klatki na sekundę; nagłówek FUNKCJA / ACR. BEAT 2 (drugie pytanie): „Ale jak rozpoznaje film, skoro widzi tylko piksele? Dzieli klatkę na siatkę kwadratów, w każdym mierzy jasność i zapisuje to jako krótki ciąg liczb, czyli odcisk palca obrazu.” Obraz: klatka wysuwa się z ekranu, rozpada na kafelki, kafelki zmieniają się w odcienie szarości i zwijają w rząd cyfr; nagłówek SKĄD WIE, / CO LECI?. BEAT 3: „Te odciski lecą paczkami na serwer producenta, a tam są porównywane z ogromną bazą seriali i reklam. Gdy któryś pasuje, w Twoim profilu ląduje wpis, co i o której oglądałeś.” Obraz: przelot z domu przez router nad nocne miasto do serwerowni, karty z odciskami przesuwają się, aż jedna zapala się cyjanem; nagłówek MAMY / TRAFIENIE. BEAT 4: „Z samego odcisku nie da się odtworzyć obrazu, więc hasła z ekranu laptopa nikt z niego nie przeczyta. Historię oglądania producent ma za to bardzo dokładną.” Obraz: na telewizorze okno logowania z zakrytym hasłem, ciąg liczb próbuje złożyć się z powrotem w obraz i wychodzą z niego tylko rozmyte bloki; nagłówek HASŁA / NIE WIDAĆ. BEAT 5 (trzecie pytanie): „Dlaczego tak mu na niej zależy? Producent zarabia na reklamach dopasowanych do tego, co oglądasz, a ponieważ telewizor i telefon są w tej samej domowej sieci, reklama po wieczornym serialu może wyskoczyć Ci też na telefonie.” Obraz: router łączy świetlną linią telewizor i telefon leżący na kanapie, telefon podświetla się reklamą pasującą do serialu (wymyślona marka); nagłówek PO CO / IM TO?. BEAT 6: „Na szczęście możesz to wyłączyć: w ustawieniach prywatności szukaj opcji z informacjami o oglądaniu albo rozpoznawaniem treści i po prostu ją odznacz.” Obraz: zbliżenie na pilota, ogólne menu ustawień bez kopiowania interfejsu konkretnej marki, przełącznik gaśnie; karta z nazwami opcji: Samsung „Usługi informacji o oglądaniu”, LG „Live Plus”; nagłówek MOŻESZ TO / WYŁĄCZYĆ. CTA: „Obserwuj po więcej.” Długość ok. 70 s. Okładka: JAK DZIAŁA / ACR W TV?, ilustracja telewizora, z którego wysypują się kafelki. Przed nagraniem sprawdź w oficjalnych źródłach aktualne nazwy opcji w menu Samsunga i LG oraz częstotliwości (według badania UCL i UC Davis z 2024: Samsung przechwytuje klatkę co 0,5 s i wysyła paczki ok. raz na minutę, LG przechwytuje nawet co 10 ms i wysyła ok. co 15 s). Siatka jasności to uproszczenie metody z patentów ACR, producenci nie ujawniają dokładnego algorytmu, dlatego w lektorze mów ogólnie o odcisku palca obrazu. Pomiń wątek mikrofonu przez Bluetooth (niepotwierdzone twierdzenie jednego badacza z X) i pozwy sądowe (newsy). Nie porównuj do Shazama, to osobny temat (07). | zrobione 2026-11-02 | poza: siedzi i macha
- [ ] 03 | Słuchawki z redukcją szumu: dźwięk, który kasuje dźwięk
- [ ] 04 | Mapy Google: skąd wiedzą o korku, zanim w nim staniesz
- [ ] 05 | Płyta indukcyjna: grzeje garnek, a nie płytę
- [ ] 06 | Bramki w sklepie odzieżowym: jak wiedzą, że ktoś wynosi niezapłaconą bluzę
- [ ] 07 | Shazam: jak rozpoznaje piosenkę po kilku sekundach w głośnym barze
- [ ] 08 | Ekran dotykowy: dlaczego nie działa w rękawiczkach | uwaga: zasada działania ekranu była już w rolce o deszczu, pokaż inny kąt (rękawiczki, rękawiczki dotykowe) albo pomiń
- [ ] 09 | Tryb nocny w aparacie telefonu: wiele zdjęć sklejonych w jedno
- [ ] 10 | Pilot do telewizora: niewidzialne światło, które widać w aparacie telefonu
- [ ] 11 | Ładowarka indukcyjna: prąd przez powietrze
- [ ] 12 | Lodówka: jak wypompowuje ciepło ze środka
- [ ] 13 | Odcinkowy pomiar prędkości: jak liczy średnią prędkość
- [ ] 14 | Poduszka powietrzna: pełne napełnienie w ułamku sekundy
- [ ] 15 | Smartwatch: jak mierzy tętno światłem
- [ ] 16 | Kod QR: dlaczego działa nawet porysowany
- [ ] 17 | Wi-Fi: jak dane przechodzą przez ściany
- [ ] 18 | Robot sprzątający: jak mapuje mieszkanie
- [ ] 19 | Światłowód: internet uwięziony w szklanym włóknie
- [ ] 20 | Powiadomienia push: skąd telefon wie o wiadomości, gdy aplikacja jest zamknięta
- [ ] 21 | Czujnik dymu: jak wyczuwa dym
- [ ] 22 | Bluetooth: jak słuchawki nie gubią się w tłumie innych urządzeń
- [ ] 23 | Tempomat adaptacyjny: radar, który pilnuje odstępu
- [ ] 24 | Czujniki parkowania: ultradźwięki jak u nietoperza
- [ ] 25 | Sygnalizacja świetlna: skąd światła wiedzą, że czekasz
- [ ] 26 | Kasa samoobsługowa: skąd wie, że czegoś nie zeskanowałeś
- [ ] 27 | Termometr bezdotykowy: temperatura z odległości
- [ ] 28 | Szybkie ładowanie telefonu: jak bateria przyjmuje tyle energii naraz
- [ ] 29 | Ekran OLED: dlaczego czerń nie zużywa prądu
- [ ] 30 | Bateria w telefonie: dlaczego z czasem trzyma krócej
- [ ] 31 | Czytnik linii papilarnych: jak telefon widzi Twój palec
- [ ] 32 | Automatyczne drzwi w sklepie: skąd wiedzą, że idziesz
- [ ] 33 | Kod kreskowy: co odczytuje skaner przy kasie
- [ ] 34 | Skaner na lotnisku: jak widzi przez ubrania
- [ ] 35 | Zapalniczka do kuchenki: iskra z kryształu bez baterii
- [ ] 36 | Klimatyzacja: jak chłodzi pokój, wyrzucając ciepło na zewnątrz
- [ ] 37 | Czujnik deszczu w aucie: skąd wycieraczki wiedzą, że pada
- [ ] 38 | Rozmowa w pociągu: jak telefon przeskakuje między masztami
- [ ] 39 | Szyfrowanie w komunikatorze: dlaczego nawet serwer nie przeczyta wiadomości
- [ ] 40 | Netflix: jak film leci płynnie przy słabym internecie
- [ ] 41 | Krokomierz w telefonie: jak liczy kroki bez GPS

## Zrobione poza listą (nie powtarzać)

- [x] Płatność telefonem (NFC) | zrobione przed 2026-10-31 | poza: nieznana
- [x] GPS w nawigacji | zrobione przed 2026-10-31 | poza: nieznana
- [x] Ekran dotykowy w deszczu: dlaczego wariuje i jak działa ekran | zrobione 2026-11-01 (na prośbę, poza nocnym zadaniem) | poza: stoi obok i wskazuje

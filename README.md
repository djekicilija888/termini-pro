# Termini Pro

Ovo je očišćena i složena verzija projekta.

## Brzo pokretanje lokalno

```bash
npm install
npm start
```

Zatim otvori:

```txt
http://localhost:3000
http://localhost:3000/owner.html
```

## Glavni fajlovi

```txt
server.js                  Backend, API rute, baza i autentifikacija
public/owner.html          HTML za panel firme
public/js/owner.js         Glavna logika panela firme, radnici, QR i PDF vizit karte
public/css/styles.css      Osnovni veliki CSS fajl iz stare verzije
public/css/custom.css      Novo mesto za tvoje buduće CSS izmene
public/business.html       Javna stranica za zakazivanje
public/js/business.js      Logika javnog zakazivanja
render.yaml                Render podešavanje
package.json               Node.js zavisnosti i start komanda
```

## Važno za buduće izmene

Za izgled više ne moraš odmah da tražiš po velikom `styles.css` fajlu. Nove izmene stavljaj u:

```txt
public/css/custom.css
```

Taj fajl se učitava posle `styles.css`, pa ima prednost.

Detaljna uputstva su u folderu:

```txt
docs/
```

Najvažnije prvo pročitaj:

```txt
docs/KAKO-MENJATI-PROGRAM.md
docs/STRUKTURA-PROJEKTA.md
docs/STA-JE-UKLONJENO.md
```

## Šta se ne uploaduje na GitHub

Ne uploaduj:

```txt
node_modules/
data/
.env
*.db
```

To je podešeno u `.gitignore` fajlu.

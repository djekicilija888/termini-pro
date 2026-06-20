# Struktura projekta

Cilj ove verzije je da se normalan čovek lakše snađe u projektu.

## Glavni folder

```txt
termini-pro-main-clean/
  public/
  docs/
  server.js
  package.json
  package-lock.json
  render.yaml
  README.md
  .gitignore
```

## Backend

```txt
server.js
```

Ovde su:

- API rute
- SQLite baza
- login i token logika
- firme
- radnici
- termini
- usluge
- lokacije
- superadmin

Ako menjaš čuvanje podataka, prava pristupa, pretplatu ili bazu, to je uglavnom u `server.js`.

## Frontend stranice

```txt
public/index.html          Početna / platforma
public/owner.html          Panel firme
public/business.html       Javna stranica za zakazivanje
public/worker.html         Radnički pristup preko telefona
public/tablet.html         Tablet/radnički ekran
public/manage.html         Pregled/promena termina korisnika
public/superadmin.html     Superadmin
public/pro-check.html      Provera deploy verzije
```

## JavaScript fajlovi

```txt
public/js/owner.js         Panel firme, radnici, PDF vizit karte, QR, termini
public/js/business.js      Javna stranica za zakazivanje
public/js/worker.js        Radnički pristup
public/js/tablet.js        Tablet ekran
public/js/manage.js        Promena/otkazivanje termina
public/js/platform.js      Početna/platforma
public/js/superadmin.js    Superadmin
```

## CSS fajlovi

```txt
public/css/styles.css      Stari glavni CSS, veliki i nasleđen
public/css/custom.css      Novo mesto za buduće izmene
```

`styles.css` ostaje da aplikacija radi kao do sada.

`custom.css` je dodat da nove izmene budu pregledne i da ne moraš stalno da tražiš kroz veliki fajl.

## Dokumentacija

```txt
docs/KAKO-MENJATI-PROGRAM.md
docs/STA-JE-UKLONJENO.md
docs/UPLOAD-I-DEPLOY.md
docs/PERSISTENT-DATA-RENDER.md
```

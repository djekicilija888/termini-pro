# Simple SQLite v50

Ovo je verzija bez PostgreSQL-a.

## Urađeno

- radi bez `DATABASE_URL`
- vraćen SQLite
- uklonjene slike
- uklonjen album
- uklonjen upload
- ostaje Link / QR kod
- ostaje PDF QR list
- ostaju radnici, usluge, termini, radno vreme

## Važno upozorenje

Ova verzija će se lakše deployovati na Render Free, ali lokalna SQLite baza na Render Free nije trajno sigurna.

To znači:

```txt
ako Render restartuje servis ili uradi redeploy,
nalozi i termini opet mogu nestati
```

Ako želiš da podaci sigurno ostaju, mora PostgreSQL ili persistent disk.

## Provera posle deploy-a

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=simple-sqlite-no-images-v50
```

Mora da piše:

```txt
Simple SQLite v50 je aktivna
```

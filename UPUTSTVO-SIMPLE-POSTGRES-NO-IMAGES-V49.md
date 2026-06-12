# Simple PostgreSQL v49

Ovo je jednostavna stabilna verzija za start.

## Uklonjeno

- profilna slika
- naslovna slika
- album
- upload slika
- storage problem za slike
- Cloudinary/S3 potreba za početak
- paketi/planovi iz owner panela

## Ostaje

- PostgreSQL baza
- registracija firmi
- owner panel
- superadmin panel
- radnici
- usluge
- radno vreme
- blokirani datumi
- zakazivanje termina
- najbliži termini
- Link / QR kod
- štampanje PDF lista sa QR kodovima

## Ideja za vlasnika firme

Vlasnik slike drži na:

```txt
Instagram
Facebook
TikTok
Google Business
svoj sajt
```

U tvojoj aplikaciji koristi samo link za zakazivanje termina.

## Render

Potrebno je:

```txt
DATABASE_URL=postgresql://...
PGSSL=true
```

## Provera

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=simple-postgres-no-images-v49
```

Mora da piše:

```txt
Simple PostgreSQL v49 je aktivna
```

# Termini Platforma

Ovo je multi-firma verzija sistema za zakazivanje termina.

## Šta ima

- Više salona/majstora/firmi u jednoj aplikaciji
- Svaka firma dobija svoj javni link za zakazivanje: `/b/ime-firme`
- Registracija firme
- Login za vlasnika firme
- Owner admin panel
- Usluge po firmi
- Radno vreme po firmi
- Termini po firmi
- Javno zakazivanje bez login-a za mušterije
- Superadmin panel za vlasnika platforme
- SQLite baza za probu
- Spremno za Render deploy

## Pokretanje lokalno

```bash
npm install
copy .env.example .env
npm start
```

Na PowerShell-u:

```powershell
Copy-Item .env.example .env
npm start
```

Otvori:

```txt
http://localhost:3000
```

Owner panel:

```txt
http://localhost:3000/owner.html
```

Superadmin panel:

```txt
http://localhost:3000/superadmin.html
```

Podrazumevani superadmin:

```txt
Email: admin@platform.local
Lozinka: platform123
```

Za javni sajt promeni `SUPERADMIN_PASSWORD` na Render-u.

## Kako radi

1. Firma se registruje.
2. Sistem pravi slug/link.
3. Firma dobije link npr. `/b/salon-marija`.
4. Firma dodaje usluge i radno vreme.
5. Mušterije preko linka zakazuju termin.
6. Firma vidi termine u svom panelu.

## Važno za produkciju

Za pravi biznis kasnije pređi sa SQLite na PostgreSQL, dodaj email/SMS potvrde, naplatu pretplate, backup baze i politiku privatnosti.

# Termini Pro

Ozbiljnija početna verzija sajta/aplikacije za zakazivanje termina.

## Šta ova verzija ima

- Lepša korisnička stranica za zakazivanje
- Admin login
- Admin dashboard
- Pregled termina
- Promena statusa termina: zakazan, završen, otkazan, nije došao
- Dodavanje, izmena i gašenje usluga
- Podešavanje radnog vremena
- Blokiranje neradnih datuma
- Provera zauzetih termina
- Zaštita admin ruta preko JWT tokena
- Hashovanje admin lozinke
- SQLite baza
- PWA fajlovi za instalaciju na Android
- Mesto za kasniju SMS/Viber integraciju

## Instalacija

Prvo instaliraj Node.js LTS.

Zatim raspakuj projekat i u terminalu uđi u folder:

```bash
cd termini-pro
npm install
copy .env.example .env
npm start
```

Na PowerShell-u umesto `copy` možeš:

```powershell
Copy-Item .env.example .env
```

Otvori u browseru:

```txt
http://localhost:3000
```

Admin panel:

```txt
http://localhost:3000/admin.html
```

Podrazumevani admin login je:

```txt
Email: admin@termini.local
Lozinka: admin123
```

Promeni ovo u `.env` fajlu pre stvarne upotrebe.

## Važno

Ovo je ozbiljnija osnova, ali nije još finalna produkciona aplikacija za klijente.

Pre pravog puštanja na internet treba dodati:

- HTTPS domen
- pravu bazu kao PostgreSQL
- backup baze
- potvrdu broja telefona
- SMS/Viber provajdera
- politiku privatnosti
- zaštitu od spam zakazivanja
- profesionalni deploy

## Gde se ubacuje SMS/Viber

U fajlu `server.js` postoji funkcija:

```js
sendCustomerNotification()
```

Tu se kasnije povezuje Twilio, Infobip ili Viber Business API.

## Radno vreme

Podrazumevano:

- ponedeljak-petak: 09:00-17:00
- subota: 09:00-14:00
- nedelja: zatvoreno

Menja se u admin panelu.

# OBAVEZNO: PostgreSQL verzija

Ova verzija više ne koristi SQLite za korisničke naloge, firme, usluge, radnike i termine.

Sada koristi PostgreSQL preko environment variable:

```txt
DATABASE_URL
```

## Šta ovo rešava

Posle novog deploy-a više neće nestajati:

```txt
korisnički nalozi
firme
radnici
usluge
termini
podešavanja
```

## Šta moraš da uradiš na Render-u

1. Napravi PostgreSQL bazu na Render-u.
2. U toj bazi kopiraj Internal Database URL ako je web servis takođe na Render-u.
3. Otvori svoj Web Service.
4. Idi na Environment.
5. Dodaj:

```txt
DATABASE_URL=postgresql://...
PGSSL=true
```

6. Deployuj ovu verziju.

## Važno za slike

PostgreSQL čuva podatke, ali uploadovane slike su fajlovi.

Za slike postoje 2 dobra rešenja:

```txt
1. Render Disk za /var/data/uploads
2. Cloudinary/S3 kao ozbiljnije rešenje
```

Ova verzija i dalje podržava:

```txt
UPLOAD_DIR=/var/data/uploads
```

Ako nemaš Render Disk ili Cloudinary, slike mogu nestati posle redeploy-a, ali korisnički nalozi i termini neće nestati jer su u PostgreSQL bazi.

## Ako si već imao korisnike u SQLite bazi

Ako je stara SQLite baza već obrisana na Render-u, ti korisnici se ne mogu automatski vratiti.
Ako još postoji stari `.db` fajl, može se napraviti posebna migracija iz SQLite u PostgreSQL.

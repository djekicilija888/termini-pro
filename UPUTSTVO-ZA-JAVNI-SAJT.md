# Kako da Termini Pro bude javni sajt

Ovo je najlakši put preko Render hostinga.

## Šta ćeš dobiti

Javni link u obliku:

```txt
https://termini-pro.onrender.com
```

Taj link možeš poslati bilo kome.

## 1. Napravi GitHub nalog

Idi na:

```txt
https://github.com
```

Napravi nalog ako ga nemaš.

## 2. Napravi novi repository

Na GitHub-u klikni:

```txt
New repository
```

Naziv može biti:

```txt
termini-pro
```

Izaberi:

```txt
Public
```

Klikni:

```txt
Create repository
```

## 3. Ubaci fajlove sajta na GitHub

Raspakuj ovaj ZIP.

Na GitHub repository stranici klikni:

```txt
uploading an existing file
```

Prevuci sve fajlove iz foldera `termini-pro-online`.

Važno: prevuci sadržaj foldera, ne sam ZIP.

Treba da se vide fajlovi kao:

```txt
server.js
package.json
render.yaml
public
```

Na dnu klikni:

```txt
Commit changes
```

## 4. Napravi Render nalog

Idi na:

```txt
https://render.com
```

Napravi nalog i poveži GitHub.

## 5. Deploy preko Blueprint opcije

U Render-u klikni:

```txt
New
Blueprint
```

Izaberi GitHub repo:

```txt
termini-pro
```

Render će pronaći fajl:

```txt
render.yaml
```

Klikni deploy/apply.

Kada pita za `ADMIN_PASSWORD`, unesi svoju admin lozinku, na primer:

```txt
MojaJakaSifra123!
```

Nemoj koristiti `admin123` za javni sajt.

## 6. Sačekaj da se deploy završi

Render će instalirati pakete i pokrenuti server.

Kada se završi, dobićeš link kao:

```txt
https://termini-pro.onrender.com
```

Otvori taj link.

Admin panel će biti:

```txt
https://termini-pro.onrender.com/admin.html
```

## 7. Admin login

Email je podrazumevano:

```txt
admin@termini.local
```

Lozinka je ona koju si uneo kao `ADMIN_PASSWORD` na Render-u.

## Važno za bazu

Ova verzija koristi SQLite bazu.

U `render.yaml` je dodat persistent disk i `DB_PATH=/var/data/termini-pro.db`, da baza ostane sačuvana na hostingu.

Za ozbiljan biznis kasnije je bolje preći na PostgreSQL.

## Ako nešto ne radi

Najčešći problemi:

### Build failed

Proveri da li si uploadovao `package.json`.

### Sajt se otvara, ali admin login ne radi

Proveri Render Environment Variables:

```txt
ADMIN_EMAIL
ADMIN_PASSWORD
JWT_SECRET
```

### Termini nestanu posle restarta

Proveri da li postoji disk i da li je:

```txt
DB_PATH=/var/data/termini-pro.db
```

### Render traži karticu ili plan

Za ozbiljnu bazu/persistent disk hosting često može tražiti plaćeni plan. Za test možeš deploy bez diska, ali tada termini nisu sigurni za čuvanje posle redeploy-a.

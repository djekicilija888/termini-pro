# OBAVEZNO: zašto su nalozi nestajali

Problem nije u owner panelu, nego u bazi.

Do sada je SQLite baza bila lokalni fajl u aplikaciji. Kada se na Render-u uradi novi deploy, Render pravi novu verziju aplikacije i lokalni fajlovi koji su nastali tokom rada mogu da nestanu. Zato nestanu korisnički nalozi, firme, termini i slike.

## Rešenje u ovoj verziji

Ova verzija koristi trajnu putanju za podatke:

```txt
DATA_DIR=/var/data
DB_PATH=/var/data/termini-platforma-pro.db
UPLOAD_DIR=/var/data/uploads
```

To radi samo ako na Render servisu dodaš Persistent Disk na putanju:

```txt
/var/data
```

## Važno

Render Free web service nema trajno čuvanje lokalnih fajlova. Za trajne naloge moraš koristiti:

```txt
Opcija 1: Render paid web service + Persistent Disk
Opcija 2: PostgreSQL baza
```

Za tvoju trenutnu SQLite aplikaciju najbrži popravak je:

```txt
Render paid service + Persistent Disk /var/data
```

## Šta uraditi na Render-u

1. Otvori svoj Web Service na Render-u.
2. Idi na Settings.
3. Dodaj Disk.
4. Mount path stavi:

```txt
/var/data
```

5. U Environment dodaj:

```txt
DATA_DIR=/var/data
DB_PATH=/var/data/termini-platforma-pro.db
UPLOAD_DIR=/var/data/uploads
```

6. Deployuj ovu verziju.

Od tog trenutka novi nalozi neće nestajati posle update-a.

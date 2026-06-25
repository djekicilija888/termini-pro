# Šta je uklonjeno ili premešteno

## Uklonjeno

```txt
owner.js
```

Ovo je bio JavaScript fajl u glavnom folderu projekta.

Aplikacija ga ne koristi, jer server javno servira fajlove iz foldera:

```txt
public/
```

Pravi fajl koji se koristi u panelu firme je:

```txt
public/js/owner.js
```

Zato je root `owner.js` uklonjen da te ne zbunjuje i da ne menjaš pogrešan fajl.

## Premešteno u docs

Ovi fajlovi nisu potrebni za rad aplikacije, ali jesu korisna dokumentacija:

```txt
OBAVEZNO-PERSISTENT-DATA-V47.md  -> docs/PERSISTENT-DATA-RENDER.md
OBAVEZNO-PROCITAJ-PRE-UPLOADA.md -> docs/UPLOAD-I-DEPLOY.md
```

## Dodato

```txt
.gitignore
```

Da GitHub ne uploaduje `node_modules`, lokalnu bazu, `.env` i logove.

```txt
public/css/custom.css
```

Novo čisto mesto za buduće CSS izmene.

```txt
docs/KAKO-MENJATI-PROGRAM.md
docs/STRUKTURA-PROJEKTA.md
docs/STA-JE-UKLONJENO.md
```

Uputstva za snalaženje u projektu.

## Šta nije dirano

Nisam brisao stranice i JS fajlove iz `public/`, jer su povezani sa funkcijama aplikacije:

- panel firme
- javno zakazivanje
- radnički pristup
- tablet ekran
- superadmin
- promena/otkazivanje termina
- deploy provera

Bolje je ne brisati te delove dok se detaljno ne testira svaka funkcija.

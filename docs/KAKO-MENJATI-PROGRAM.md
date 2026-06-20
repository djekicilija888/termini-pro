# Kako menjati program

## Najvažnije pravilo

```txt
HTML = šta postoji na stranici
CSS = kako izgleda
JavaScript = šta se dešava kad klikneš
server.js = čuvanje podataka, baza i API
```

## Gde menjam izgled?

Nove CSS izmene stavljaj u:

```txt
public/css/custom.css
```

Ne moraš odmah da menjaš veliki `styles.css`.

Primer za checkbox u popupu Radnici:

```css
.staff-modal-form-v145 #staffActive,
.staff-modal-form-v145 #staffWorkerAccess{
  width:24px !important;
  height:24px !important;
  min-height:24px !important;
}
```

## Gde menjam popup Radnici?

HTML:

```txt
public/owner.html
```

Traži:

```txt
staffModal
staffForm
staffActive
staffWorkerAccess
```

JavaScript:

```txt
public/js/owner.js
```

Traži:

```txt
openStaffModal
closeStaffModal
staffForm.onsubmit
loadStaff
deleteStaff
```

CSS:

```txt
public/css/custom.css
```

Za nove izmene koristi komentar:

```css
/* RADNICI - POPUP */
```

## Gde menjam PDF vizit karte?

PDF vizit karte se ne menjaju u CSS-u.

Fajl:

```txt
public/js/owner.js
```

Traži:

```txt
printQrPdfList
```

Unutar toga traži:

```txt
makePdf
```

Tu su dimenzije kartica, QR kod, tekst i raspored.

Najbitnije vrednosti:

```js
const ptPerMm = 72 / 25.4;
const pageW = 210 * ptPerMm;
const pageH = 297 * ptPerMm;
const cardW = 85 * ptPerMm;
const cardH = 55 * ptPerMm;
const gutterX = 0;
const gutterY = 0;
```

`cardW` je širina vizit karte.

`cardH` je visina vizit karte.

`gutterX` i `gutterY` su razmaci između kartica. Ako su `0`, kartice su spojene za sečenje.

## Gde menjam javno zakazivanje?

HTML:

```txt
public/business.html
```

JavaScript:

```txt
public/js/business.js
```

## Gde menjam radnički pristup?

HTML:

```txt
public/worker.html
```

JavaScript:

```txt
public/js/worker.js
```

## Gde menjam tablet ekran?

HTML:

```txt
public/tablet.html
```

JavaScript:

```txt
public/js/tablet.js
```

## Gde menjam bazu ili API?

Fajl:

```txt
server.js
```

Za radnike traži:

```txt
/api/owner/staff
```

Za termine traži:

```txt
appointments
```

Za usluge traži:

```txt
services
```

Za lokacije traži:

```txt
locations
```

## Provera posle izmene

Ako menjaš HTML/CSS/JS u `public/`:

```txt
Ctrl + S
Ctrl + F5 u browseru
```

Ako menjaš `server.js`:

```bash
Ctrl + C
npm start
```

Provera sintakse:

```bash
node --check server.js
node --check public/js/owner.js
```

## GitHub upload

Ne uploaduj:

```txt
node_modules/
data/
.env
*.db
```

To je već podešeno u `.gitignore`.

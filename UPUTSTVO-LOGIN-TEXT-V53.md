# V89 - Desktop PDF isti kao Android

Ispravljeno generisanje PDF-a u desktop verziji.

## Šta je promenjeno
- Desktop QR PDF koristi isti A4 raspored kao Android: 3 kolone x 4 reda kartica.
- QR se više ne ubacuje kao PNG bajtovi u PDF stream.
- QR se konvertuje u raw crno-beli DeviceRGB image stream, kao bitmap koju Android crta u `PdfDocument`.
- PDF sada treba normalno da se otvara i štampa u desktop PDF čitačima.
- Vraćeni su srpski karakteri u tekstu PDF-a preko PDF font encoding mape.

## Fajl koji je izmenjen
- `public/js/owner.js`

## Test
Uloguj se kao vlasnik firme, otvori tab za link/QR i klikni dugme za PDF QR kartice.
Treba da dobiješ PDF kao na Androidu: jedan A4 list sa 12 kartica za sečenje.

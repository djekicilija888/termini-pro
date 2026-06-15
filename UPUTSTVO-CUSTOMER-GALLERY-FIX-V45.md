# Android Registration Only v56

Urađeno:

- glavna web/desktop strana više nema registracionu formu
- web/desktop ima samo prijavu
- dodata poruka da se registracija firme radi kroz Android aplikaciju
- stari web endpoint za registraciju je blokiran
- dodat endpoint za Android registraciju:

```txt
POST /api/android/register-business
```

- Google Play dozvole iz prethodne verzije ostaju
- dodatna firma ostaje zaključana dok email nema Google Play dozvolu

## Kako radi model

1. Korisnik instalira Android aplikaciju.
2. Firma se registruje kroz Android aplikaciju.
3. Ako je prva firma, sistem može dozvoliti registraciju.
4. Ako korisnik hoće dodatnu firmu, Android aplikacija pokreće Google Play kupovinu.
5. Server čuva dozvolu za taj email.
6. Posle toga isti email može da se koristi na desktopu.

## Provera posle deploy-a

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=android-registration-only-v56
```

Mora da piše:

```txt
Android Registration Only v56 je aktivna
```

# Same Text verzija

Ova verzija popravlja problem da Android i desktop ne prikazuju isti tekst.

## Šta je urađeno

- Desktop i Android sada koriste isti HTML tekst.
- Nema posebnog mobilnog teksta.
- Nema sekcija koje se kriju na telefonu.
- Raspored je isti: uvod, forma, usluge.
- CSS i JS imaju novu verziju: `same-text-v1`.
- Service worker briše stari keš.

## Posle upload-a

Otvori link ovako:

```txt
https://termini-pro-2qyt.onrender.com/?v=same-text-v1
```

Ako Android i dalje prikazuje staro, očisti podatke sajta u Chrome-u:

```txt
Chrome → Settings → Site settings → All sites → termini-pro-2qyt.onrender.com → Clear & reset
```

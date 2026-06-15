# Owner No Registration Test v81

Promenjeno je samo za testiranje na Render Free:

- na login strani dodato je dugme `Uđi bez registracije`
- ako je baza prazna posle deploy-a, server automatski napravi test firmu i vlasnika
- korisnik ulazi direktno u owner panel
- ovo je privremeno i kasnije se lako uklanja da opet ne može da se uđe bez registracije

## Provera posle deploy-a

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=owner-no-registration-test-v81
```

Mora da piše:

```txt
Owner No Registration Test v81 je aktivna
```

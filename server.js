# OBAVEZNO: kako da znaš da je prava verzija ubačena

Ova verzija ima oznaku:

```txt
PRO v2 VIDLjIVO
```

Videćeš je gore na stranici ako je deploy uspeo.

## Najvažnije

Na GitHub-u u glavnom folderu repozitorijuma moraš da vidiš direktno:

```txt
package.json
server.js
render.yaml
public
```

Ako na GitHub-u vidiš samo jedan folder, npr:

```txt
termini-platforma-pro-v2-root
```

onda nije dobro uploadovano. Render tada i dalje koristi staru verziju.

## Kako uploadovati

1. Raspakuj ZIP.
2. Uđi unutra u raspakovani folder.
3. Selektuj fajlove i foldere unutra:
   - package.json
   - server.js
   - render.yaml
   - public
   - ostale fajlove
4. To prevuci na GitHub upload.
5. Klikni Commit changes.
6. Sačekaj Render deploy.

## Provera posle deploy-a

Otvori:

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=pro-v2-vidljivo
```

Ako vidiš tekst `PRO v2 je aktivna`, onda je nova verzija stvarno na serveru.

Ako ne vidiš, nije prošao upload/deploy.

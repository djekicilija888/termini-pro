# Upload Facebook v42

Dodato:

- profilna slika firme kao na Facebook-u
- naslovna slika firme kao na Facebook-u
- upload slike sa desktopa ili telefona
- album slika sa upload-om fajlova
- uklonjen URL unos za slike iz owner panela

## Gde je upload?

Owner panel → `Album/slike`

Tamo vlasnik može da izabere sliku sa telefona ili računara.

## Provera posle deploy-a

Otvori:

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=upload-facebook-v42
```

Mora da piše:

```txt
Upload Facebook v42 je aktivna
```

## Važno za produkciju

Ova verzija čuva slike u `public/uploads` na serveru. Za pravi ozbiljan SaaS treba kasnije prebaciti slike na Cloudinary, S3 ili drugi cloud storage, jer Render free disk nije trajno siguran.

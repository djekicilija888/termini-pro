# One Account Play Ready v55

Urađeno:

- jedan email može napraviti samo jednu besplatnu firmu
- ako korisnik pokuša drugu firmu sa istim emailom, dobija poruku da treba Google Play otključavanje
- dodata tabela `google_play_entitlements`
- dodat API koji Android aplikacija kasnije koristi da pošalje Google Play `purchaseToken`
- kad je email otključan, isti nalog/isti email može koristiti dodatnu firmu i preko desktopa

## Važno

Ovo je web/backend priprema.

Prava Google Play kupovina zahteva Android aplikaciju koja:
1. pokrene Google Play Billing
2. dobije purchaseToken
3. pošalje purchaseToken serveru
4. server proveri kupovinu
5. server otključa dodatnu firmu

Za sada server ne otključava automatski kupovinu bez verifikacije.

## Endpointi

Status:

```txt
GET /api/google-play/status?email=email@example.com
```

Android potvrda kupovine:

```txt
POST /api/google-play/confirm
```

Body:

```json
{
  "email": "email@example.com",
  "purchase_token": "TOKEN",
  "product_id": "extra_business_1",
  "order_id": "GPA..."
}
```

Superadmin ručno otključavanje nakon provere:

```txt
POST /api/superadmin/google-play/entitlement
```

Body:

```json
{
  "email": "email@example.com",
  "allowed_businesses": 2
}
```

## Provera posle deploy-a

```txt
https://tvoj-render-link.onrender.com/pro-check.html?v=one-account-play-ready-v55
```

Mora da piše:

```txt
One Account Play Ready v55 je aktivna
```

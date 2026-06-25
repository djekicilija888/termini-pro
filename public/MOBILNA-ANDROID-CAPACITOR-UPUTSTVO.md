# Termini Pro - Android preko Capacitor-a

Ova verzija projekta je pripremljena da isti web kod radi:

- kao desktop/web aplikacija na Render-u
- kao Android aplikacija preko Capacitor-a

## Najvažnije

Backend ostaje `server.js` na Render-u. Android aplikacija u sebi nosi HTML/CSS/JS iz foldera `public`, ali API pozive šalje na Render.

Podrazumevani Render backend je podešen u:

```txt
public/js/capacitor-runtime.js
```

Trenutno stoji:

```js
var DEFAULT_API_BASE = 'https://termini-platforma.onrender.com';
```

Ako tvoj pravi Render link nije taj, promeni tu liniju, na primer:

```js
var DEFAULT_API_BASE = 'https://tvoj-pravi-link.onrender.com';
```

## Prvi setup na Windows-u

1. Instaliraj Node.js.
2. Instaliraj Android Studio.
3. Otvori ovaj folder projekta.
4. Dvaput klikni:

```txt
scripts/setup-capacitor-android.bat
```

Skripta će uraditi:

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

## Ručno u terminalu

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Ako je `android` folder već napravljen, posle izmena koristi samo:

```bash
npx cap sync android
npx cap open android
```

## Kako se kasnije ažurira

### Promeniš backend / bazu / server.js

Ne moraš da diraš Capacitor. Samo deploy na Render.

### Promeniš HTML/CSS/JS koji je spakovan u aplikaciju

Moraš:

```bash
npx cap sync android
```

Zatim u Android Studio napraviš novi AAB/APK i objaviš update na Google Play.

### Google zahteva nov Android SDK / Gradle / targetSdk

Tada se dira Android/Capacitor deo, ali obično ne moraš da menjaš logiku termina.

## Bitni fajlovi koje sam dodao

```txt
capacitor.config.json
public/js/capacitor-runtime.js
scripts/setup-capacitor-android.bat
scripts/setup-capacitor-android.sh
MOBILNA-ANDROID-CAPACITOR-UPUTSTVO.md
```

## Napomena

`android` folder nije ručno ubačen u ZIP, jer ga treba generisati na tvom računaru preko `npx cap add android`. Tako će Android Studio dobiti ispravne Gradle fajlove za verziju Capacitor-a koju npm instalira.

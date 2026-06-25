@echo off
setlocal
cd /d "%~dp0\.."
echo Instaliram Node pakete...
call npm install
if errorlevel 1 goto err

echo Dodajem Android platformu ako ne postoji...
if not exist android (
  call npx cap add android
  if errorlevel 1 goto err
) else (
  echo Android folder vec postoji, preskacem cap add.
)

echo Sinhronizujem web fajlove sa Android projektom...
call npx cap sync android
if errorlevel 1 goto err

echo Otvaram Android Studio...
call npx cap open android
if errorlevel 1 goto err

echo Gotovo.
goto end
:err
echo.
echo Doslo je do greske. Proveri da li su instalirani Node.js, Java JDK i Android Studio.
:end
pause

#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "Instaliram Node pakete..."
npm install
if [ ! -d android ]; then
  echo "Dodajem Android platformu..."
  npx cap add android
else
  echo "Android folder vec postoji, preskacem cap add."
fi
echo "Sinhronizujem web fajlove sa Android projektom..."
npx cap sync android
echo "Otvaram Android Studio..."
npx cap open android

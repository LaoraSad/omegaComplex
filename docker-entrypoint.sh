#!/bin/sh
set -e

# Corre migraciones y seed antes de arrancar Next. Si la BD no está lista,
# reintenta unas cuantas veces: en un VPS la red puede tardar un momento.
echo "→ Esperando base de datos..."
for i in $(seq 1 30); do
  if npx prisma migrate deploy; then
    break
  fi
  echo "  reintento $i/30…"
  sleep 2
done

echo "→ Poblando datos iniciales…"
npx prisma db seed || echo "  (el seed ya estaba aplicado o falló: continuando)"

echo "→ Arrancando Omega Complex en :3000"
exec node server.js
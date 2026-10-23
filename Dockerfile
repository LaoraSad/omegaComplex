# -----------------------------------------------------------------------------
# Dockerfile de producción de Omega Complex.
# Estrategia multistage (4 etapas) para optimizar tamaño y tiempo de build.
#
# Etapas:
#   1. deps:       instala dependencias con npm ci (respeta package-lock.json).
#   2. migrator:   prisma generate + código, SIN next build. Sirve al servicio
#                  `migrate` de docker-compose para correr migraciones y seed.
#   3. builder:    next build con variables NEXT_PUBLIC_* incrustadas.
#   4. runner:     imagen final ligera (standalone), usuario no privilegiado.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Etapa 1: deps
# Instala todas las dependencias de producción y desarrollo necesarias para
# las etapas posteriores. Usa npm ci para respetar exactamente el lockfile.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Etapa 2: migrator
# Copia dependencias y código, ejecuta `npx prisma generate` para generar el
# cliente Prisma y los tipos TypeScript. No ejecuta `next build` para no
# duplicar tiempo en el VPS.
#
# DATABASE_URL es un placeholder: en build no se conecta a nada, solo se
# necesita para que Prisma cargue la configuración y genere los tipos.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Etapa 3: builder
# Ejecuta `next build`. Las variables NEXT_PUBLIC_* se incrustan en el build
# de Next.js, por lo que se pasan como --build-arg (ver docker-compose.yml).
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* se incrusta en `next build`, no vale solo con el .env de
# runtime. Se pasan como --build-arg (ver docker-compose.yml).
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
COPY --from=migrator /app/node_modules ./node_modules
COPY --from=migrator /app ./
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -----------------------------------------------------------------------------
# Etapa 4: runner
# Imagen final de producción. Solo lleva lo necesario para servir la app:
#   - Carpeta public.
#   - .next/standalone (output de Next.js con servidor propio).
#   - .next/static (archivos estáticos).
#
# Corre como usuario no privilegiado `nextjs` (seguridad).
# Expone el puerto 3000.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

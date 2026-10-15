# Imagen de producción de Omega Complex.
#
# Tres etapas. La clave de este Dockerfile es que las MIGRACIONES no se
# ejecutan desde la imagen final: la imagen de standalone de Next solo lleva
# lo mínimo para servir y no incluye el CLI de Prisma ni la carpeta prisma/.
# Por eso las migraciones viven en un servicio aparte (ver docker-compose.yml),
# construido sobre la etapa `builder`, que sí tiene todo.

# ---------------------------------------------------------------------------
# deps: dependencias completas, lockfile respetado
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: prisma generate + next build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* se incrusta en `next build`, no vale solo con el .env de
# runtime. Se pasan como --build-arg (ver docker-compose.yml).
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client se genera en build: sin este paso los tipos del schema no
# existen y `next build` falla con "has no exported member".
# DATABASE_URL es un placeholder: en build no se conecta a nada, solo se
# necesita para que prisma.config.ts cargue y el generador produzca los tipos.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# runner: solo la app. Corre como usuario no privilegiado.
# ---------------------------------------------------------------------------
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
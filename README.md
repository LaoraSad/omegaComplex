# Omega Complex

Aplicación Omega Complex construida con Next.js App Router, TypeScript y Prisma (PostgreSQL).

## Desarrollo local

```bash
npm install
cp .env.example .env
# Ajusta DATABASE_URL y JWT_SECRET en .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

La API es interna de Next.js y vive en el mismo origen bajo `/api/...`
(`src/app/api`). El cliente HTTP está aislado en `src/lib/api/auth.ts` y envía
las cookies de sesión (`credentials: "include"`). No se requiere backend externo
ni `NEXT_PUBLIC_API_URL`.

## Autenticación

Páginas: `/login`, `/register`, `/verify-email`, `/forgot-password` y
`/reset-password`. Endpoints: `/api/auth/login`, `/api/auth/register`,
`/api/auth/logout`. La sesión es un JWT firmado (`JWT_SECRET`) guardado en
cookie `HttpOnly` (`session`, 7 días).

- El registro crea `User` + `Customer` (documento único, fecha de nacimiento)
  en una transacción, normaliza el correo (trim + minúsculas) y deja la sesión
  activa de inmediato (redirige a `/piscinas/inicio`).
- El login redirige por rol (`admin` → `/dashboard`, `employee` → `/validar`,
  `user` → `/piscinas/inicio`) y respeta `?next=` para volver a la ruta pedida.
- El `middleware` exige sesión en `/dashboard`, `/reservas` y `/validar`;
  `/dashboard` es solo `admin` y `/validar` es `admin`/`employee`.
- `/api/auth/forgot-password`, `/reset-password` y `/resend-verification`
  responden `501 NOT_IMPLEMENTED` hasta contar con proveedor de correo
  (`src/shared/lib/mailer.ts`). La verificación de correo no bloquea el acceso.
- El inicio de sesión con Google no está habilitado (sin proveedor OAuth).

## Validación

```bash
npm run lint
npm run build
```

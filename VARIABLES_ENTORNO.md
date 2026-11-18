# Variables de entorno — Omega Complex

**Fecha:** 2026-11-18
**Arquitectura:** Next.js 16 (App Router, `output: standalone`) + Prisma + PostgreSQL/Supabase + Stripe + Resend/n8n.

## Cómo se cargan

- Next.js carga `.env` automáticamente en desarrollo y en `next start`; en Docker se inyectan con `env_file: .env` (`docker-compose.yml:10`).
- Las variables `NEXT_PUBLIC_*` se **inlinean en build** y quedan visibles en el cliente.
- El acceso centralizado está en `src/shared/lib/env.ts`: los getters `required()` fallan en producción si falta el valor; `always()` falla **siempre** (es el caso de `JWT_SECRET`).
- El repo versiona `.env.example`; `.env` está en `.gitignore`.

## Variables requeridas

| Variable | ¿Obligatoria? | Ejemplo | Uso / evidencia |
|---|---|---|---|
| `DATABASE_URL` | **Sí en runtime** | `postgresql://user:pass@host:5432/db?schema=public&connection_limit=5&pool_timeout=20` | Prisma y `env.ts`. En Docker **no puede ser `127.0.0.1`**: usa el host de la BD (`db`, Supabase o `host.docker.internal`). |
| `JWT_SECRET` | **Sí, siempre** | cadena aleatoria ≥32 caracteres | Firma de sesión (`env.ts`, `always()`). Si falta, la app falla incluso en desarrollo. |
| `NEXT_PUBLIC_APP_URL` | **Sí en producción** | `https://omegacomplex.example.com` | Enlaces de correos, redirects OAuth y validación HTTPS en producción (`lib/email/resend.ts:26-38`). |
| `STRIPE_SECRET_KEY` | **Sí** para pagos | `sk_test_...` | Cliente Stripe (`shared/lib/stripe.ts`). |
| `STRIPE_WEBHOOK_SECRET` | **Sí** para webhook | `whsec_...` | Verificación de firma (`api/payments/webhook/route.ts:40`). |
| `RESEND_API_KEY` | **Sí** si se usa Resend | `re_...` | Envío de correos y QR (`lib/email/resend.ts:15`). |
| `RESEND_FROM_EMAIL` | No (Sí para correo real) | `noreply@omegacomplex.com` | Remitente; debe pertenecer al dominio verificado en Resend (`resend.ts:21-27`). |
| `CRON_SECRET` | **Sí** para el cron | cadena larga | Protege `/api/cron/holds`; sin él responde 500 (`api/cron/holds/route.ts:12-20`). |
| `ADMIN_EMAIL` | Solo seed | `admin@omegacomplex.com` | Crea el admin inicial (`prisma/seed.ts:49`). |
| `ADMIN_PASSWORD` | Solo seed | contraseña fuerte | Contraseña del admin inicial (`prisma/seed.ts:50`). **Cambiar el default `admin123456`.** |

## Variables opcionales / condicionales

| Variable | ¿Obligatoria? | Ejemplo | Uso |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | No (Sí si se usa Google) | `xxxx.apps.googleusercontent.com` | OAuth; si falta, el login con Google se deshabilita (`features/auth/oauth.helpers.ts:11`). |
| `GOOGLE_CLIENT_SECRET` | No (Sí si se usa Google) | secreto | Igual que arriba. |
| `N8N_WEBHOOK_URL` | No (alternativa a Resend) | `https://n8n.example.com/webhook/...` | Integración n8n (`shared/lib/env.ts:39-44`). |
| `N8N_WEBHOOK_SECRET` | No (si se usa n8n, **Sí**) | secreto compartido | Firma HMAC de n8n. |
| `NODE_ENV` | No | `development` / `production` | `development` activa los fallbacks; en `production` los getters `required()` lanzan si falta una clave (`shared/lib/env.ts:8-11`). Compose la fija en `production`. |
| `CI` | No | `true` | La define el runner; los tests la leen. No se configura a mano. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | `pk_test_...` | Declarada en `.env.example`, **no se usa en el código actual**. |
| `VERIFICATION_CODE_TTL_MINUTES` | No | `15` | Declarada en `.env.example`, **no referenciada en el código** (la TTL está en código/servicio). |
| `VERIFICATION_CODE_LENGTH` | No | `6` | Igual: declarada pero sin uso. |
| `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD` / `QA_EMPLOYEE_PASSWORD` | No | — | Solo para scripts manuales de QA; la app no las usa. |

## Solo para Docker / despliegue

| Variable | Uso |
|---|---|
| `PUERTO_APP` | Puerto publicado en el host (`docker-compose.yml`), por defecto `3000`. |
| `PORT` / `HOSTNAME` | Fijados por Compose en `3000` / `0.0.0.0`. |
| `DATABASE_URL_DOCKER` | Opcional: sobrescribe `DATABASE_URL` solo dentro de Compose. Por defecto apunta al servicio `db` (`db:5432`); úsala para Supabase u otra BD externa. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Opcionales: credenciales del PostgreSQL interno de Compose (por defecto `omega`/`omega`/`omega`). |

`docker compose` además exige que exista el archivo `.env` (lo inyecta con `env_file`, `docker-compose.yml:10`); sin él el contenedor arranca sin `DATABASE_URL` ni `JWT_SECRET` y falla.

## Secretos de CI/CD (GitHub Actions)

`omega-ci-validate` solo necesita las dos variables dummy que ya declara el workflow (`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`). El job de despliegue (`omega-cd-deploy`) requiere estos **secrets del repositorio**:

| Secret | Uso |
|---|---|
| `VPS_HOST` | IP o dominio del servidor. |
| `VPS_USERNAME` | Usuario SSH. |
| `VPS_SSH_KEY` | Clave privada SSH. |
| `VPS_PORT` | Puerto SSH. |
| `VPS_PROJECT_PATH` | Ruta absoluta del proyecto en la VPS (donde vive el `.env` real). |
| `VPS_PM2_NAME` | Nombre del proceso en PM2 que se recarga. |

El `.env` de producción **no** viaja en el repo ni en los secrets: debe existir ya en `VPS_PROJECT_PATH` con todas las variables de runtime de arriba.

## `.env` mínimo para local

```bash
DATABASE_URL=postgresql://omega:omega@127.0.0.1:5435/omega?schema=public&connection_limit=5&pool_timeout=20
JWT_SECRET=cambia-esta-clave-por-una-larga-y-aleatoria-de-32+
NEXT_PUBLIC_APP_URL=http://localhost:3000

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@omegacomplex.com

CRON_SECRET=cambia-este-secreto-del-cron
ADMIN_EMAIL=admin@omegacomplex.com
ADMIN_PASSWORD=cambia-esta-clave

# Opcionales
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
```

## Notas y trampas conocidas

- **Dentro del contenedor, `127.0.0.1` es el contenedor**, no tu máquina. `docker compose` ya levanta el servicio `db` y fuerza `DATABASE_URL=…@db:5432/…`; si usas Supabase u otra BD externa, define `DATABASE_URL_DOCKER` en `.env`.
- El `.env` actual tenía líneas que no eran `KEY=VALUE` (`--- n8n ---`, etc.) y **rompían `docker compose`**; deben ir comentadas con `#`.
- `JWT_SECRET` no tiene valor por defecto: sin él, `env.ts` lanza excepción.
- `NEXT_PUBLIC_APP_URL` debe ser **HTTPS en producción** (validación explícita en `resend.ts`).
- Si se usa Resend, verifica el dominio y que `RESEND_FROM_EMAIL` termine en él; si se usa n8n, configura también su secreto.
- No subas `.env` real; rota cualquier secreto que se haya compartido.
- El seed en Docker necesita `ADMIN_EMAIL`/`ADMIN_PASSWORD`; si no se definen, usa `admin@omegacomplex.com` / `admin123456` (inseguro).

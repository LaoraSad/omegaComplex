# Auditoría técnica — Omega Complex

**Fecha:** 2026-11-18
**Rama auditada:** `main` (commit `870346b`)
**Alcance:** revisión de código, requisitos (`requisitos.md`, 1.177 líneas), pruebas, Prisma, Docker y CI.
**Cambios locales presentes al auditar:** corrección de tipos en `src/features/admin/admin.repository.ts` (`ServiceCreateData.imagen` ahora acepta `null`) y comentado de líneas inválidas en `.env`. No se modificó nada más.

---

## 1. Resumen ejecutivo

1. El proyecto está **funcionalmente completo para el MVP**: auth con verificación y Google, catálogo, horarios/festivos, reservas con holds y concurrencia en SQL, Stripe con webhook firmado e idempotente, QR de acceso con uso único, panel admin, reportes/CSV y correos.
2. `tsc --noEmit` pasa ✅ y `next build` pasa tras el fix de tipos ✅ (antes fallaba en `src/app/api/services/route.ts:32`).
3. Vitest: **253/257 pruebas OK**, 2 archivos con fallos. Dos fallos son **reales** (validación de imagen de servicio); dos son de integración y fallan **porque la BD no está levantada** (`127.0.0.1:5435`), no por lógica.
4. El **seed no funciona en Docker**: `prisma/seed.ts:3` importa con alias `@/…` y la imagen runner no copia `tsconfig.json` (Dockerfile:36-45), así que `tsx` no resuelve el alias → `MODULE_NOT_FOUND`. El entrypoint lo tolera y arranca sin datos iniciales.
5. **`docker compose up` no es reproducible tal cual**: el `.env` tenía líneas que no son `KEY=VALUE` (rompían Compose, ya comentadas localmente) y `DATABASE_URL` apunta a `127.0.0.1:5435`, que dentro del contenedor es el propio contenedor. El servicio `db` está comentado en `docker-compose.yml:29-42`.
6. La **imagen pesa 1.34 GB** porque el runner copia todo `node_modules`, incluidas devDependencies (`Dockerfile:45`).
7. **CI no ejecuta tests**: `.github/workflows/deploy.yml` corre `npm ci`, `prisma generate`, `typecheck`, `lint` y `build` (líneas 31-43), pero no `npm test` ni Playwright.
8. Seguridad bien resuelta en lo esencial: bcrypt, JWT en cookie httpOnly con revocación por `tokenVersion`, roles en `src/proxy.ts`, rate limit de login persistido en BD, webhook Stripe con firma e idempotencia, tokens de reset hasheados.
9. Faltan: rate limiting global para endpoints públicos, cabeceras de seguridad/CSP, y un endpoint de *liveness* separado del chequeo que depende de la BD.
10. **Veredicto:** listo para demo y sustentación con BD arriba; para entrega reproducible faltan P0/P1 de seed, entorno Docker y validaciones.

---

## 2. Verificaciones ejecutadas

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `tsc --noEmit` | ✅ 0 errores | ejecución local |
| `next build` | ✅ compila (antes fallaba por tipo) | build Docker del 2026-11-18 |
| Vitest | ⚠️ 253/257; 2 archivos con fallo | 4 fallos, 5 skipped |
| Concurrencia (integración) | ⚠️ falla por BD apagada | `tests/integration/concurrencia.test.ts` → `Can't reach database server at 127.0.0.1:5435` |
| E2E Playwright | ⚪ no ejecutado | requiere build + BD; 4 specs en `tests/e2e/` |
| Docker runtime | ✅ web healthy con BD auxiliar y red host | prueba del 2026-11-18 |

Fallos reales de test:
- `src/features/admin/__tests__/admin.service-image.test.ts:36-46` → `serviceCreateSchema` **no acepta `imagen: null`** y **acepta rutas sin `/` inicial** (`newassets/...`). El schema está en `src/features/admin/admin.schemas.ts:112-115`: falta `.nullable()` y validar el prefijo `/`.

---

## 3. Estado por módulo

| Módulo | Estado | Evidencia / notas |
|---|---|---|
| Autenticación y sesión | ✅ Completo | login/registro, verificación por código, reset con token hasheado (`email-flow.service.ts`), Google OAuth, cookie httpOnly + `tokenVersion` (`shared/auth/session.ts`) |
| Roles y protección de rutas | ✅ Completo | `requireRole` (`shared/auth/require-role.ts`), `src/proxy.ts` y `src/proxy.test.ts` |
| Catálogo, categorías y servicios | ✅ Completo | CRUD admin, imágenes de `public/newassets` (`catalog/service-images.ts`), validación pendiente (ver §5) |
| Horarios, festivos y disponibilidad | ✅ Completo | `features/schedules/colombia-holidays.ts` + pruebas; slots por rango |
| Reservas, holds y concurrencia | ✅ Implementado | `reservations.service.ts:472-540` usa transacción + locks y UPDATE condicional de cupo; pruebas de integración requieren BD |
| Pagos Stripe | ✅ Completo | checkout, webhook con firma e idempotencia (`api/payments/webhook/route.ts`, `StripeEvent.eventId`) |
| QR y control de acceso | ✅ Completo | generación, PDF, escaneo (`use-qr-scanner.ts`), confirmar/denegar, uso único (`access`/`qr` en Prisma) |
| Empleados y turnos | ✅ Completo | `/turnos`, `/validar`, admin de empleados |
| Panel administrativo y reportes | ✅ Completo | dashboard, reservas, clientes, servicios, export CSV (`api/admin/export`) |
| Correos | ✅ Completo | Resend (`lib/email/resend.ts`) y n8n como alternativa; validación de dominio remitente |
| Cron de holds vencidos | ✅ Completo | `/api/cron/holds` cerrado por defecto con `CRON_SECRET` |
| Despliegue Docker | ⚠️ Parcial | funciona con ajustes manuales; seed roto y BD externa no orquestada |

---

## 4. Requisitos vs implementación

| Requisito (`requisitos.md`) | Estado | Evidencia / brecha |
|---|---|---|
| 5. Roles y permisos (admin/cliente/empleado) | ✅ | `requireRole`, `proxy.ts`, panel por rol |
| 6-7. Horarios, festivos y capacidad | ✅ | schedules + slots + capacidad |
| 8. Registro y verificación de correo | ✅ | `verify-email`, código con hash y TTL |
| 9-12. Reservas, holds, fechas pasadas y solapes | ✅ | `createReservationWithHold`, validaciones de fecha/solape |
| 13. Pagos con Stripe | ✅ | checkout + webhook firmado |
| 14-18. QR, escaneo, horario de ingreso y uso único | ✅ | `features/access`, `QrToken`, `Access` |
| 19-21. Verificación de empleado, dashboard, empleados | ✅ | `/turnos`, `/validar`, admin |
| 22. Correos transaccionales | ✅ | Resend/n8n |
| 26. Concurrencia protegida en BD | ✅ implementado / ⚠️ no verificado en esta sesión | SQL con locks; falta correr integración con BD |
| 27. Seguridad | ⚠️ Parcial | ver §6 |
| 30.2 Aplicación desplegada | ⚪ no verificable | CI de despliegue existe; no se comprobó el entorno real |
| 34-35. Criterios y pruebas críticas | ⚠️ Parcial | unitarias amplias; concurrencia/E2E no ejecutadas aquí |

No se detectaron requisitos funcionales del MVP sin implementar. El alcance excluido (membresías, marketplace, multi-sede, facturación, WhatsApp) está correctamente documentado en README.

---

## 5. Errores y riesgos

### P0 — bloquean una entrega reproducible

| ID | Problema | Evidencia | Acción |
|---|---|---|---|
| P0-1 | `docker compose up` falla con el `.env` original (líneas de texto sin `#`) | `.env:7,11,24,25,27`; error de Compose | Versionar un `.env.example` válido y documentar; ya corregido localmente, falta commit |
| P0-2 | `DATABASE_URL` usa `127.0.0.1:5435` dentro del contenedor | `.env` + `docker-compose.yml` (servicio `db` comentado) | Añadir servicio `db` y usar `db:5432`, o `host.docker.internal`; documentar ambos modos |
| P0-3 | El seed falla en la imagen | `prisma/seed.ts:3` (alias `@/`) + `Dockerfile:36-45` (no copia `tsconfig.json`) | Copiar `tsconfig.json` al runner o quitar alias del seed |
| P0-4 | Pruebas de validación de imagen en rojo | `admin.service-image.test.ts`; `admin.schemas.ts:112-115` | Aceptar `null` y exigir ruta absoluta `/...` |

### P1 — calidad y operación

| ID | Problema | Evidencia | Acción |
|---|---|---|---|
| P1-1 | CI no ejecuta tests ni E2E | `.github/workflows/deploy.yml:31-43` | Añadir `npm test` (con Postgres de servicio) y job E2E opcional |
| P1-2 | 2 tests de integración dependen de BD local y no se saltan si falta | `tests/integration/concurrencia.test.ts:1-8` | `describe.skipIf(!process.env.DATABASE_URL_TEST)` o contenedor de CI |
| P1-3 | Sin rate limiting global en endpoints públicos | solo login (`login-rate-limit.ts`) | Middleware/límite por IP en auth pública, disponibilidad y webhooks |
| P1-4 | Sin cabeceras de seguridad/CSP | `next.config.ts` sin `headers()` | Añadir CSP, HSTS, `X-Frame-Options`, `Referrer-Policy` |
| P1-5 | Healthcheck único depende de la BD | `docker-compose.yml:18` (`/`) | Añadir `/api/health` de liveness y dejar `/` como readiness |
| P1-6 | Imagen 1.34 GB con devDependencies | `Dockerfile:45` copia todo `node_modules` | `npm ci --omit=dev` en runner + `prisma generate` |
| P1-7 | README/`.env.example` mezclan n8n y Resend como vías de correo | `.env.example` vs `README.md` | Aclarar que Resend es el canal y n8n opcional |

### P2 — deuda y limpieza

- `prisma/schema.prisma:1` conserva un TODO obsoleto sobre modelar entidades que ya existen.
- Cinco archivos con `describe.todo` (`auth.test.ts`, `reservations.test.ts`, `admin.test.ts`, `payments.test.ts`, `tests/integration/example.test.ts`) conviven con suites reales; eliminar o implementar.
- `prisma/test-dashboard.ts` es un script manual que viaja en la imagen; moverlo a `scripts/`.
- El chequeo de salud tarda hasta 60 s si la BD tarda: `start_period` de 20 s puede marcar `unhealthy` antes de tiempo.
- No hay `depends_on`/orquestación de BD; el arranque depende de una base externa ya existente.

---

## 6. Seguridad

**Bien:**
- Contraseñas con bcrypt coste 12 (`email-flow.service.ts:239`).
- JWT en cookie `httpOnly`, `sameSite=lax`, `secure` en producción y revocación por `tokenVersion` (`session.ts`).
- Protección de rutas por rol en `src/proxy.ts` + `requireRole`.
- Rate limit de login persistido en BD y por IP/correo (`login-rate-limit.ts`).
- Webhook Stripe: firma obligatoria, cuerpo crudo, idempotencia por `eventId`.
- Tokens de verificación/reset hasheados (SHA-256) y un solo uso.
- `.env` está en `.gitignore`; solo `.env.example` está versionado.

**Faltantes/riesgos:**
- Sin límites en registro, recuperación de contraseña ni endpoints públicos de disponibilidad.
- Sin CSP/HSTS ni cabeceras de hardening.
- Sin mención/implementación explícita de CSRF (mitigado parcialmente por `SameSite=Lax` y JSON).
- Healthcheck público sin autenticación (aceptable, pero no debe filtrar detalles).
- Revisar si la IP del rate limit confía en `x-forwarded-for` sin proxy de confianza (comentario en `login-rate-limit.ts:77`).

---

## 7. Calidad y pruebas

- 53 archivos de test: 46 OK, 2 con fallos, 5 skipped. 257 casos: 253 pasan.
- Cobertura funcional amplia por feature (`__tests__` en auth, availability, catalog, payments, reservations, access, admin, email, pdf, proxy).
- E2E: 4 specs (`auth`, `cliente`, `empleado`, `admin`) + helpers; no ejecutados en esta auditoría.
- `npm run lint` existe y CI lo ejecuta; no se ejecutó aquí.
- Typecheck limpio y build reproducible.
- Falta gate de tests en CI y datos de prueba deterministas para integración.

---

## 8. Plan priorizado

### P0 (antes de entregar)
1. Corregir `serviceImageSchema` (nullable + prefijo `/`) y poner en verde `admin.service-image.test.ts`.
2. Hacer reproducible `docker compose`: `.env` válido, BD orquestada o `host.docker.internal`, y healthcheck acorde.
3. Arreglar el seed en la imagen (copiar `tsconfig.json` o eliminar alias) y verificar que crea roles/admin.
4. Dejar documentado el arranque exacto (con y sin BD local).

### P1 (siguiente iteración)
5. CI con `npm test` + Postgres de servicio; integrar tests de concurrencia.
6. Rate limiting global y cabeceras de seguridad.
7. Separar liveness/readiness y ajustar `start_period`.
8. Reducir imagen con `npm ci --omit=dev` en runner.
9. Unificar documentación de correo (Resend vs n8n).

### P2 (limpieza)
10. Eliminar TODOs y `describe.todo` obsoletos.
11. Mover scripts manuales fuera de `prisma/`.
12. Revisar accesibilidad y rendimiento del frontend (no cubierto aquí).

Criterio de aceptación global: `docker compose up` desde cero deja la app healthy, con seed aplicado, `npm run typecheck && npm run lint && npm test` en verde y un flujo E2E cliente→pago→QR→acceso reproducible.

---

## 9. Límites de esta auditoría

- No se ejecutaron E2E ni pruebas manuales de UI/cámara QR.
- Las pruebas de concurrencia no pudieron validarse por no haber BD levantada; el análisis es estático.
- No se auditó el entorno desplegado ni el pipeline real de GitHub Actions.
- No se revisaron aspectos legales, de accesibilidad ni de rendimiento en dispositivo real.

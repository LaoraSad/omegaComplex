# Omega Complex — Documento técnico detallado

> **Propósito**: que cualquier compañero del equipo pueda leer esto y responder las preguntas del jurado sobre el código: por qué se tomó cada decisión, cómo se integran las tecnologías y cómo funciona cada pieza por dentro.
>
> **Formato**: cada sección explica QUÉ hace, CÓMO lo hace (con archivo y mecanismo real) y POR QUÉ se hizo así. Cuando el jurado pregunta "¿cómo hicieron para…?", la respuesta está acá.

---

## 1. Visión general del sistema

Omega Complex es una plataforma de reservas y control de acceso para un complejo deportivo. Tres perfiles comparten el mismo sistema y la misma base de datos:

| Perfil | Rutas | Qué hace |
|---|---|---|
| **Cliente** | `/servicios`, `/mis-reservas`, `/perfil`, `/pagando/[id]` | Explora el catálogo, arma un carrito de varias zonas, paga en línea, recibe códigos QR por correo y los presenta en la puerta. |
| **Empleado** | `/validar`, `/turnos` | Lee el QR con la cámara (o lo escribe a mano), ve la ficha de la persona y decide si otorga o deniega el ingreso. |
| **Administrador** | `/admin/*` | Servicios, horarios, cierres, reservas, empleados, clientes, accesos y reportes. |

**Regla de oro del sistema**: el inventario de cupos se resuelve en PostgreSQL, nunca en el navegador. El cliente puede intentar lo que quiera; el servidor es quien decide si una reserva existe, si un horario sirve y si un pago se confirmó.

---

## 2. Arquitectura

### 2.1 El framework: Next.js 16 con App Router

Todo el proyecto es **una sola aplicación Next.js 16.3**. No hay un backend separado:

- **UI** → React Server Components por defecto; solo los componentes con interactividad llevan `"use client"`.
- **API** → Route Handlers en `src/app/api/**/route.ts`. Son funciones `export async function POST(req)` que corren en el servidor Node del mismo deploy.
- **Estilos** → Tailwind CSS v4 (un solo `globals.css` con `@theme`, sin CSS modules ni CSS-JS).
- **Bundler** → Turbopack (dev) y webpack (build) según el script de npm.

**¿Por qué importa esto para el jurado?** Porque explica por qué no hay un "backend" ni un "frontend" desplegados aparte: las páginas y la API viven en el mismo proceso, comparten el mismo `tsconfig`, los mismos tipos y el mismo `prisma/schema.prisma`. Una sola imagen Docker lo corre todo.

### 2.2 Capas y la regla que las separa

```
src/
├── app/          ← HTTP: páginas + route handlers. Sin lógica de negocio.
├── components/   ← UI pura. Recibe props, no consulta la base.
├── features/     ← LÓGICA DE NEGOCIO por dominio (auth, reservations, payments…)
│   ├── <dominio>/
│   │   ├── service.ts      reglas de negocio
│   │   ├── repository.ts   consultas a la base
│   │   ├── schemas.ts      validación Zod (entrada y salida)
│   │   ├── types.ts        tipos compartidos del dominio
│   │   └── index.ts        API pública del dominio
├── shared/       ← Utilidades transversales (http, pdf, integrations, lib)
├── lib/          ← api (cliente HTTP), email (plantillas)
└── proxy.ts      ← Autorización por rol a nivel de ruta (middleware)
```

**La regla**: los route handlers solo hacen tres cosas: (1) leer y validar la entrada con Zod, (2) delegar en `features/`, (3) traducir a HTTP. Si un handler tiene un `if` de negocio, está mal.

**Ejemplo real** (`src/app/api/reservations/route.ts`):

```ts
const parsed = createReservationSchema.safeParse(body);
if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));
const result = await createReservationWithHold(session.userId, parsed.data);
// cupos, solapes, precio, hold → todo dentro de createReservationWithHold
```

**¿Por qué así?** Porque las reglas de negocio se pueden probar sin levantar la aplicación (120 tests unitarias), y porque el mismo dominio lo usan el cliente, el admin y el webhook sin duplicar lógica.

### 2.3 Autorización: el `proxy.ts`

`src/proxy.ts` es un **middleware** que corre antes de cada request a rutas protegidas:

1. Lee la cookie `session` (JWT firmado con `jose`).
2. Verifica la firma y la expiración **sin tocar la base** (el token es autocontenido).
3. Inyecta `req.user = { userId, role }`.
4. Si la ruta exige un rol (`/admin/**`, `/validar`, `/turnos`) y el rol no coincide → `401` o `403`.

```
CLIENT → proxy.ts (JWT) → layout/route → repository → PostgreSQL
```

El layout de cada grupo de rutas (`(admin)`, `(employee)`, `(storefront)`) hace la misma comprobación como segunda capa, así que aunque alguien quite el proxy, el layout sigue protegiendo.

### 2.4 Comunicación HTTP

- **Formato**: todas las respuestas usan el sobrescrito `{ data: T | null, error: { code, message } | null }` (`src/shared/http/api-response.ts`).
- **Cliente**: `src/lib/api/*` envuelve `fetch` con `credentials: 'include'` (la cookie viaja sola) y lanza `HttpError` con el `code` del servidor.
- **Códigos HTTP**: `200` OK · `201` creado · `400` validación · `401` sin sesión · `403` rol o correo sin verificar · `404` no existe · `409` conflicto de negocio (solape, cupo, QR usado) · `500` error interno · `503` base no disponible.

---

## 3. Stack tecnológico y por qué

| Necesidad | Elección | Por qué |
|---|---|---|
| Framework full-stack | **Next.js 16** | Un solo deploy para UI + API; App Router con RSC reduce el JS que llega al navegador. |
| Lenguaje | **TypeScript estricto** | Los mismos tipos cruzan UI → API → Prisma. El jurado puede ver que no hay `any` suelto. |
| ORM | **Prisma 6** | Esquema como fuente de verdad (`prisma/schema.prisma`), migraciones versionadas, queries tipadas. |
| Base de datos | **PostgreSQL en Supabase** | Transacciones reales (`SELECT … FOR UPDATE`, `UPDATE … WHERE status='active'`), índices compuestos, RLS disponible. |
| Validación | **Zod 4** | Un solo schema por dominio: valide la entrada y se infiere el tipo de salida. |
| Autenticación | **jose (JWT) + bcryptjs** | Token autocontenido sin tabla de sesión; hash de contraseña con salt. |
| Pagos | **Stripe 23** | Checkout hosteado, webhooks con firma verificada, reconciliación de pagos huérfanos. |
| Correo | **Resend 6 + n8n (opcional)** | Plantillas HTML con QR embebido por CID + PDF adjunto. n8n como capa de automatización si el cliente la quiere. |
| QR / PDF | `qrcode` + `pdf-lib` | `qrcode` genera el PNG; `pdf-lib** arma el PDF imprimible en el servidor (sin dependencias nativas). |
| Visor 360 | **three.js** | WebGL puro para el panorama; import dinámico para no penalizar el resto. |
| Lector QR | **jsQR** | Decodificación en el navegador desde el `<canvas>` de la cámara, sin librerías nativas. |
| Gráficas | **Recharts** | Dashboard del admin (ritmo de reservas, ocupación). |
| Fechas | **date-fns** + calendario propio | Toda la lógica de zona horaria se resuelve en `America/Bogota` con utilidades propias (`access-dates.ts`, `colombia-holidays.ts`). |
| Pruebas | **Vitest + Playwright** | Vitest para la lógica (120 tests), Playwright para flujos reales en navegador. |

---

## 4. Modelo de datos

Fuente de verdad: **`prisma/schema.prisma`** (24 modelos). Las migraciones viven en `prisma/migrations/` y se aplican en orden.

### 4.1 Identidad y sesión

```
Role 1───* User 1───* OAuthAccount        (login con Google)
             │
             ├───1 Customer               (datos de cliente: documento, fecha nacimiento, dirección)
             └───1 Employee               (datos de empleado: documento, turno)

User *───* EmailVerification             (códigos de verificación, expiran)
User *───* PasswordReset                 (tokens de recuperación, un solo uso)
User *───* LoginAttempt                  (rate limiting de login)
```

- **`User`**: `email`, `passwordHash` (bcrypt), `emailVerified`, `roleId`.
- **`Customer` / `Employee`**: datos personales separados del login. Un `User` de rol `employee` puede tener además su `Employee`.
- **`OAuthAccount`**: vinculación con Google (`providerId` + `providerUserId` único).

### 4.2 Catálogo

```
Category 1───* Service 1───* ServiceSchedule   (hora apertura/cierre por día de semana)
                     │
                     ├───* ServiceClosure       (cierres manuales: feriados, eventos)
                     └───* ServiceSlot          (franjas de 1 hora con cupos y bloqueos)
```

**`ServiceSlot`** es el corazón del inventario:

| Campo | Significado |
|---|---|
| `startsAt` / `endsAt` | Ventana exacta de la franja (siempre 1 hora). |
| `capacity` | Cupos totales de la franja. |
| `heldCount` | Cupos retenidos por reservas **pendientes** (holds). |
| `bookedCount` | Cupos consumidos por reservas **confirmadas**. |
| `status` | `active` / `past` (derivado de la hora, no se guarda solo). |

**Los cupos disponibles se calculan así** (`availability.repository.ts`):

```
libres = capacity − heldCount − bookedCount
```

Y el servidor **nunca** confía en el cálculo del cliente: al crear la reserva hace `UPDATE … SET heldCount = heldCount + n WHERE capacity − heldCount − bookedCount >= n` y filas afectadas = 0 significa "se acabó mientras tanto".

### 4.3 Reservas

```
Reservation 1───* ReservationBlock 1───* ServiceSlot   (por qué franja y qué zona)
      │                 │
      │                 └───* ReservationBlockGuest 1───1 ReservationGuest
      │
      ├───* ReservationSlot  (par reserva × slot, con cantidad)
      ├───* ReservationGuest (titular + acompañantes, con documento)
      ├───* ReservationHold  (bloqueo temporal de 10 min con expiresAt)
      ├───* Payment          (intento de pago y su estado en Stripe)
      └───* QrToken          (hash del código, un QR por persona × zona)
```

- **`Reservation.status`**: `pending_payment` → `confirmed` | `payment_rejected` | `expired` | `used`.
- **`ReservationBlock`**: la zona concreta (`serviceId` + `startsAt`/`endsAt`). Una reserva multi-zona tiene varios bloques.
- **`ReservationGuest`**: cada persona del grupo. `isTitular` marca al que pagó. **Un QR por persona y por zona**: el titular de piscina + cancha lleva dos QR.

### 4.4 Pagos

```
Payment
  ├─ reservationId, method, status, currency
  ├─ amount (en CENTAVOS)
  ├─ stripeCheckoutSessionId, stripePaymentIntentId
  └─ paidAt, failureMessage

StripeEvent
  ├─ eventId (único → idempotencia)
  ├─ type, payload (JSON), processedAt
  └─ errorMessage (si falló)
```

### 4.5 Acceso

```
QrToken
  ├─ tokenHash (SHA-256, único — el token crudo no se guarda)
  ├─ shortCode (código corto transcribible, único)
  ├─ reservationId, blockId, guestId
  ├─ seqNo (número legible dentro de la zona)
  ├─ status: active | used | expired
  └─ usedAt

Access
  ├─ qrTokenId, employeeId
  ├─ result: allowed | denied
  ├─ denialReason (texto libre que ve el admin)
  └─ accessedAt
```

---

## 5. Flujo completo de reserva (paso a paso)

### Paso 1 — Catálogo y disponibilidad

1. El cliente entra a `/servicios`. El servidor lee `Service` + `Category` desde Prisma y devuelve el catálogo con precios y capacidades reales.
2. Al abrir un servicio, el cliente pide `GET /api/availability?serviceId=…&fecha=…`.
3. El servidor calcula las franjas de ese día: horario semanal − cierres manuales − mantenimiento de lunes (o martes si el lunes es festivo) − festivos, y por cada franja calcula `libres = capacity − heldCount − bookedCount`.
4. El cliente ve las franjas libres. Las ocupadas y pasadas se muestran deshabilitadas.

### Paso 2 — Carrito multi-zona

1. El cliente agrega franjas de **distintas zonas** al carrito (piscina 10:00 + cancha 14:00).
2. El carrito vive en `sessionStorage` (no `localStorage`): sobrevive al login, pero desaparece al cerrar la pestaña y no se comparte entre ventanas.
3. **Solape en el cliente**: al agregar una franja, el carrito compara su ventana contra las demás bloques de la **misma fecha**. Si se pisan, rechaza con un mensaje claro ("Cancha 10:00–11:00 ya está en tu carrito. Elige otro horario o quita esa zona primero."). Si elige un horario libre, entra sin problema.
4. Cada zona declara cuántas personas entran por su puerta y cuáles son (el titular puede ir solo a la cancha y con 3 amigos a la piscina).
5. El carrito está **amarrado al `usuarioId`**: si otra cuenta entra en la misma pestaña, lo guardado se descarta.

### Paso 3 — Bloqueo temporal (hold)

1. Al pulsar "Confirmar y pagar" → `POST /api/reservations` con los bloques y las personas.
2. El servidor abre una transacción y **toma un lock por fila del `Customer`** (`SELECT … FOR UPDATE`). Así dos peticiones simultáneas del mismo cliente no se adelantan.
3. Verifica, bloque a bloque, que no se solape con otra reserva confirmada del mismo cliente (bloque contra bloque, no contra la ventana global).
4. Crea el `Reservation` en `pending_payment`, los `ReservationBlock`, los `ReservationGuest`, y un **`ReservationHold` de 10 minutos** con `expiresAt`.
5. Suma los cupos con `UPDATE … WHERE capacity − heldCount − bookedCount >= n`. Si afecta 0 filas, **cupo agotado** → `409`.
6. Devuelve el `reservationId` y el cliente es redirigido a `/pagando/[id]`.

### Paso 4 — Pago en Stripe

1. `/pagando/[id]` (componente de servidor) crea la **Checkout Session** en Stripe con los `line_items` de cada bloque (un item por zona, con el nombre de las personas y la franja).
2. Los montos van en **centavos** (unidad mínima de la moneda): `100.000 COP → 10.000.000`.
3. Redirige al checkout hosteado de Stripe. El cliente paga.
4. Stripe devuelve al cliente a la app **y** envía el webhook `checkout.session.completed`.
5. **El webhook es la fuente de verdad**: el cliente puede cerrar la pestaña, fallar la red o mentir; si el webhook no confirma, la reserva no existe.

### Paso 5 — Confirmación y QR

Dentro del webhook (o del endpoint de reconciliación `/api/reservations/[id]/estado-pago` que mira a Stripe si el webhook se perdió):

1. Verifica la **firma del webhook** con `STRIPE_WEBHOOK_SECRET` (constant-time compare).
2. Idempotencia por `eventId`: si el evento ya se procesó, no se duplica nada.
3. Transición atómica: `Reservation → confirmed`, `Hold → consumed`, `bookedCount += n`.
4. **`emitirQrDeReserva(reservationId)`**: por cada bloque × cada invitado, genera un token aleatorio de 32 caracteres, guarda su **SHA-256** (nunca el token crudo), y un **código corto** de 8 símbolos (p. ej. `K7M2-XQP4`) para dictar si la cámara falla.
5. Se genera el **PDF** con los QR (logo, fecha, documento, un QR por persona) y se envía el **correo** con el PDF adjunto y los QR embebidos.

### Paso 6 — Control de acceso

Ver sección 6.

---

## 6. Control de acceso con QR

### 6.1 Generación

`src/features/reservations/qr.ts` → `emitirQrDeReserva`:

- Idempotente: si la reserva ya tiene QR, los devuelve; si tiene una emisión parcial, avisa en vez de duplicar.
- **Un QR por persona × por zona**: el token abre una puerta concreta.
- El contenido del QR es el **token crudo** (32 caracteres base64url). En la base solo se guarda `sha256(token)`.
- Además se genera un **código corto** (8 símbolos de un alfabeto sin caracteres ambiguos: sin I, L, O, Z, 0, 1) que se imprime en el correo y en el PDF junto a la frase *"Si la cámara falla, dicta este código"*.

### 6.2 El correo y el PDF

`src/lib/email/resend.ts` → `sendQrEmail`:

1. Genera un PNG del QR con `qrcode` **por persona**.
2. Los embebe en el HTML como `cid:` (no como `data:` URL, que Gmail bloquea).
3. Genera el PDF con `pdf-lib` (ver sección 7).
4. Envía por Resend (o por n8n si está configurado).
5. El PDF va como adjunto: es la versión imprimible que el empleado lleva a la puerta.

### 6.3 La pantalla del empleado

`src/app/(employee)/validar/ValidarView.tsx`:

1. **Cámara**: `useQrScanner` abre `getUserMedia`, dibuja cada cuadro en un `<canvas>` a 480 px y lo decodifica con **jsQR** a ~10 fps. Al encontrar un QR, se detiene la cámara y se envía el texto.
2. **Código manual**: si la cámara falla (sin permiso, poca luz, pantalla rota), el empleado escribe el código corto. Acepta mayúsculas/minúsculas, con o sin guion, y corrige las confusiones típicas (`O→Q`, `I/L→J`, `Z→2`).
3. **Ficha**: `POST /api/access/validate` devuelve la persona (nombre, documento, titular/acompañante), la zona, la franja y el estado. El empleado compara con quien tiene delante.
4. **Decisión**: botón **"Dar acceso"** (confirma) o **"Denegar"** con motivo (no corresponde la persona, la zona está cerrada…). Ambos quedan registrados.
5. El QR queda **usado** y no vuelve a servir. Un intento denegado durante la consulta **no** consume el QR; una denegación explícita sí.

### 6.4 Validación en el servidor

`src/features/access/access.service.ts` → `lookupAccess` evalúa, en orden:

| # | Regla | Motivo de denegación |
|---|---|---|
| 0 | El empleado está activo y su usuario también | `empleado_inactivo` |
| 1 | El QR existe (por token o por código corto) | `qr_invalido` |
| 2 | La reserva está confirmada | `reserva_no_confirmada` |
| 3 | El QR no está usado | `qr_ya_utilizado` |
| 4 | El QR no está expirado | `qr_expirado` |
| 5 | No hay un ingreso previo con este QR | `acceso_ya_registrado` |
| 6 | **Es el día de la reserva** | `fecha_distinta` |
| 7 | La franja ya empezó | `franja_no_iniciada` |
| 8 | La franja no terminó | `franja_terminada` |

- Si la zona del QR no es la del empleado, **no se deniega**: se avisa y el empleado acompaña a la persona a la zona correcta.
- Si la franja ya terminó, el QR se marca `expired` en el acto (perezoso, sin cron) para que el admin lo vea así.

### 6.5 Registro atómico

`grantAccess` hace la confirmación dentro de una transacción:

```
UPDATE "QrToken" SET status='used', usedAt=now()
  WHERE id=? AND status='active'     ← si afecta 0 filas, otro empleado ganó
INSERT INTO "Access" (qrTokenId, employeeId, result, denialReason, accessedAt)
```

Así dos empleados escaneando el mismo QR a la vez: **solo uno** consigue el ingreso.

---

## 7. El PDF de QR: cómo se arma

`src/shared/pdf/qr-pdf.ts` → `generarPdfQr`:

1. Crea el documento con `pdf-lib` (una dependencia **puramente JS**, sin binativos).
2. **Primera página**: banda con el logo (PNG embebido desde `public/`), título "Códigos de acceso", nombre del titular y documento.
3. **Una tarjeta por persona** (124 pt de alto, calculados desde el borde inferior para que el marco del QR nunca se salga):
   - QR de 96×96 generado con el mismo `qrcode` que el correo (mismo contenido en ambos formatos).
   - Etiqueta de color (`Z1-P01`) con el nombre de la fuente bold.
   - Nombre de la persona, servicio · categoría.
   - **Código corto** impreso junto a la pista *"Si la cámara falla, dicta este código"*.
4. **Paginación determinista**: se calculan las filas por página una sola vez (la primera página pierde el encabezado) y se usa el mismo número en todas, para que ninguna fila quede sin dibujar.
5. Devuelve un `Uint8Array` que se adjunta al correo en base64.

**¿Por qué `pdf-lib`?** Porque se ejecuta en el servidor, no depende de Chromium ni de binarios nativos, y el contenido se puede verificar en los tests (los flujos de texto van comprimidos y en hexadecimal; el test los infla y los decodifica para comprobar que el código corto y el nombre están ahí).

---

## 8. Autenticación

### 8.1 Login normal

1. `POST /api/auth/login` con email + contraseña.
2. **Rate limiting** (`login-rate-limit.ts`): 10 fallos / 15 min por correo + 30 fallos / 15 min por IP. Los intentos se guardan en `LoginAttempt`.
3. Si la contraseña es correcta pero `emailVerified = false` → `403 EMAIL_NOT_VERIFIED` (así no se revela si la cuenta existe).
4. Hash con **bcryptjs** (salt incluido). Contraseña correcta → JWT con `jose` (7 días), cookie `HttpOnly` + `SameSite=Lax`.

### 8.2 OAuth con Google

1. `GET /api/auth/oauth/google` genera la URL de Google con `state` anti-CSRF (un valor aleatorio guardado en cookie firmada).
2. Google devuelve al callback con el código.
3. El servidor **canjea el código por token** (servidor a servidor, nunca en el navegador) y lee el perfil.
4. Si el correo de Google ya existe → se vincula (`OAuthAccount`) y entra. Si no → se crea la cuenta.
5. Si Google no garantiza `email_verified`, la cuenta queda pendiente de verificación propia.

### 8.3 Verificación de correo

- Código de 6 dígitos guardado en `EmailVerification` con expiración.
- Se reenvía desde `/api/auth/resend-verification`.
- Al verificar → `User.emailVerified = true` y el token de verificación se invalida.

---

## 9. Correo: Resend, n8n y la plantilla

### 9.1 Resend

`src/shared/integrations/resend.ts` — cliente único con la API key. Los envíos se registran en un logger JSON (`pago.qr_email_fallido` si falla).

### 9.2 n8n (opcional)

`src/features/payments/payments.service.ts` → `entregarQrPorCorreo`:

1. La app **no** envía el correo directamente si hay un workflow de n8n: publica un evento `reserva.confirmada` con los datos (nombre, fecha, PDF en base64, códigos) al webhook de n8n.
2. El webhook lleva una **firma HMAC-SHA256** (`N8N_WEBHOOK_SECRET`) que n8n valida; la app también verifica la respuesta.
3. Si n8n no contesta o falla → **fallback directo a Resend**. El cliente nunca se queda sin correo por culpa de una integración externa.

**¿Por qué n8n?** Porque el cliente puede orquestar el envío desde un flujo visual (reintentos, aprobación, otros destinos) sin tocar código de la app. Y si no lo configura, la app funciona igual.

### 9.3 La plantilla

`src/lib/email/resend.ts` — HTML con tablas (los clientes de correo no entienden flexbox):

- Logo embebido por CID.
- Una tarjeta por persona: QR de 196 px embebido, etiqueta `Z1-P01`, nombre, servicio · categoría.
- El **código corto** en una caja punteada con pista.
- El PDF adjunto (`codigos-qr.pdf`).

---

## 10. El visor 360

`src/components/tour/Tour360.tsx` + `src/components/tour/PanningImage.tsx`:

1. La imagen 360 (equirectangular) se carga desde `public/newassets/…`.
2. Se renderiza con **three.js** (WebGL): la textura se pega a una esfera interior y la cámara gira dentro.
3. **Import dinámico** (`await import`): three.js pesa ~600 KB y solo se descarga cuando el cliente abre el detalle de un servicio.
4. Controles: arrastre con inercia, rueda/pellizco para zoom, giroscopio en móvil (`DeviceOrientationEvent`), botón de pantalla completa.
5. Estado de carga con skeleton; si WebGL no está disponible, se muestra la imagen plana.

**¿Por qué three.js y no un visor hecho a mano?** Porque el mapeo equirectangular + las proyecciones ya están resueltos, y al cargarlo bajo demanda el resto de la app no paga su peso.

---

## 11. Disponibilidad y zona horaria

Todo el sistema opera en **`America/Bogota` (COT, UTC−5 fijo)**:

- `src/features/access/access-dates.ts` → `formatInTimeZone`, `formatClock`, `isSameBogotaDay`.
- `src/features/schedules/colombia-holidays.ts` → calendario de festivos (determinista, sin API externa).
- Las franjas se generan con `generateServiceSlotsForRange(serviceId, dias)` y respetan:
  - horario semanal por día,
  - cierres manuales (`ServiceClosure`),
  - mantenimiento de lunes (o martes si el lunes es festivo),
  - anticipación máxima de 3 meses.

---

## 12. Seguridad

| Medida | Dónde |
|---|---|
| Contraseñas con bcrypt (salt incluido) | `auth.service.ts` |
| JWT autocontenido, sin tabla de sesión | `proxy.ts` |
| Cookies `HttpOnly` + `SameSite=Lax` | `auth.service.ts` |
| Verificación de correo obligatoria | `login` |
| Rate limiting por correo e IP | `login-rate-limit.ts` |
| Firma de webhook verificada + idempotencia | `payments.service.ts`, `route.ts` |
| QR de un solo uso, hash SHA-256, consumo atómico | `access.repository.ts` |
| Carrito en `sessionStorage` amarrado al usuario | `CarritoReserva.tsx` |
| Validación Zod en cada entrada | `*/schemas.ts` |
| Sin secretos en el repo (`.env` ignorado) | `.gitignore` |
| Logging JSON sin secretos | `logger.ts` |

---

## 13. Pruebas

| Herramienta | Qué cubre | Cómo se corre |
|---|---|---|
| **Vitest** | Lógica de negocio: schemas, services, repos, fechas, PDF, correo | `npx vitest run` → 120 tests |
| **Playwright** | Flujos reales en navegador: login, reserva, pago, QR, admin | scripts en `temp/opencode/omega-qa-scripts` |

- Los tests de repositorios usan el Prisma real contra la base de Supabase (con fixture y limpieza).
- Los tests de PDF **inflan los flujos de contenido** y decodifican los operandos hexadecimales para comprobar que el código corto y el nombre están escritos de verdad.
- Los tests de QR generan reservas reales y consultan por token, por código corto y por código con guion/minúsculas.

---

## 14. Despliegue

### 14.1 Docker

```
Dockerfile (multistage)
  ├── dependencies  → npm ci (con lockfile)
  ├── builder       → copia deps + codigo, prisma generate, next build
  └── runner        → node:20-alpine, usuario no root, expone 3000
```

- La imagen de producción corre con un **usuario no privilegiado**.
- `.dockerignore` excluye `node_modules`, `.next`, `.git`.
- `docker-compose.yml` levanta la app en `:3000` con las variables de entorno del `.env`.

### 14.2 Variables obligatorias en producción

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | PostgreSQL (Supabase o propio) |
| `JWT_SECRET` | Firma de tokens |
| `NEXT_PUBLIC_APP_URL` | URL pública (links de correo, return de Stripe) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Pagos |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Correo |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` | Automatización (opcional) |
| `CRON_SECRET` | Cron de holds |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (seed) |

### 14.3 Pasos en el VPS

```bash
# 1. Clonar
git clone <repo> && cd omega-complex

# 2. Variables
cp .env.example .env   # y rellenar

# 3. Migraciones y seed
npx prisma migrate deploy
npx prisma db seed

# 4. Levantar
docker compose up -d --build

# 5. Stripe: apuntar el webhook a https://<dominio>/api/payments/webhook
# 6. Google: añadir https://<dominio>/api/auth/oauth/google/callback
```

---

## 15. Preguntas típicas del jurado (y dónde está la respuesta)

| Pregunta | Respuesta corta | Sección |
|---|---|---|
| ¿Por qué Next.js y no un backend aparte? | Un solo deploy para UI + API, mismos tipos, misma base. | 2.1 |
| ¿Dónde se valida que no se pisen dos reservas? | En el servidor, en una transacción con lock por cliente, bloque contra bloque. | 5 paso 3 |
| ¿El cliente puede inventarse un cupo? | No: el cupo se suma con `UPDATE … WHERE libres >= n`. | 4.2 |
| ¿Cómo saben que el pago fue real? | El webhook de Stripe con firma verificada; el retorno del navegador no basta. | 5 paso 4 |
| ¿Por qué el QR no se puede reusar? | Consumo atómico: `UPDATE … WHERE status='active'`; si afecta 0, otro ganó. | 6.5 |
| ¿Cómo si la cámara falla? | Código corto de 8 símbolos impreso en el correo y el PDF, con corrección de confusiones. | 6.3 |
| ¿Por qué el PDF y no solo la imagen? | El PDF se imprime y se lleva a la puerta; la imagen puede no cargar en el teléfono. | 7 |
| ¿Cómo integran n8n? | Evento firmado por HMAC; si n8n falla, Resend envía directamente. | 9.2 |
| ¿Por qué three.js en el 360? | Import dinámico: solo pesa cuando se abre el detalle. | 10 |
| ¿Cómo manejan la zona horaria? | Todo en `America/Bogota` con utilidades propias; los festivos son deterministas. | 11 |
| ¿Dónde están las pruebas? | Vitest para lógica (120), Playwright para flujos reales. | 13 |
| ¿Cómo lo despliegan? | Imagen multistage con usuario no root; migraciones y seed antes de levantar. | 14 |

---

## 16. Estado del proyecto

- **120 tests** unitarios, 0 fallos.
- **0 errores** de lint (10 warnings preexistentes de variables sin usar).
- **49 páginas** generadas en el build.
- Los flujos críticos (reserva, pago, QR, acceso) verificados end-to-end con Playwright contra la base real.

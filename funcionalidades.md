# Omega Complex - Documento técnico funcional

Documento de referencia para estudiar el sistema antes de la auditoría. Cubre qué hace la aplicación, cómo está construida y por qué se tomaron las decisiones técnicas.

> **Alcance**: describe el estado actual del repositorio. Marca explícitamente lo que está implementado, lo que está a medias y lo que no existe todavía, para no confundir una interfaz terminada con un flujo completo.

---

## 1. Resumen ejecutivo

Omega Complex es la plataforma de reservas y control de acceso de un complejo deportivo. Tres perfiles de usuario comparten el sistema:

| Perfil | Qué hace | Prefijo de rutas |
| --- | --- | --- |
| **Cliente** | Explora el catálogo, arma su reserva en un carrito de varias zonas, paga y recibe códigos QR | `/servicios`, `/mis-reservas` |
| **Empleado** | Escanea el QR en la puerta de una zona y valida el ingreso | `/validar`, `/turnos` |
| **Administrador** | Gestiona servicios, horarios, cierres, empleados, reservas e ingresos | `/admin/*` |

La regla de negocio central es que **el inventario de cupos se resuelve en PostgreSQL, no en JavaScript**. Ninguna regla de disponibilidad depende de que el código de aplicación se ejecute en el orden correcto.

### Estado de verificación al momento de escribir esto

```
npx tsc --noEmit   ->  0 errores
npm run lint       ->  0 errores, 10 warnings (preexistentes)
npm run build      ->  49 páginas generadas
npx vitest run     ->  120 tests, 0 fallos
```

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.3.6 |
| Lenguaje | TypeScript | estricto |
| Base de datos | PostgreSQL (Supabase) | — |
| ORM | Prisma | 6.19.3 |
| Validación | Zod | 4.6.5 |
| Estilos | Tailwind CSS | 4 |
| Autenticación | JWT firmado con `jose` + `bcryptjs` | 6.2 / 3.0 |
| Gráficos | Recharts | 3.10 |
| Calendario | `react-day-picker` | 10 |
| Estado cliente | Zustand + hooks propios | 5.0 |
| Pagos | SDK de Stripe | 23.0 |
| Correo | Resend | 6.32 |
| QR / PDF | `qrcode` + `pdf-lib` | 1.5 / 1.17 |
| Pruebas | Vitest + Playwright | 5.0 |

### Dependencias de producción

```
@prisma/client        bcryptjs        class-variance-authority  clsx
date-fns              dotenv          jose                      lucide-react
motion                next            pdf-lib                   qrcode
react-day-picker      react-hook-form          recharts
resend               sharp           sonner                    stripe
tailwind-merge       zod             zustand                   axios
```

`zod` y `react-hook-form` resuelven el mismo dominio: el schema de Zod es la fuente de verdad y alimenta los resolvers de `@hookform/resolvers`. No hay dos definiciones de la misma validación.

---

## 3. Arquitectura de carpetas

```
src/
├── app/
│   ├── (public)/          landing, sin sesión
│   ├── (storefront)/      catálogo y reservas del cliente
│   ├── (customer)/       reservas del cliente
│   ├── (employee)/        shell de empleado (validar, turnos)
│   ├── (admin)/           panel de administración
│   ├── (auth)/            login, registro, verificación
│   └── api/               22 route handlers REST
├── features/              <- LÓGICA DE NEGOCIO, agrupada por módulo
│   ├── access/            validación de QR y control de acceso
│   ├── admin/             CRUD de empleados y consultas de administración
│   ├── auth/              sesión, OAuth, verificación por correo
│   ├── availability/      disponibilidad calculada desde la BD
│   ├── catalog/           categorías y servicios
│   ├── payments/          pagos y transiciones
│   ├── reservations/      creación, bloqueos, QR
│   └── schedules/         horarios semanales y cierres
├── components/            UI (storefront, catalog, auth, admin, layout)
├── shared/                http/, integrations/, pdf/, lib/ <- utilidades transversales
└── proxy.ts               autorización por rol a nivel de ruta
```

### La regla que estructura el proyecto

**Nada de lógica de negocio en `app/`.** Los route handlers solo hacen tres cosas:

1. leer y validar la entrada con Zod,
2. delegar en `features/`,
3. traducir el resultado a una respuesta HTTP.

Ejemplo real, `src/app/api/reservations/route.ts`:

```ts
const body: unknown = await req.json().catch(() => null);
const parsed = createReservationSchema.safeParse(body);
if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));

const result = await createReservationWithHold(session.userId, parsed.data);

if (!result.ok) {
  return NextResponse.json(
    { data: null, error: { code: result.code, message: result.message } },
    { status: /* 409 si es conflicto de cupo o solape, 400 si no */ },
  );
}
```

Toda la lógica —cupos, solapes, precios, bloqueos— vive en `reservations.service.ts`. Eso permite probar el negocio sin levantar la aplicación.

---

## 4. Modelo de datos

**24 modelos.** Agrupados por responsabilidad:

### Identidad y acceso
| Modelo | Para qué |
| --- | --- |
| `Role` | `user`, `admin`, `employee` (con `@@unique(name)`) |
| `User` | Credenciales, email verificado, rol |
| `Customer` | Datos del cliente: documento, fecha de nacimiento, dirección |
| `Employee` | Datos del empleado: documento, rol, turno |
| `OAuthAccount` | Vinculación con Google |
| `EmailVerification` | Códigos de verificación de correo |
| `PasswordReset` | Tokens de recuperación de contraseña |
| `LoginAttempt` | Registro de intentos de login (rate limiting) |

### Catálogo
| Modelo | Para qué |
| --- | --- |
| `Category` | Categorías de servicios |
| `Service` | Servicios: nombre, precio, capacidad |
| `ServiceSchedule` | Horarios semanales por día |
| `ServiceClosure` | Cierres manuales (feriados, eventos) |
| `ServiceSlot` | Cupos y bloqueos por franja |

### Reservas y pagos
| Modelo | Para qué |
| --- | --- |
| `Reservation` | Reserva: estado, canal, cantidad, total |
| `ReservationBlock` | Tramo por zona |
| `ReservationSlot` | Slots asignados |
| `ReservationGuest` | Titular + acompañantes |
| `ReservationHold` | Bloqueo temporal con expiración |
| `Payment` | Método, estado, ids de Stripe |
| `StripeEvent` | Idempotencia por `eventId` |

### Acceso
| Modelo | Para qué |
| --- | --- |
| `QrToken` | Hash único, un QR por persona y zona, un solo uso |
| `Access` | Resultado, motivo, empleado |

---

## 5. Autenticación

### Registro y verificación de correo

El registro crea `User` + `Customer` con `emailVerified: false`. Se envía un código de verificación por correo (Resend). Sin verificar, `login()` devuelve `403 EMAIL_NOT_VERIFIED`.

La verificación se revisa **después** de validar la contraseña, para no regalar información sobre qué correos están registrados (enumeración de cuentas).

### Inicio de sesión con Google

Flujo OAuth 2.0 completo: el botón redirige a Google, el callback canjea el código por un token y lee el perfil. Se respeta `email_verified` de Google: si no lo garantiza, la cuenta queda pendiente de verificación propia.

### Rate limiting en login

| Límite | Valor | Ventaja |
| --- | --- | --- |
| Por correo | 10 fallos / 15 min | Muchas contraseñas contra una cuenta |
| Por IP | 30 fallos / 15 min | Una contraseña contra muchas cuentas |

El tope por correo no se puede esquivar cambiando de IP (evita DoS sobre un usuario legítimo).

---

## 6. Reservas

### Carrito multi-zona

El carrito vive en `sessionStorage` (no `localStorage`): sobrevive a la navegación del login en la misma pestaña, pero desaparece al cerrarla y no se comparte entre ventanas. Caduca a las 2 horas y se borra al confirmar la reserva.

Va amarrado al `usuarioId` de la sesión: si otra cuenta entra en la misma pestaña, lo guardado se descarta.

Cada zona define cuántas personas entran y cuáles son. El precio se reparte por personas, no por horas.

### Bloqueo temporal

Al crear la reserva se genera un `ReservationHold` de 10 minutos. Si no se paga en ese plazo, los cupos se liberan y la reserva queda en estado `expired`.

### Flujo de pago

```
Carrito -> POST /api/reservations -> /pagando/[id] -> Stripe
```

La página `/pagando/[id]` hace la redirección a Stripe **desde el servidor**. Si algo falla, muestra una pantalla real con opciones, no un vacío.

---

## 7. Pagos

### Stripe

El estado de una reserva **no** se confirma por el retorno del navegador tras el checkout: **el webhook es la fuente de verdad**.

Los montos se envían en **centavos** (unidad mínima de la moneda), no en pesos. Una reserva de 100.000 COP se envía como `10000000`.

### Confirmación y QR

Cuando el webhook confirma el pago:

1. `Payment` pasa a `succeeded`
2. `Reservation` pasa a `confirmed`
3. Se emiten los QR (uno por persona por zona)
4. Se envía el correo con los QR y el PDF adjunto

### PDF de QR

El PDF incluye logo, fecha, documento del titular y un QR escaneable por persona. Es la versión imprimible que usa el empleado en la puerta.

---

## 8. Acceso

El empleado valida cada entrada escaneando el QR. La validación comprueba:

1. QR válido (hash SHA-256)
2. Reserva confirmada
3. Fecha y horario correctos
4. QR no utilizado todavía

Si todo pasa, se marca el QR como usado de forma atómica y se registra el acceso.

---

## 9. Seguridad

### Implementado

| Control | Detalle |
| --- | --- |
| Contraseñas | `bcryptjs` (hash) |
| Sesiones | JWT con `jose`, 7 días |
| Cookies | `HttpOnly`, `SameSite=Lax`, `secure` en producción |
| Autorización | `proxy.ts` por rol (JWT sin BD) |
| Rate limiting | Login: 10/15min por correo, 30 por IP |
| Webhook Stripe | Firma verificada + idempotencia por `eventId` |
| QR | Hash SHA-256, un solo uso, consumo atómico |
| Variables sensibles | `.env` (nunca en el repo) |
| Errores de BD | `ServiceUnavailableError` (503) sin exponer detalles |

### Pendiente antes de producción

| Ítem | Motivo |
| --- | --- |
| Job de expiración de holds | Hoy es reactivo al consultar |
| Verificación de festivos | Usa constantes, no el calendario oficial |
| Pruebas E2E completas | Playwright configurado pero flujos críticos sin cubrir |

---

## 10. Correo

### Implementado

| Uso | Estado |
| --- | --- |
| Código de verificación | **Disponible** |
| Recuperación de contraseña | **Disponible** |
| QR de reserva (HTML + PDF) | **Disponible** |
| Bienvenida (manual + Google) | **Disponible** |
| Envío por n8n | **Disponible** (opcional) |

### n8n

La aplicación no envía los correos directamente: le reporta a n8n qué pasó y es n8n quien decide qué hacer. El cliente va firmado con HMAC-SHA256.

Eventos:

| Evento | Cuándo |
| --- | --- |
| `usuario.registrado` | Alta manual o con Google |
| `reserva.confirmada` | Pago aprobado, con PDF adjunto |

Si n8n no está configurado o no responde, los correos salen por Resend directamente.

---

## 11. Estado de pruebas

| Suite | Resultado |
| --- | --- |
| `npx vitest run` | 102 tests, 0 fallos |
| `npm run lint` | 0 errores, 10 warnings |
| `npx tsc --noEmit` | 0 errores |
| `npm run build` | 49 páginas |

---

## 12. Despliegue

### Desarrollo local

```bash
npm run dev
# http://localhost:3000
```

Para probar pagos con Stripe en local:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

### Producción

1. Desplegar en Vercel o servidor propio
2. Registrar el webhook en `https://dashboard.stripe.com/webhooks` con la URL pública
3. Cambiar las claves a `live`
4. `NEXT_PUBLIC_APP_URL` con el dominio real
5. Registrar el callback de Google OAuth

---

## 13. Notas de diseño

### Por qué `sessionStorage` para el carrito

- Sobrevive a la navegación del login (misma pestaña)
- Desaparece al cerrar la pestaña
- No se comparte entre ventanas
- Caduca a las 2 horas (datos personales de acompañantes)
- Se amarra a la cuenta (no se muestra a otro usuario)

### Por qué `/pagando/[id]`

- La redirección a Stripe se hace desde el servidor
- Si algo falla, hay una pantalla real con opciones
- El cliente nunca queda en un vacío sin saber qué pasó

### Por qué centavos en Stripe

- Stripe espera la unidad mínima de la moneda
- Enviar pesos hacía que 100.000 COP se leyera como $1.000,00 COP
- La conversión ocurre solo al hablar con Stripe

### Por qué el PDF tiene el documento del titular

- El empleado necesita verificar en recepción cuando la imagen no se puede leer
- Es la información que el empleado realmente usa en la puerta

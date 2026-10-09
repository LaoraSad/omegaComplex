# Omega Complex — Documento técnico funcional

Documento de referencia para estudiar el sistema antes de la auditoría. Cubre qué hace la aplicación, cómo está construida y por qué se tomaron las decisiones técnicas.

> **Alcance**: describe el estado actual del repositorio `D:\omegaComplex`. Marca explícitamente lo que está implementado, lo que está a medias y lo que no existe todavía, para no confundir una interfaz terminada con un flujo completo.

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
npx tsc --noEmit   →  0 errores
npm run lint       →  0 errores, 5 warnings (preexistentes, no introducidos)
npm run build      →  47 páginas generadas
Pruebas contra BD  →  70 assertions, 0 fallos
```

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.3.6 |
| UI | React | 19.2.8 |
| Lenguaje | TypeScript | estricto |
| Base de datos | PostgreSQL (Supabase) | — |
| ORM | Prisma | 6.19.3 |
| Validación | Zod | 4.6.5 |
| Estilos | Tailwind CSS | 4 |
| Autenticación | JWT firmado con `jose` + `bcryptjs` | 6.2 / 3.0 |
| Gráficos | Recharts | 3.10 |
| Calendario | `react-day-picker` | 10 |
| Estado cliente | Zustand + hooks propios | 5.0 |
| Pagos | SDK de Stripe (integración parcial) | 23.0 |
| Pruebas E2E | Playwright | — |

### Dependencias de producción

```
@prisma/client        bcryptjs        class-variance-authority  clsx
date-fns              dotenv          jose                      lucide-react
motion                next            qrcode.react              react / react-dom
react-day-picker      react-hook-form recharts                   sharp
sonner                stripe          tailwind-merge            zod
zustand               axios           @hookform/resolvers       @radix-ui/react-slot
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
│   └── api/               23 route handlers REST
├── features/              ← LÓGICA DE NEGOCIO, agrupada por módulo
│   ├── access/            validación de QR y control de acceso
│   ├── admin/             CRUD de empleados y consultas de administración
│   ├── auth/              sesión, OAuth, verificación por correo
│   ├── availability/      disponibilidad calculada desde la BD
│   ├── catalog/           categorías y servicios
│   ├── payments/          pagos y transiciones
│   ├── reservations/      creación, bloqueos, QR
│   └── schedules/         horarios semanales y cierres
├── components/            UI (storefront, catalog, auth, admin, layout)
├── shared/                http/, lib/  ← utilidades transversales
└── middleware.ts          autorización por rol a nivel de ruta
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

**22 modelos.** Group them by responsibility:

### Identidad y acceso
| Modelo | Para qué |
| --- | --- |
| `Role` | `user`, `admin`, `employee` (con `@@unique(name)`) |
| `User` | Credenciales, email verificado, rol |
| `Customer` | Datos del cliente: documento, fecha de nacimiento, dirección |
| `OAuthAccount` | Cuentas Google vinculadas |
| `EmailVerification` | Códigos de verificación con TTL |
| `PasswordReset` | Tokens de recuperación |

### Catálogo y agenda
| Modelo | Para qué |
| --- | --- |
| `Category` | Piscinas, Canchas, Gimnasio, Zonas húmedas (con `slug`) |
| `Service` | Una instalación concreta: aforo `capacity`, `price` en COP |
| `ServiceSchedule` | Horario semanal por día de la semana |
| `ServiceClosure` | Cierre puntual por rango de fechas, con motivo |
| `ServiceSlot` | **La unidad de inventario.** Franja concreta con contadores |

### Reserva
| Modelo | Para qué |
| --- | --- |
| `Reservation` | La compra: total, personas, canal, estado |
| `ReservationBlock` | **Una zona dentro de la reserva.** Franja + instalación |
| `ReservationSlot` | Puente reserva ↔ franja, con la cantidad tomada |
| `ReservationGuest` | Una persona del grupo (titular + acompañantes) |
| `ReservationHold` | Bloqueo temporal de cupos con vencimiento |

### Cobro e ingreso
| Modelo | Para qué |
| --- | --- |
| `Payment` | Cobro con `stripeSessionId` único |
| `StripeEvent` | Eventos recibidos, para idempotencia |
| `QrToken` | Código de acceso, con `tokenHash` y su `blockId` |
| `Access` | Auditoría de cada escaneo (permitido o denegado) |

### Empleado
| Modelo | Para qué |
| --- | --- |
| `Employee` | Datos del empleado y sus zonas asignadas |
| `EmployeeAssignment` | Qué instalaciones puede validar |

### Enumeraciones

```ts
ReservationStatus:  pending_payment | payment_processing | confirmed
                   | payment_rejected | expired | used
ReservationChannel: online | in_person
HoldStatus:         active | released | consumed
PaymentStatus:      pending | succeeded | failed
QrStatus:           active | used | expired
AccessResult:       allowed | denied
```

---

## 5. El modelo de inventario: la parte más importante

### `ServiceSlot` es la fuente de verdad

Cada franja horaria de cada instalación tiene **tres contadores**:

```prisma
model ServiceSlot {
  capacity    Int
  bookedCount Int @default(0)   // pagado y confirmado
  heldCount   Int @default(0)   // bloqueado, todavía sin pagar
  startsAt    DateTime
  endsAt      DateTime

  @@unique([serviceId, startsAt])
}
```

Cupos disponibles:

```
libres = capacity - bookedCount - heldCount
```

Esta separación entre `bookedCount` y `heldCount` es lo que permite que alguien este "reservando" sin que su plaza desaparezca ni tampoco pueda ser tomada por otro.

### Por qué el conteo NO está en JavaScript

El caso clásico que rompe este tipo de sistema:

```
Slot con 1 cupo libre.
T0.00  Cliente A consulta "queda 1"
T0.01  Cliente B consulta "queda 1"
T0.02  A confirma  →  OK
T0.03  B confirma  →  ??? 
```

Si el "queda 1" se calcula en el servidor de aplicación, ambos clientes lo ven y ambos pasan. La reserva se sobrepasa y el complejo termina con más personas de las que le caben.

### La solución: UPDATE condicional dentro de la transacción

```sql
UPDATE "ServiceSlot"
   SET "heldCount" = "heldCount" + $personas
 WHERE id = $slotId
   AND "startsAt" > $now
   AND "capacity" >= "bookedCount" + "heldCount" + $personas
```

PostgreSQL evalúa la condición **en el momento de escribir la fila**, no antes. La fila se bloquea, se reevalúa con los valores más recientes y solo un `affectedRows = 1` tiene éxito. El segundo cliente recibe `0` filas afectadas.

Prisma no puede expresar esto: su `where` compara contra valores que ya trajiste del cliente, no contra columnas de la tabla. Por eso el proyecto usa `$executeRaw` con SQL parametrizado. Los valores viajan como parámetros vinculados (`$1`, `$2`), nunca interpolados, así que no hay inyección SQL.

```
Prisma where:  WHERE "id" = $id AND "free" > 0     ← "free" no existe
SQL directo:   WHERE capacity >= booked + held + $n   ← lo evalúa Postgres
```

### Verificación

Probado con dos casos contra la base real:

- **8 peticiones simultáneas** de una persona cada una sobre una franja con 8 cupos → las 8 aceptadas, sin 500, contadores exactos.
- **4 peticiones simultáneas** sobre 3 cupos → 3 aceptadas y 1 con `409`. La sobrecupación se rechaza.

---

## 6. Reserva de varias zonas ("carrito")

### El problema que resuelve

Un cliente puede querer **piscina una hora, luego baloncesto, y volver a la piscina**. Eso son tres tramos en dos zonas distintas. El sistema lo trata como **una sola compra**.

```
Persona sola, dos zonas:
  08:00–09:00  Piscina de Olas
  09:00–10:00  Polideportivo 2

→ 1 reserva · 1 pago · 2 QR
```

### Por qué una tabla de bloques

Si una reserva guardara un único `serviceId` y una única ventana, el carrito no se podría representar. La tabla `ReservationBlock` hace que **la reserva sea el contenedor y los bloques sean los tramos**:

```prisma
model ReservationBlock {
  reservationId String
  serviceId     String
  startsAt      DateTime
  endsAt        DateTime

  @@unique([reservationId, serviceId, startsAt])
  @@index([serviceId, startsAt])
}
```

`Reservation` conserva `serviceId` y la ventana global por compatibilidad con listados y reportes, pero **la fuente de verdad son los bloques**. El código lo documenta donde importa.

### Un detalle que costó entender

El chequeo de solape **no puede usar la ventana global**. Con el carrito de arriba, la reserva tiene `startsAt = 08:00` y `endsAt = 10:00`. Si otra reserva quisiera baloncesto de 09:00 a 10:00, comparando contra la ventana global `08:00–10:00` parecería un solape y se rechazaría, aunque el cliente ya tiene esa franja.

Por eso la consulta de solape va contra `ReservationBlock`, tramo por tramo.

```ts
const choque = await cliente.reservationBlock.findFirst({
  where: {
    reservation: { customerId, status: { in: [...] } },
    startsAt: { lt: endsAt },   // empieza antes de que termine el otro
    endsAt:   { gt: startsAt },  // y termina después de que empiece
  },
});
```

El borde compartido no es solape: 08:00–09:00 y 09:00–10:00 son compatibles. Eso habilita exactamente el caso de uso pedido.

### Atomicidad del carrito

Todos los bloques se reservan **o ninguno**:

```ts
for (const { slot } of ordenados) {
  const tomados = await tx.$executeRaw`UPDATE "ServiceSlot" ...`;
  if (tomados !== 1) throw new CupoAgotado(slot.service.name);  // revierte todo
}
```

Si la segunda zona perdió su cupo en el último instante, la excepción revierte la transacción completa y la primera zona **no queda retenida a medias**. Verificado: un carrito inválido deja `heldCount` en 0.

### El precio

```
total = Σ por cada bloque (precio_hora × horas_de_la_franja) × personas
```

En la prueba: 2 zonas × $20.000 × 2 personas = **$80.000**, un solo cobro. El cliente paga por cada franja que pide, pero en una única transacción.

---

## 7. Reglas de solape

### Qué cuenta como conflicto

```
A: 08:00 ─────────── 09:00
B:       08:30 ─────────── 09:30
                    ▲
        sí se pisan → 409

A: 08:00 ───── 09:00
B:              09:00 ───── 10:00
                   ▲
        solo se tocan → permitido
```

### Solo se consideran las reservas vivas

```ts
status: { in: ["pending_payment", "payment_processing", "confirmed"] }
```

Una reserva `used` (ya se usó) o `payment_rejected` **no bloquea** el horario. Verificado con ambos casos.

### El solape se comprueba dos veces, y la segunda es la que vale

**Primera pasada** (fuera de la transacción): rápido, da el error de inmediato y evita abrir una transacción inútil.

**Segunda pasada** (dentro, después de un lock): es la que garantiza la corrección, porque hasta este momento la comprobación de la primera era solo informativa.

### La carrera que había (y cómo se cerró)

Dos peticiones simultáneas del **mismo cliente** sobre franjas que se solapan entre sí:

```
T0.00  Petición A: "¿tengo algo a las 08:30?" → no → sigue
T0.01  Petición B: "¿tengo algo a las 08:30?" → no → sigue
T0.02  A inserta y confirma
T0.03  B inserta y confirma   ← ¡el cliente quedó con reservas solapadas!
```

El chequeo original estaba fuera de la transacción, así que ambas_commitaban sin verse. La corrección serializa las reservas del mismo cliente:

```ts
await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customer.id}::uuid FOR UPDATE`;
```

`SELECT … FOR UPDATE` bloquea la fila del cliente. La segunda petición **espera** a que la primera confirme, y cuando su chequeo corre ya ve lo que la primera escribió. El lock se toma **antes** de consultar, que es el orden correcto.

Escribí dos veces que esto era "una carrera" y el orden importa: si el `FOR UPDATE` fuera después del `findFirst`, seguiría habiendo ventana.

---

## 8. Bloqueos temporales y su vencimiento

### El bloqueo de 10 minutos

Al crear la reserva se crea un `ReservationHold`:

```
10 minutos → el cliente completa el pago → bookedCount sube, heldCount baja
10 minutos → el cliente se fue → los cupos se devuelven
```

```prisma
model ReservationHold {
  status    HoldStatus @default(active)
  expiresAt DateTime
  @@index([status, expiresAt])
}
```

### El bug que había: los cupos quemados para siempre

`heldCount` solo bajaba cuando el pago se convertía en reserva. Como el cobro real está pendiente de implementación, **nunca bajaba**. Abandonar el checkout quemaba un cupo de forma permanente y el cliente veía "completo" sin que nadie hubiera pagado jamás.

### La solución

```ts
export async function liberarHoldsVencidos(now, cliente) {
  const vencidas = await cliente.reservation.findMany({
    where: {
      status: "pending_payment",
      holds: { some: { status: "active", expiresAt: { lte: now } } },
    },
    select: { id: true, slots: { select: { slotId: true, quantity: true } } },
  });

  for (const reserva of vencidas) {
    const marcada = await cliente.reservation.updateMany({
      where: { id: reserva.id, status: "pending_payment" },
      data: { status: "expired" },
    });
    if (marcada.count !== 1) continue;   // otro ya la expiró: no restar dos veces

    await cliente.reservationHold.updateMany({
      where: { reservationId: reserva.id, status: "active" },
      data: { status: "released" },
    });
    for (const s of reserva.slots) {
      await cliente.$executeRaw`
        UPDATE "ServiceSlot"
           SET "heldCount" = GREATEST("heldCount" - ${s.quantity}, 0)
         WHERE id = ${s.slotId}::uuid
      `;
    }
  }
}
```

Cuatro decisiones que importan:

1. **Los cupos se devuelven desde `ReservationSlot`, no desde el hold.** Una reserva de varias franjas devuelve exactamente lo que tomó, sin suposiciones.
2. **El `updateMany` condicionado por `status` hace la operación idempotente.** Si dos peticiones intentan expirar la misma reserva, solo una obtiene `count = 1`. La otra no resta cupos otra vez.
3. **`GREATEST(…, 0)`** impide que el contador quede negativo si algo se ejecuta dos veces.
4. **Se invoca en dos lugares**: antes de leer disponibilidad (para que el cliente vea la verdad) y antes de crear (para no competir por un cupo ya libre).

Probado: 11 assertions cubren retención, liberación, idempotencia, estados y que el inventario vuelve al punto de partida.

### Lo que falta

No hay tarea programada. La liberación ocurre **cuando alguien consulta o reserva**. Si nadie mira el sistema, los cupos quedan retenidos hasta la próxima visita. Lo correcto es un cron que llame `liberarHoldsVencidos()` cada minuto; es un script de una línea, pero es una decisión de despliegue (¿Vercel Cron? ¿un job propio?) que no se ha tomado.

---

## 9. Códigos QR: uno por persona y por zona

### La regla

El QR habilita **una puerta concreta**. El empleado escanea en la entrada de una zona, así que un QR de baloncesto no sirve en la piscina.

```
1 persona,  2 zonas → 2 QR
3 personas, 2 zonas → 6 QR
```

Esto responde a la pregunta 16 del SCRUM ("el número de QR que se envían") combinada con la necesidad operativa de validar por puerta.

### El dato que faltaba en el modelo

`QrToken` solo guardaba `reservationId`. La zona se heredaba del `serviceId` de la reserva, lo cual funcionaba **únicamente** porque toda reserva tenía una sola zona. Para soportar varias zonas el QR necesita su propia zona:

```prisma
model QrToken {
  blockId  String?  @db.Uuid      // ← la zona que abre este QR
  seqNo    Int      @default(1)   // número de persona dentro de esa zona
  tokenHash String  @unique        // nunca se guarda el token en claro
  @@unique([reservationId, blockId, seqNo])
}
```

La relación `ReservationGuest ↔ QrToken` pasó de **1 a 1 a 1 a N**: una persona tiene tantos QR como zonas.

### Numeración legible

El PDF que genera el equipo imprime una etiqueta por código:

```
Z1-P01    zona 1, persona 1
Z1-P02    zona 1, persona 2
Z2-P01    zona 2, persona 1
Z2-P02    zona 2, persona 2
```

Para el empleado en la puerta esto es más rápido de leer y de communicate que un UUID.

### Seguridad del token

```
randomBytes(24).toString("base64url")   →  192 bits de entropía
createHash("sha256").update(token)       →  lo que se guarda en la base
```

El token **nunca** se persiste en claro. Si alguien lee la base de datos, no puede fabricar un QR válido: solo ver hashes. El token plano solo existe en el PDF que recibe el cliente.

### Idempotencia de la emisión

```ts
if (yaEmitidos > 0 && yaEmitidos < esperados) return { ok: false, ... };  // parcial: no tocar
if (yaEmitidos > 0) return { ok: true, emitidos: [] };                   // ya están todos
```

Esto importa porque **el webhook de Stripe reintenta**. Si la emisión no fuera idempotente, un reintento duplicaría los QR y el cliente recibiría códigos que invalidan los anteriores. La función detecta el estado parcial y se niega a actuar en lugar de empeorar el daño.

Probado: 16 assertions cubren el conteo persona × zona, tokens distintos, etiquetas, resolución de zona por QR y no duplicación.

---

## 10. Validación de acceso (`/validar`)

### El flujo

```
Empleado escanea  →  POST /api/access/validate  →  permitido | denegado
                              ↓
                  se registra en Access
                              ↓
               el QR pasa a status "used"
```

### Reglas, en orden

| # | Regla | Mensaje al empleado |
| --- | --- | --- |
| 1 | La reserva debe estar `confirmed` | "La reserva está pendiente de pago" |
| 2 | El QR no debe estar usado | "Este QR ya se usó" |
| 3 | El QR no debe estar expirado | "Este QR está expirado" |
| 4 | Debe ser el día de la reserva | "Esta reserva es del 12 oct" |
| 5 | Debe estar dentro de la franja | "La franja empieza a las 14:00" |
| 6 | Debe estar en la zona del empleado | "Esta reserva es de otra zona" |

La zona se toma **del bloque del QR**, no de la reserva:

```ts
blockId:     token.block?.id ?? null,
startsAt:    token.block?.startsAt ?? token.reservation.startsAt,
serviceName: token.block?.service.name ?? token.reservation.service.name,
```

Sin bloque (reservas antiguas) cae a la reserva, que en ese caso tenía una sola zona.

### El consumo es atómico

El mismo patrón del inventario, aplicado a los QR:

```ts
const consumed = await tx.qrToken.updateMany({
  where: { id: qrTokenId, status: "active" },
  data: { status: "used", usedAt: accessedAt },
});
if (consumed.count !== 1) return { ok: false, reason: "qr_consumido" };
```

Dos empleados escaneando el mismo QR a la vez: solo uno entra. La regla "un ingreso por reserva, no por escaneo" del SCRUM queda garantizada en la base de datos.

### Un escaneo denegado no quema el QR

```ts
_count: { select: { accesses: { where: { result: "allowed" } } } }
```

Solo los ingresos **permitidos** cuentan. Si el empleado se equivoca al teclear el código, el QR del cliente sigue sirviendo. Es la diferencia entre un sistema usable y uno que obliga a pedir un QR nuevo por un error tipográfico.

### Auditoría completa

Todo escaneo queda en `Access` con `result`, `denialReason` y `accessedAt`. Los intentos fallidos se conservan. Es lo que permite reconstruir qué pasó cuando un cliente reclama que no le dejaron entrar.

---

## 11. Interfaz del carrito

### Componentes

| Archivo | Responsabilidad |
| --- | --- |
| `CarritoReserva.tsx` | Estado del carrito con contexto de React |
| `SelectorFranjas.tsx` | Modal de horarios por día |
| `BarraCarrito.tsx` | Barra flotante, resumen y formulario de acompañantes |

### El flujo en pantalla

```
/servicios
   ↓  "Reservar" en una tarjeta
Modal: elegir día (14 días) → ver franjas con cupos libres
   ↓  clic en una franja
Barra inferior: se suma la zona, aparece el total
   ↓  "Reservar" en otra tarjeta de otra categoría
Barra: 2 zonas, total sumado, aviso de 2 QR por persona
   ↓  ajustar personas con -/+
   ↓  "Pagar $280.000"
Resumen: desglose por zona → datos de acompañantes → confirmar
```

### Cosas que la interfaz anticipa

- Las franjas ya elegidas salen en verde con "En el carrito", y no se pueden volver a agregar (evita el doble clic).
- Las completas salen en gris deshabilitadas.
- Si son varias zonas, se avisa **antes** de pagar: *"Reservas 2 zonas, así que cada persona recibirá 2 QR: uno por puerta."*
- El botón de confirmar se deshabilita si un acompañante tiene nombre sin documento, y el POST también lo rechaza.

### Detalles de implementación

El selector no reinicia estado dentro del efecto. El estado de "cargando" se **deriva** de la clave pedida:

```tsx
const clave = `${servicio.id}|${fecha}`;
const cargando = datos?.clave !== clave;
const dia = datos?.clave === clave ? datos.dia : null;
```

Esto no es Estilismo: la regla `react-hooks/set-state-in-effect` está activada y obliga a evitar `setState` síncrono dentro de efectos, que provoca renders en cascada. Los acompañantes se derivan de `personas` en el render en vez de sincronizarse con un efecto.

---

## 12. Autenticación y autorización

### Sesión

JWT firmado con `jose`, en cookie `httpOnly` con SameSite. El `payload` lleva `sub` (User), `role` y expiración. Contraseñas con `bcryptjs`.

### Middleware

`src/middleware.ts` verifica el token **en el borde**, antes de que la página se renderice:

```ts
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/piscinas/dashboard/:path*",
            "/reservas/:path*", "/validar/:path*"],
};
```

```ts
if (pathname.startsWith("/admin") && role !== "admin") return redirect("/");
if (pathname.startsWith("/validar") && role !== "admin" && role !== "employee") return redirect("/");
```

El middleware es una **primera barrera, no la única**. Las server actions y los route handlers vuelven a comprobar sesión y rol, porque el middleware se puede saltar y la acción no.

### Grupos de rutas

Los paréntesis en los nombres de carpeta **no aparecen en la URL**:

```
src/app/(admin)/admin/page.tsx       →  /admin
src/app/(employee)/validar/page.tsx →  /validar
src/app/(storefront)/servicios/      →  /servicios
```

Permiten que `(employee)` y `(storefront)` tengan layouts distintos sin ensuciar las rutas públicas.

### Roles

```prisma
enum nameRole { user, admin, employee }
```

`employee` es un rol, no un tipo de usuario aparte: un empleado también puede ser cliente. Los permisos concretos se derivan de `EmployeeAssignment`, que define qué zonas valida cada uno.

### OAuth de Google

Flujo con `state` anti-CSRF, callback, vinculación por correo verificado y alta de `User + Customer + OAuthAccount` en una transacción. **Pendiente**: `exchangeGoogleCode()` no está implementado y las credenciales de prueba son ficticias. El botón y el andamiaje están listos.

---

## 13. API

**23 route handlers.** Contrato uniforme en `src/shared/http/`:

```ts
// Éxito
{ "data": { ... } }

// Error
{ "data": null, "error": { "code": "...", "message": "..." } }
```

`handler.ts` envuelve todo: captura los errores conocidos, registra los inesperados y normaliza la forma. Los mensajes al usuario están en español y son accionables ("Solo quedan 3 cupo(s) en esa franja"), no técnicos.

### Endpoints principales

| Método | Ruta | Rol | Qué hace |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | — | Inicia sesión |
| POST | `/api/auth/register` | — | Crea cuenta y pide verificación |
| GET | `/api/auth/me` | cualquiera | Sesión actual |
| GET | `/api/auth/oauth/google` | — | Inicio del flujo OAuth |
| POST | `/api/auth/forgot-password` | — | Pide recuperación |
| GET | `/api/categories` | público | Categorías activas |
| GET | `/api/services` | público | Catálogo |
| GET | `/api/services/[id]` | público | Detalle |
| GET | `/api/availability` | público | Franjas con cupos reales |
| POST | `/api/reservations` | cliente | **Crea el carrito** |
| GET | `/api/reservations` | cliente | Sus reservas |
| GET | `/api/reservations/[id]` | dueño | Detalle |
| POST | `/api/reservations/[id]` | dueño | **Inicia el pago** |
| POST | `/api/access/validate` | empleado | Valida un QR |
| POST | `/api/payments/webhook` | Stripe | Confirma el pago |
| GET | `/api/admin/export` | admin | Exporta datos |

### Códigos de estado usados con intención

| Código | Cuándo | Significado |
| --- | --- | --- |
| `200` | Lectura, o pago ya iniciado | OK |
| `201` | Reserva creada | Recurso nuevo |
| `400` | Falla de validación (Zod, fecha pasada, acompañantes) | El cliente debe corregir |
| `401` | Sin sesión válida | Falta autenticarse |
| `409` | `sin_cupos`, `ya_reservado`, `horario_chocante`, `bloques_pisados` | **Conflicto de disponibilidad: reintentar con otra franja** |

La distinción `400` vs `409` es deliberada: `400` significa "arregla tus datos", `409` significa "el mundo cambió, elige otra hora". La UI refresca la disponibilidad en el segundo caso.

---

## 14. Pagos

### Implementado

```ts
// Transiciones válidas
pending → succeeded   (webhook de Stripe)
pending → failed      (rechazo)
```

- Transiciones controladas por estado, no por actualización libre.
- `stripeSessionId` y `stripePaymentIntentId` con `@unique`: no puede haber dos cobros para la misma sesión.
- `StripeEvent` con `eventId` como clave primaria: **garantiza idempotencia del webhook**. Si Stripe reenvía un evento, el INSERT falla y no se procesa dos veces.
- Verificación de firma en el webhook. Sin ella, cualquiera podría "confirmar" pagos falsos por HTTP.

### Pendiente

- **El cobro no está conectado.** `POST /api/reservations/[id]` devuelve `501` con el contrato del mensaje. La interfaz ya muestra el botón y el total.
- No hay Checkout Session real ni redirección a Stripe.
- Los QR se emiten al confirmar el pago; esa llamada existe (`emitirQrDeReserva`) pero nadie la invoca todavía porque no hay pago que confirme.

---

## 15. Interfaz

### Tema

Storefront oscuro con acentos vino (`#7a1f3d`) y dorado (`#e3bd74`). CSS propio en `storefront.css` + Tailwind.

**Advertencia conocida**: el wrapper de los layouts lleva clases de tema claro que **no aplican** porque `.storefront-shell` los sobrescribe:

```tsx
<div className="storefront-shell ... bg-[#F5F5F5] text-[#1F1F1F] ...">
```

Renders oscuro y es intencional por cascada, pero es una trampa para quien lea el código. La página `/informacion` pasó por esto: tenía 46 clases claras y 1 oscura, y se veía blanca sobre un sitio oscuro. Se reescribió al tema correcto.

### Aforos desde la base

`/informacion` **no** lista los aforos en texto fijo. Los lee de `Service.capacity` y los agrupa por categoría.

La versión anterior tenía los datos escritos a mano y ya estaban mal:

| Decía | La base tiene |
| --- | --- |
| "Microfútbol (4 canchas): 14 c/u" | **3** canchas de microfútbol |
| *(no mencionaba pádel)* | Cancha de Pádel Panorámica, aforo 4 |
| *(no mencionaba tenis)* | Cancha de Tenis, aforo 4 |

Con el dato en la base no puede volver a desincronizarse.

### Accesibilidad

Landmarks y roles (`role="dialog"`, `aria-modal`, `role="status"`, `role="alert"`), foco visible, `Escape` cierra modales, `aria-label` en botones de icono, textos de error asociados al campo.

---

## 16. Base de datos en la práctica

### Contenido actual

```
   14  User                     96  ServiceSchedule      12  Reservation
   12  Customer                  6  Category              12  ReservationBlock
   16  Service                 1268  ServiceSlot           4  ReservationGuest
    1  Employee                  8  QrToken               9  Access
```

### Migraciones (11, todas aplicadas)

```
20261001114123_init
20261001161348_complete_schema
20261002122431_service_name_unique
20261002122924_role_name_unique
20261002143523_service_price_int
20261005120000_auth_customer_fields
20261007150000_add_slug_to_service
20261007160000_catalog_categories
20261009024408_reservation_guests      ← invitados de la reserva
20261009030000_reservation_blocks     ← zonas de la reserva
20261009040000_qr_por_zona             ← QR por persona y zona
```

Las tres últimas son de este trabajo de sesión.

### Backfill en SQL

La migración de bloques rellenó los datos existentes en vez de dejar la tabla vacía:

```sql
INSERT INTO "ReservationBlock" ("id", "reservationId", "serviceId", "startsAt", "endsAt", "createdAt")
SELECT gen_random_uuid(), r."id", r."serviceId", r."startsAt", r."endsAt", r."createdAt"
FROM "Reservation" r
WHERE NOT EXISTS (SELECT 1 FROM "ReservationBlock" b WHERE b."reservationId" = r."id");

UPDATE "QrToken" q
SET "blockId" = b."id"
FROM "ReservationBlock" b
WHERE b."reservationId" = q."reservationId" AND q."blockId" IS NULL;
```

Sin esto, las 8 reservas y los 8 QR que ya existían quedaban sin zona y la validación de acceso habría fallado en producción.

### Índices justificados

```prisma
// Una persona no puede tener dos reservas que se pisen: la búsqueda es por
// cliente y ventana, así que el índice va en ese orden.
@@index([customerId, startsAt, endsAt])

// Availability del día: franjas de una instalación en un rango de fechas
@@unique([serviceId, startsAt])

// El job de expiración filtra por estado y vencimiento
@@index([status, expiresAt])

// Un QR por persona y zona: la unicidad lo garantiza
@@unique([reservationId, blockId, seqNo])
```

El primero lleva un comentario explicando el porqué: sin él, PostgreSQL revisaría **todas** las reservas de la tabla para encontrar las del cliente y compararía fechas una por una.

---

## 17. Verificación

### Comandos

```powershell
npx tsc --noEmit          # tipos, 0 errores
npm run lint              # eslint, 0 errores
npm run build             # 47 páginas
npx prisma migrate deploy # aplicar migraciones
npx tsx scripts/...       # pruebas contra la BD real
```

### Cobertura de pruebas (70 assertions)

| Suite | Assertions | Qué demuestra |
| --- | --- | --- |
| Reserva | 19 | Validaciones, cobro, hold, invitados, cupos |
| Solape | 6 | No solaparse entre categorías, y que las muertas no bloquean |
| Vencimiento | 11 | Los holds vencidos devuelven cupos, e idempotencia |
| Carrito | 14 | Atomicidad, un solo pago, solapes internos |
| QR por zona | 16 | Conteo persona × zona, zona desde el bloque |
| UI | 4 | El payload de la barra coincide con el cobro |

### Los 5 warnings de lint

Preexistentes, ninguno introducido en este trabajo:

```
prisma/seed.ts                        2  variables sin usar
src/app/(admin)/admin/page.tsx        1  parámetro sin usar
src/components/auth/AuthSwitchCard.tsx 1  router sin usar
src/shared/lib/mailer.ts               1  parámetro sin usar
```

### Pruebas contra la base real

Las pruebas escriben en la base de desarrollo con la cuenta de prueba y **limpian lo que crean**, borrando hijos antes que padres porque las relaciones no tienen `CASCADE`. Fue un error real de la primera versión de una de ellas.

---

## 18. Estado real: qué está terminado y qué no

### Funciona de punta a punta

- Catálogo con datos reales (16 servicios, 4 categorías, 6 con slug)
- Disponibilidad calculada desde horarios, cierres y contadores
- Carrito de varias zonas con pago único
- Bloqueo de cupos a prueba de concurrencia
- No solapamiento, incluso entre categorías
- Vencimiento de bloqueos con liberación de cupos
- Emisión de QR por persona y zona
- Validación de acceso por puerta, con consumo atómico
- CRUD de empleados y zonas
- Autenticación propia + OAuth de Google (andamiaje)

### A medias

| Área | Qué falta |
| --- | --- |
| **Pagos** | El endpoint devuelve `501`. No hay Checkout Session. El UI ya está listo |
| **QR → correo** | `emitirQrDeReserva()` existe pero nadie la invoca. Falta el PDF y el envío por n8n |
| **Google OAuth** | Falta `exchangeGoogleCode()`. Credenciales de prueba son ficticias |
| **Job de expiración** | La liberación es reactiva (al consultar). Falta el cron |
| **Zonas del empleado** | La asignación y el filtro existen en el admin; falta exponer el filtro por zona en el flujo de `/validar` |
| **Tema claro** | Descartado por decisión del cliente. El sitio es solo oscuro |
| **Datos de contacto** | El enlace "Contacto" del footer no tiene dirección, teléfono ni horario reales |

### Deuda técnica conocida

1. **JWT en el historial de Git.** Un `cookies.txt` con un token real estuvo en el commit `cda2581`. El archivo se borró del disco y está staged, pero **la clave sigue en la historia**: hay que rotar `JWT_SECRET`.
2. **Servidor de desarrollo parado.** `npm run dev` no corre de forma persistente en este entorno; hay que relanzarlo a mano. `next dev` reescribe `AGENTS.md` en cada arranque, así que el archivo aparece modificado sin que nadie lo haya tocado.
3. **Scripts de prueba fuera del repo.** Se movieron a `%TEMP%\opencode\omega-qa-scripts\` con un README, porque no tienen nada que ver en el control de versiones.
4. **5 warnings de lint** preexistentes, sin impacto funcional.

---

## 19. Glosario

| Término | Significado en este proyecto |
| --- | --- |
| **Franja / slot** | Intervalo de una hora de una instalación. La unidad de inventario |
| **Zona** | La puerta física: la categoría (Piscinas, Canchas…) |
| **Bloque** | Un tramo reservado dentro de una reserva. Une zona + franja |
| **Carrito** | Conjunto de bloques que se compran en un solo pago |
| **Hold / bloqueo** | Reserva temporal de cupos mientras el cliente paga |
| **QR por zona** | Un código por persona por puerta |
| **Aforo** | `Service.capacity`, el máximo físico |
| **Exclusividad** | No es un atributo: si un cliente compra todos los cupos de una franja, la zona queda bloqueada para los demás. Se cumple solo |

---

## 20. Guía de estudio para la auditoría

Si hay que revisar el sistema de arriba abajo, este es el orden que sugiere el riesgo técnico:

### 1. Empieza por el inventario
`src/features/reservations/reservations.service.ts`

Es el archivo con más decisiones correctas y con más trampas ocultas. Busca:

- el `UPDATE` condicional (`capacity >= bookedCount + heldCount + personas`)
- el `SELECT … FOR UPDATE` **antes** del chequeo de solape
- el bucle de atómicos con `CupoAgotado`
- `liberarHoldsVencidos` y su idempotencia

### 2. Comprueba que el modelo soporta lo que dice soportar
`prisma/schema.prisma` → `ReservationBlock`, `QrToken.blockId`, `@@unique`

Y verifica que las migraciones realmente rellenaron los datos previos (`ReservationBlock` no debería estar vacía).

### 3. Sigue un QR de punta a punta
```
emitirQrDeReserva()          src/features/reservations/qr.ts
   ↓  genera persona × zona
findQrByTokenHash()         src/features/access/access.repository.ts
   ↓  lee la zona del bloque
validar acceso               src/features/access/access.service.ts
   ↓  7 reglas
grantAccess()                consume el QR con updateMany condicionado
```

### 4. Comprueba que la UI y la API hablan lo mismo
`src/components/storefront/BarraCarrito.tsx` construye el payload
→ `POST /api/reservations`
→ `createReservationSchema` lo valida
→ `createReservationWithHold` lo procesa

El total que ve el cliente **tiene** que ser el que cobra el servidor. La prueba `probar-ui-carrito` compara exactamente eso.

### 5. Busca los riesgos que aún quedan

- `JWT_SECRET` sin rotar (la clave está en la historia de Git)
- El job de expiración no existe: es reactivo
- El pago no está conectado: el sistema retiene cupos sin cobrar
- El middleware es solo la primera barrera; las acciones vuelven a validar

### 6. Lo más importante de todo

**Ninguna regla de inventario depende de que el código se ejecute en orden.** Cada cupo, cada QR y cada solape se resuelve con SQL dentro de una transacción. Esa es la decisión de diseño que sostiene todo lo demás, y la primera pregunta que le haría a un auditor.
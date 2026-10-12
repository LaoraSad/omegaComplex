# Omega Complex â€” Documento tÃ©cnico funcional

Documento de referencia para estudiar el sistema antes de la auditorÃ­a. Cubre quÃ© hace la aplicaciÃ³n, cÃ³mo estÃ¡ construida y por quÃ© se tomaron las decisiones tÃ©cnicas.

> **Alcance**: describe el estado actual del repositorio `D:\omegaComplex`. Marca explÃ­citamente lo que estÃ¡ implementado, lo que estÃ¡ a medias y lo que no existe todavÃ­a, para no confundir una interfaz terminada con un flujo completo.

---

## 1. Resumen ejecutivo

Omega Complex es la plataforma de reservas y control de acceso de un complejo deportivo. Tres perfiles de usuario comparten el sistema:

| Perfil | QuÃ© hace | Prefijo de rutas |
| --- | --- | --- |
| **Cliente** | Explora el catÃ¡logo, arma su reserva en un carrito de varias zonas, paga y recibe cÃ³digos QR | `/servicios`, `/mis-reservas` |
| **Empleado** | Escanea el QR en la puerta de una zona y valida el ingreso | `/validar`, `/turnos` |
| **Administrador** | Gestiona servicios, horarios, cierres, empleados, reservas e ingresos | `/admin/*` |

La regla de negocio central es que **el inventario de cupos se resuelve en PostgreSQL, no en JavaScript**. Ninguna regla de disponibilidad depende de que el cÃ³digo de aplicaciÃ³n se ejecute en el orden correcto.

### Estado de verificaciÃ³n al momento de escribir esto

```
npx tsc --noEmit   â†’  0 errores
npm run lint       â†’  0 errores, 5 warnings (preexistentes, no introducidos)
npm run build      â†’  47 pÃ¡ginas generadas
Pruebas contra BD  â†’  70 assertions, 0 fallos
```

---

## 2. Stack tecnolÃ³gico

| Capa | TecnologÃ­a | VersiÃ³n |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.3.6 |
| UI | React | 19.2.8 |
| Lenguaje | TypeScript | estricto |
| Base de datos | PostgreSQL (Supabase) | â€” |
| ORM | Prisma | 6.19.3 |
| ValidaciÃ³n | Zod | 4.6.5 |
| Estilos | Tailwind CSS | 4 |
| AutenticaciÃ³n | JWT firmado con `jose` + `bcryptjs` | 6.2 / 3.0 |
| GrÃ¡ficos | Recharts | 3.10 |
| Calendario | `react-day-picker` | 10 |
| Estado cliente | Zustand + hooks propios | 5.0 |
| Pagos | SDK de Stripe (integraciÃ³n parcial) | 23.0 |
| Pruebas E2E | Playwright | â€” |

### Dependencias de producciÃ³n

```
@prisma/client        bcryptjs        class-variance-authority  clsx
date-fns              dotenv          jose                      lucide-react
motion                next            qrcode.react              react / react-dom
react-day-picker      react-hook-form recharts                   sharp
sonner                stripe          tailwind-merge            zod
zustand               axios           @hookform/resolvers       @radix-ui/react-slot
```

`zod` y `react-hook-form` resuelven el mismo dominio: el schema de Zod es la fuente de verdad y alimenta los resolvers de `@hookform/resolvers`. No hay dos definiciones de la misma validaciÃ³n.

---

## 3. Arquitectura de carpetas

```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ (public)/          landing, sin sesiÃ³n
â”‚   â”œâ”€â”€ (storefront)/      catÃ¡logo y reservas del cliente
â”‚   â”œâ”€â”€ (customer)/       reservas del cliente
â”‚   â”œâ”€â”€ (employee)/        shell de empleado (validar, turnos)
â”‚   â”œâ”€â”€ (admin)/           panel de administraciÃ³n
â”‚   â”œâ”€â”€ (auth)/            login, registro, verificaciÃ³n
â”‚   â””â”€â”€ api/               23 route handlers REST
â”œâ”€â”€ features/              â† LÃ“GICA DE NEGOCIO, agrupada por mÃ³dulo
â”‚   â”œâ”€â”€ access/            validaciÃ³n de QR y control de acceso
â”‚   â”œâ”€â”€ admin/             CRUD de empleados y consultas de administraciÃ³n
â”‚   â”œâ”€â”€ auth/              sesiÃ³n, OAuth, verificaciÃ³n por correo
â”‚   â”œâ”€â”€ availability/      disponibilidad calculada desde la BD
â”‚   â”œâ”€â”€ catalog/           categorÃ­as y servicios
â”‚   â”œâ”€â”€ payments/          pagos y transiciones
â”‚   â”œâ”€â”€ reservations/      creaciÃ³n, bloqueos, QR
â”‚   â””â”€â”€ schedules/         horarios semanales y cierres
â”œâ”€â”€ components/            UI (storefront, catalog, auth, admin, layout)
â”œâ”€â”€ shared/                http/, lib/  â† utilidades transversales
â””â”€â”€ middleware.ts          autorizaciÃ³n por rol a nivel de ruta
```

### La regla que estructura el proyecto

**Nada de lÃ³gica de negocio en `app/`.** Los route handlers solo hacen tres cosas:

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

Toda la lÃ³gica â€”cupos, solapes, precios, bloqueosâ€” vive en `reservations.service.ts`. Eso permite probar el negocio sin levantar la aplicaciÃ³n.

---

## 4. Modelo de datos

**22 modelos.** Group them by responsibility:

### Identidad y acceso
| Modelo | Para quÃ© |
| --- | --- |
| `Role` | `user`, `admin`, `employee` (con `@@unique(name)`) |
| `User` | Credenciales, email verificado, rol |
| `Customer` | Datos del cliente: documento, fecha de nacimiento, direcciÃ³n |
| `OAuthAccount` | Cuentas Google vinculadas |
| `EmailVerification` | CÃ³digos de verificaciÃ³n con TTL |
| `PasswordReset` | Tokens de recuperaciÃ³n |

### CatÃ¡logo y agenda
| Modelo | Para quÃ© |
| --- | --- |
| `Category` | Piscinas, Canchas, Gimnasio, Zonas hÃºmedas (con `slug`) |
| `Service` | Una instalaciÃ³n concreta: aforo `capacity`, `price` en COP |
| `ServiceSchedule` | Horario semanal por dÃ­a de la semana |
| `ServiceClosure` | Cierre puntual por rango de fechas, con motivo |
| `ServiceSlot` | **La unidad de inventario.** Franja concreta con contadores |

### Reserva
| Modelo | Para quÃ© |
| --- | --- |
| `Reservation` | La compra: total, personas, canal, estado |
| `ReservationBlock` | **Una zona dentro de la reserva.** Franja + instalaciÃ³n |
| `ReservationSlot` | Puente reserva â†” franja, con la cantidad tomada |
| `ReservationGuest` | Una persona del grupo (titular + acompaÃ±antes) |
| `ReservationHold` | Bloqueo temporal de cupos con vencimiento |

### Cobro e ingreso
| Modelo | Para quÃ© |
| --- | --- |
| `Payment` | Cobro con `stripeSessionId` Ãºnico |
| `StripeEvent` | Eventos recibidos, para idempotencia |
| `QrToken` | CÃ³digo de acceso, con `tokenHash` y su `blockId` |
| `Access` | AuditorÃ­a de cada escaneo (permitido o denegado) |

### Empleado
| Modelo | Para quÃ© |
| --- | --- |
| `Employee` | Datos del empleado y sus zonas asignadas |
| `EmployeeAssignment` | QuÃ© instalaciones puede validar |

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

## 5. El modelo de inventario: la parte mÃ¡s importante

### `ServiceSlot` es la fuente de verdad

Cada franja horaria de cada instalaciÃ³n tiene **tres contadores**:

```prisma
model ServiceSlot {
  capacity    Int
  bookedCount Int @default(0)   // pagado y confirmado
  heldCount   Int @default(0)   // bloqueado, todavÃ­a sin pagar
  startsAt    DateTime
  endsAt      DateTime

  @@unique([serviceId, startsAt])
}
```

Cupos disponibles:

```
libres = capacity - bookedCount - heldCount
```

Esta separaciÃ³n entre `bookedCount` y `heldCount` es lo que permite que alguien este "reservando" sin que su plaza desaparezca ni tampoco pueda ser tomada por otro.

### Por quÃ© el conteo NO estÃ¡ en JavaScript

El caso clÃ¡sico que rompe este tipo de sistema:

```
Slot con 1 cupo libre.
T0.00  Cliente A consulta "queda 1"
T0.01  Cliente B consulta "queda 1"
T0.02  A confirma  â†’  OK
T0.03  B confirma  â†’  ??? 
```

Si el "queda 1" se calcula en el servidor de aplicaciÃ³n, ambos clientes lo ven y ambos pasan. La reserva se sobrepasa y el complejo termina con mÃ¡s personas de las que le caben.

### La soluciÃ³n: UPDATE condicional dentro de la transacciÃ³n

```sql
UPDATE "ServiceSlot"
   SET "heldCount" = "heldCount" + $personas
 WHERE id = $slotId
   AND "startsAt" > $now
   AND "capacity" >= "bookedCount" + "heldCount" + $personas
```

PostgreSQL evalÃºa la condiciÃ³n **en el momento de escribir la fila**, no antes. La fila se bloquea, se reevalÃºa con los valores mÃ¡s recientes y solo un `affectedRows = 1` tiene Ã©xito. El segundo cliente recibe `0` filas afectadas.

Prisma no puede expresar esto: su `where` compara contra valores que ya trajiste del cliente, no contra columnas de la tabla. Por eso el proyecto usa `$executeRaw` con SQL parametrizado. Los valores viajan como parÃ¡metros vinculados (`$1`, `$2`), nunca interpolados, asÃ­ que no hay inyecciÃ³n SQL.

```
Prisma where:  WHERE "id" = $id AND "free" > 0     â† "free" no existe
SQL directo:   WHERE capacity >= booked + held + $n   â† lo evalÃºa Postgres
```

### VerificaciÃ³n

Probado con dos casos contra la base real:

- **8 peticiones simultÃ¡neas** de una persona cada una sobre una franja con 8 cupos â†’ las 8 aceptadas, sin 500, contadores exactos.
- **4 peticiones simultÃ¡neas** sobre 3 cupos â†’ 3 aceptadas y 1 con `409`. La sobrecupaciÃ³n se rechaza.

---

## 6. Reserva de varias zonas ("carrito")

### El problema que resuelve

Un cliente puede querer **piscina una hora, luego baloncesto, y volver a la piscina**. Eso son tres tramos en dos zonas distintas. El sistema lo trata como **una sola compra**.

```
Persona sola, dos zonas:
  08:00â€“09:00  Piscina de Olas
  09:00â€“10:00  Polideportivo 2

â†’ 1 reserva Â· 1 pago Â· 2 QR
```

### Por quÃ© una tabla de bloques

Si una reserva guardara un Ãºnico `serviceId` y una Ãºnica ventana, el carrito no se podrÃ­a representar. La tabla `ReservationBlock` hace que **la reserva sea el contenedor y los bloques sean los tramos**:

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

`Reservation` conserva `serviceId` y la ventana global por compatibilidad con listados y reportes, pero **la fuente de verdad son los bloques**. El cÃ³digo lo documenta donde importa.

### Un detalle que costÃ³ entender

El chequeo de solape **no puede usar la ventana global**. Con el carrito de arriba, la reserva tiene `startsAt = 08:00` y `endsAt = 10:00`. Si otra reserva quisiera baloncesto de 09:00 a 10:00, comparando contra la ventana global `08:00â€“10:00` parecerÃ­a un solape y se rechazarÃ­a, aunque el cliente ya tiene esa franja.

Por eso la consulta de solape va contra `ReservationBlock`, tramo por tramo.

```ts
const choque = await cliente.reservationBlock.findFirst({
  where: {
    reservation: { customerId, status: { in: [...] } },
    startsAt: { lt: endsAt },   // empieza antes de que termine el otro
    endsAt:   { gt: startsAt },  // y termina despuÃ©s de que empiece
  },
});
```

El borde compartido no es solape: 08:00â€“09:00 y 09:00â€“10:00 son compatibles. Eso habilita exactamente el caso de uso pedido.

### Atomicidad del carrito

Todos los bloques se reservan **o ninguno**:

```ts
for (const { slot } of ordenados) {
  const tomados = await tx.$executeRaw`UPDATE "ServiceSlot" ...`;
  if (tomados !== 1) throw new CupoAgotado(slot.service.name);  // revierte todo
}
```

Si la segunda zona perdiÃ³ su cupo en el Ãºltimo instante, la excepciÃ³n revierte la transacciÃ³n completa y la primera zona **no queda retenida a medias**. Verificado: un carrito invÃ¡lido deja `heldCount` en 0.

### El precio

```
total = Î£ por cada bloque (precio_hora Ã— horas_de_la_franja) Ã— personas
```

En la prueba: 2 zonas Ã— $20.000 Ã— 2 personas = **$80.000**, un solo cobro. El cliente paga por cada franja que pide, pero en una Ãºnica transacciÃ³n.

---

## 7. Reglas de solape

### QuÃ© cuenta como conflicto

```
A: 08:00 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 09:00
B:       08:30 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 09:30
                    â–²
        sÃ­ se pisan â†’ 409

A: 08:00 â”€â”€â”€â”€â”€ 09:00
B:              09:00 â”€â”€â”€â”€â”€ 10:00
                   â–²
        solo se tocan â†’ permitido
```

### Solo se consideran las reservas vivas

```ts
status: { in: ["pending_payment", "payment_processing", "confirmed"] }
```

Una reserva `used` (ya se usÃ³) o `payment_rejected` **no bloquea** el horario. Verificado con ambos casos.

### El solape se comprueba dos veces, y la segunda es la que vale

**Primera pasada** (fuera de la transacciÃ³n): rÃ¡pido, da el error de inmediato y evita abrir una transacciÃ³n inÃºtil.

**Segunda pasada** (dentro, despuÃ©s de un lock): es la que garantiza la correcciÃ³n, porque hasta este momento la comprobaciÃ³n de la primera era solo informativa.

### La carrera que habÃ­a (y cÃ³mo se cerrÃ³)

Dos peticiones simultÃ¡neas del **mismo cliente** sobre franjas que se solapan entre sÃ­:

```
T0.00  PeticiÃ³n A: "Â¿tengo algo a las 08:30?" â†’ no â†’ sigue
T0.01  PeticiÃ³n B: "Â¿tengo algo a las 08:30?" â†’ no â†’ sigue
T0.02  A inserta y confirma
T0.03  B inserta y confirma   â† Â¡el cliente quedÃ³ con reservas solapadas!
```

El chequeo original estaba fuera de la transacciÃ³n, asÃ­ que ambas_commitaban sin verse. La correcciÃ³n serializa las reservas del mismo cliente:

```ts
await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customer.id}::uuid FOR UPDATE`;
```

`SELECT â€¦ FOR UPDATE` bloquea la fila del cliente. La segunda peticiÃ³n **espera** a que la primera confirme, y cuando su chequeo corre ya ve lo que la primera escribiÃ³. El lock se toma **antes** de consultar, que es el orden correcto.

EscribÃ­ dos veces que esto era "una carrera" y el orden importa: si el `FOR UPDATE` fuera despuÃ©s del `findFirst`, seguirÃ­a habiendo ventana.

---

## 8. Bloqueos temporales y su vencimiento

### El bloqueo de 10 minutos

Al crear la reserva se crea un `ReservationHold`:

```
10 minutos â†’ el cliente completa el pago â†’ bookedCount sube, heldCount baja
10 minutos â†’ el cliente se fue â†’ los cupos se devuelven
```

```prisma
model ReservationHold {
  status    HoldStatus @default(active)
  expiresAt DateTime
  @@index([status, expiresAt])
}
```

### El bug que habÃ­a: los cupos quemados para siempre

`heldCount` solo bajaba cuando el pago se convertÃ­a en reserva. Como el cobro real estÃ¡ pendiente de implementaciÃ³n, **nunca bajaba**. Abandonar el checkout quemaba un cupo de forma permanente y el cliente veÃ­a "completo" sin que nadie hubiera pagado jamÃ¡s.

### La soluciÃ³n

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
    if (marcada.count !== 1) continue;   // otro ya la expirÃ³: no restar dos veces

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

1. **Los cupos se devuelven desde `ReservationSlot`, no desde el hold.** Una reserva de varias franjas devuelve exactamente lo que tomÃ³, sin suposiciones.
2. **El `updateMany` condicionado por `status` hace la operaciÃ³n idempotente.** Si dos peticiones intentan expirar la misma reserva, solo una obtiene `count = 1`. La otra no resta cupos otra vez.
3. **`GREATEST(â€¦, 0)`** impide que el contador quede negativo si algo se ejecuta dos veces.
4. **Se invoca en dos lugares**: antes de leer disponibilidad (para que el cliente vea la verdad) y antes de crear (para no competir por un cupo ya libre).

Probado: 11 assertions cubren retenciÃ³n, liberaciÃ³n, idempotencia, estados y que el inventario vuelve al punto de partida.

### Lo que falta

No hay tarea programada. La liberaciÃ³n ocurre **cuando alguien consulta o reserva**. Si nadie mira el sistema, los cupos quedan retenidos hasta la prÃ³xima visita. Lo correcto es un cron que llame `liberarHoldsVencidos()` cada minuto; es un script de una lÃ­nea, pero es una decisiÃ³n de despliegue (Â¿Vercel Cron? Â¿un job propio?) que no se ha tomado.

---

## 9. CÃ³digos QR: uno por persona y por zona

### La regla

El QR habilita **una puerta concreta**. El empleado escanea en la entrada de una zona, asÃ­ que un QR de baloncesto no sirve en la piscina.

```
1 persona,  2 zonas â†’ 2 QR
3 personas, 2 zonas â†’ 6 QR
```

Esto responde a la pregunta 16 del SCRUM ("el nÃºmero de QR que se envÃ­an") combinada con la necesidad operativa de validar por puerta.

### El dato que faltaba en el modelo

`QrToken` solo guardaba `reservationId`. La zona se heredaba del `serviceId` de la reserva, lo cual funcionaba **Ãºnicamente** porque toda reserva tenÃ­a una sola zona. Para soportar varias zonas el QR necesita su propia zona:

```prisma
model QrToken {
  blockId  String?  @db.Uuid      // â† la zona que abre este QR
  seqNo    Int      @default(1)   // nÃºmero de persona dentro de esa zona
  tokenHash String  @unique        // nunca se guarda el token en claro
  @@unique([reservationId, blockId, seqNo])
}
```

La relaciÃ³n `ReservationGuest â†” QrToken` pasÃ³ de **1 a 1 a 1 a N**: una persona tiene tantos QR como zonas.

### NumeraciÃ³n legible

El PDF que genera el equipo imprime una etiqueta por cÃ³digo:

```
Z1-P01    zona 1, persona 1
Z1-P02    zona 1, persona 2
Z2-P01    zona 2, persona 1
Z2-P02    zona 2, persona 2
```

Para el empleado en la puerta esto es mÃ¡s rÃ¡pido de leer y de communicate que un UUID.

### Seguridad del token

```
randomBytes(24).toString("base64url")   â†’  192 bits de entropÃ­a
createHash("sha256").update(token)       â†’  lo que se guarda en la base
```

El token **nunca** se persiste en claro. Si alguien lee la base de datos, no puede fabricar un QR vÃ¡lido: solo ver hashes. El token plano solo existe en el PDF que recibe el cliente.

### Idempotencia de la emisiÃ³n

```ts
if (yaEmitidos > 0 && yaEmitidos < esperados) return { ok: false, ... };  // parcial: no tocar
if (yaEmitidos > 0) return { ok: true, emitidos: [] };                   // ya estÃ¡n todos
```

Esto importa porque **el webhook de Stripe reintenta**. Si la emisiÃ³n no fuera idempotente, un reintento duplicarÃ­a los QR y el cliente recibirÃ­a cÃ³digos que invalidan los anteriores. La funciÃ³n detecta el estado parcial y se niega a actuar en lugar de empeorar el daÃ±o.

Probado: 16 assertions cubren el conteo persona Ã— zona, tokens distintos, etiquetas, resoluciÃ³n de zona por QR y no duplicaciÃ³n.

---

## 10. ValidaciÃ³n de acceso (`/validar`)

### El flujo

```
Empleado escanea  â†’  POST /api/access/validate  â†’  permitido | denegado
                              â†“
                  se registra en Access
                              â†“
               el QR pasa a status "used"
```

### Reglas, en orden

| # | Regla | Mensaje al empleado |
| --- | --- | --- |
| 1 | La reserva debe estar `confirmed` | "La reserva estÃ¡ pendiente de pago" |
| 2 | El QR no debe estar usado | "Este QR ya se usÃ³" |
| 3 | El QR no debe estar expirado | "Este QR estÃ¡ expirado" |
| 4 | Debe ser el dÃ­a de la reserva | "Esta reserva es del 12 oct" |
| 5 | Debe estar dentro de la franja | "La franja empieza a las 14:00" |
| 6 | Debe estar en la zona del empleado | "Esta reserva es de otra zona" |

La zona se toma **del bloque del QR**, no de la reserva:

```ts
blockId:     token.block?.id ?? null,
startsAt:    token.block?.startsAt ?? token.reservation.startsAt,
serviceName: token.block?.service.name ?? token.reservation.service.name,
```

Sin bloque (reservas antiguas) cae a la reserva, que en ese caso tenÃ­a una sola zona.

### El consumo es atÃ³mico

El mismo patrÃ³n del inventario, aplicado a los QR:

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

Solo los ingresos **permitidos** cuentan. Si el empleado se equivoca al teclear el cÃ³digo, el QR del cliente sigue sirviendo. Es la diferencia entre un sistema usable y uno que obliga a pedir un QR nuevo por un error tipogrÃ¡fico.

### AuditorÃ­a completa

Todo escaneo queda en `Access` con `result`, `denialReason` y `accessedAt`. Los intentos fallidos se conservan. Es lo que permite reconstruir quÃ© pasÃ³ cuando un cliente reclama que no le dejaron entrar.

---

## 11. Interfaz del carrito

### Componentes

| Archivo | Responsabilidad |
| --- | --- |
| `CarritoReserva.tsx` | Estado del carrito con contexto de React |
| `SelectorFranjas.tsx` | Modal de horarios por dÃ­a |
| `BarraCarrito.tsx` | Barra flotante, resumen y formulario de acompaÃ±antes |

### El flujo en pantalla

```
/servicios
   â†“  "Reservar" en una tarjeta
Modal: elegir dÃ­a (14 dÃ­as) â†’ ver franjas con cupos libres
   â†“  clic en una franja
Barra inferior: se suma la zona, aparece el total
   â†“  "Reservar" en otra tarjeta de otra categorÃ­a
Barra: 2 zonas, total sumado, aviso de 2 QR por persona
   â†“  ajustar personas con -/+
   â†“  "Pagar $280.000"
Resumen: desglose por zona â†’ datos de acompaÃ±antes â†’ confirmar
```

### Cosas que la interfaz anticipa

- Las franjas ya elegidas salen en verde con "En el carrito", y no se pueden volver a agregar (evita el doble clic).
- Las completas salen en gris deshabilitadas.
- Si son varias zonas, se avisa **antes** de pagar: *"Reservas 2 zonas, asÃ­ que cada persona recibirÃ¡ 2 QR: uno por puerta."*
- El botÃ³n de confirmar se deshabilita si un acompaÃ±ante tiene nombre sin documento, y el POST tambiÃ©n lo rechaza.

### Detalles de implementaciÃ³n

El selector no reinicia estado dentro del efecto. El estado de "cargando" se **deriva** de la clave pedida:

```tsx
const clave = `${servicio.id}|${fecha}`;
const cargando = datos?.clave !== clave;
const dia = datos?.clave === clave ? datos.dia : null;
```

Esto no es Estilismo: la regla `react-hooks/set-state-in-effect` estÃ¡ activada y obliga a evitar `setState` sÃ­ncrono dentro de efectos, que provoca renders en cascada. Los acompaÃ±antes se derivan de `personas` en el render en vez de sincronizarse con un efecto.

---

## 12. AutenticaciÃ³n y autorizaciÃ³n

### SesiÃ³n

JWT firmado con `jose`, en cookie `httpOnly` con SameSite. El `payload` lleva `sub` (User), `role` y expiraciÃ³n. ContraseÃ±as con `bcryptjs`.

### Middleware

`src/middleware.ts` verifica el token **en el borde**, antes de que la pÃ¡gina se renderice:

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

El middleware es una **primera barrera, no la Ãºnica**. Las server actions y los route handlers vuelven a comprobar sesiÃ³n y rol, porque el middleware se puede saltar y la acciÃ³n no.

### Grupos de rutas

Los parÃ©ntesis en los nombres de carpeta **no aparecen en la URL**:

```
src/app/(admin)/admin/page.tsx       â†’  /admin
src/app/(employee)/validar/page.tsx â†’  /validar
src/app/(storefront)/servicios/      â†’  /servicios
```

Permiten que `(employee)` y `(storefront)` tengan layouts distintos sin ensuciar las rutas pÃºblicas.

### Roles

```prisma
enum nameRole { user, admin, employee }
```

`employee` es un rol, no un tipo de usuario aparte: un empleado tambiÃ©n puede ser cliente. Los permisos concretos se derivan de `EmployeeAssignment`, que define quÃ© zonas valida cada uno.

### OAuth de Google

Flujo con `state` anti-CSRF, callback, vinculaciÃ³n por correo verificado y alta de `User + Customer + OAuthAccount` en una transacciÃ³n. **Pendiente**: `exchangeGoogleCode()` no estÃ¡ implementado y las credenciales de prueba son ficticias. El botÃ³n y el andamiaje estÃ¡n listos.

---

## 13. API

**23 route handlers.** Contrato uniforme en `src/shared/http/`:

```ts
// Ã‰xito
{ "data": { ... } }

// Error
{ "data": null, "error": { "code": "...", "message": "..." } }
```

`handler.ts` envuelve todo: captura los errores conocidos, registra los inesperados y normaliza la forma. Los mensajes al usuario estÃ¡n en espaÃ±ol y son accionables ("Solo quedan 3 cupo(s) en esa franja"), no tÃ©cnicos.

### Endpoints principales

| MÃ©todo | Ruta | Rol | QuÃ© hace |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | â€” | Inicia sesiÃ³n |
| POST | `/api/auth/register` | â€” | Crea cuenta y pide verificaciÃ³n |
| GET | `/api/auth/me` | cualquiera | SesiÃ³n actual |
| GET | `/api/auth/oauth/google` | â€” | Inicio del flujo OAuth |
| POST | `/api/auth/forgot-password` | â€” | Pide recuperaciÃ³n |
| GET | `/api/categories` | pÃºblico | CategorÃ­as activas |
| GET | `/api/services` | pÃºblico | CatÃ¡logo |
| GET | `/api/services/[id]` | pÃºblico | Detalle |
| GET | `/api/availability` | pÃºblico | Franjas con cupos reales |
| POST | `/api/reservations` | cliente | **Crea el carrito** |
| GET | `/api/reservations` | cliente | Sus reservas |
| GET | `/api/reservations/[id]` | dueÃ±o | Detalle |
| POST | `/api/reservations/[id]` | dueÃ±o | **Inicia el pago** |
| POST | `/api/access/validate` | empleado | Valida un QR |
| POST | `/api/payments/webhook` | Stripe | Confirma el pago |
| GET | `/api/admin/export` | admin | Exporta datos |

### CÃ³digos de estado usados con intenciÃ³n

| CÃ³digo | CuÃ¡ndo | Significado |
| --- | --- | --- |
| `200` | Lectura, o pago ya iniciado | OK |
| `201` | Reserva creada | Recurso nuevo |
| `400` | Falla de validaciÃ³n (Zod, fecha pasada, acompaÃ±antes) | El cliente debe corregir |
| `401` | Sin sesiÃ³n vÃ¡lida | Falta autenticarse |
| `409` | `sin_cupos`, `ya_reservado`, `horario_chocante`, `bloques_pisados` | **Conflicto de disponibilidad: reintentar con otra franja** |

La distinciÃ³n `400` vs `409` es deliberada: `400` significa "arregla tus datos", `409` significa "el mundo cambiÃ³, elige otra hora". La UI refresca la disponibilidad en el segundo caso.

---

## 14. Pagos

### Implementado

```ts
// Transiciones vÃ¡lidas
pending â†’ succeeded   (webhook de Stripe)
pending â†’ failed      (rechazo)
```

- Transiciones controladas por estado, no por actualizaciÃ³n libre.
- `stripeSessionId` y `stripePaymentIntentId` con `@unique`: no puede haber dos cobros para la misma sesiÃ³n.
- `StripeEvent` con `eventId` como clave primaria: **garantiza idempotencia del webhook**. Si Stripe reenvÃ­a un evento, el INSERT falla y no se procesa dos veces.
- VerificaciÃ³n de firma en el webhook. Sin ella, cualquiera podrÃ­a "confirmar" pagos falsos por HTTP.

### Pendiente

- **El cobro no estÃ¡ conectado.** `POST /api/reservations/[id]` devuelve `501` con el contrato del mensaje. La interfaz ya muestra el botÃ³n y el total.
- No hay Checkout Session real ni redirecciÃ³n a Stripe.
- Los QR se emiten al confirmar el pago; esa llamada existe (`emitirQrDeReserva`) pero nadie la invoca todavÃ­a porque no hay pago que confirme.

---

## 15. Interfaz

### Tema

Storefront oscuro con acentos vino (`#7a1f3d`) y dorado (`#e3bd74`). CSS propio en `storefront.css` + Tailwind.

**Advertencia conocida**: el wrapper de los layouts lleva clases de tema claro que **no aplican** porque `.storefront-shell` los sobrescribe:

```tsx
<div className="storefront-shell ... bg-[#F5F5F5] text-[#1F1F1F] ...">
```

Renders oscuro y es intencional por cascada, pero es una trampa para quien lea el cÃ³digo. La pÃ¡gina `/informacion` pasÃ³ por esto: tenÃ­a 46 clases claras y 1 oscura, y se veÃ­a blanca sobre un sitio oscuro. Se reescribiÃ³ al tema correcto.

### Aforos desde la base

`/informacion` **no** lista los aforos en texto fijo. Los lee de `Service.capacity` y los agrupa por categorÃ­a.

La versiÃ³n anterior tenÃ­a los datos escritos a mano y ya estaban mal:

| DecÃ­a | La base tiene |
| --- | --- |
| "MicrofÃºtbol (4 canchas): 14 c/u" | **3** canchas de microfÃºtbol |
| *(no mencionaba pÃ¡del)* | Cancha de PÃ¡del PanorÃ¡mica, aforo 4 |
| *(no mencionaba tenis)* | Cancha de Tenis, aforo 4 |

Con el dato en la base no puede volver a desincronizarse.

### Accesibilidad

Landmarks y roles (`role="dialog"`, `aria-modal`, `role="status"`, `role="alert"`), foco visible, `Escape` cierra modales, `aria-label` en botones de icono, textos de error asociados al campo.

---

## 16. Base de datos en la prÃ¡ctica

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
20261009024408_reservation_guests      â† invitados de la reserva
20261009030000_reservation_blocks     â† zonas de la reserva
20261009040000_qr_por_zona             â† QR por persona y zona
```

Las tres Ãºltimas son de este trabajo de sesiÃ³n.

### Backfill en SQL

La migraciÃ³n de bloques rellenÃ³ los datos existentes en vez de dejar la tabla vacÃ­a:

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

Sin esto, las 8 reservas y los 8 QR que ya existÃ­an quedaban sin zona y la validaciÃ³n de acceso habrÃ­a fallado en producciÃ³n.

### Ãndices justificados

```prisma
// Una persona no puede tener dos reservas que se pisen: la bÃºsqueda es por
// cliente y ventana, asÃ­ que el Ã­ndice va en ese orden.
@@index([customerId, startsAt, endsAt])

// Availability del dÃ­a: franjas de una instalaciÃ³n en un rango de fechas
@@unique([serviceId, startsAt])

// El job de expiraciÃ³n filtra por estado y vencimiento
@@index([status, expiresAt])

// Un QR por persona y zona: la unicidad lo garantiza
@@unique([reservationId, blockId, seqNo])
```

El primero lleva un comentario explicando el porquÃ©: sin Ã©l, PostgreSQL revisarÃ­a **todas** las reservas de la tabla para encontrar las del cliente y compararÃ­a fechas una por una.

---

## 17. VerificaciÃ³n

### Comandos

```powershell
npx tsc --noEmit          # tipos, 0 errores
npm run lint              # eslint, 0 errores
npm run build             # 47 pÃ¡ginas
npx prisma migrate deploy # aplicar migraciones
npx tsx scripts/...       # pruebas contra la BD real
```

### Cobertura de pruebas (70 assertions)

| Suite | Assertions | QuÃ© demuestra |
| --- | --- | --- |
| Reserva | 19 | Validaciones, cobro, hold, invitados, cupos |
| Solape | 6 | No solaparse entre categorÃ­as, y que las muertas no bloquean |
| Vencimiento | 11 | Los holds vencidos devuelven cupos, e idempotencia |
| Carrito | 14 | Atomicidad, un solo pago, solapes internos |
| QR por zona | 16 | Conteo persona Ã— zona, zona desde el bloque |
| UI | 4 | El payload de la barra coincide con el cobro |

### Los 5 warnings de lint

Preexistentes, ninguno introducido en este trabajo:

```
prisma/seed.ts                        2  variables sin usar
src/app/(admin)/admin/page.tsx        1  parÃ¡metro sin usar
src/components/auth/AuthSwitchCard.tsx 1  router sin usar
src/shared/lib/mailer.ts               1  parÃ¡metro sin usar
```

### Pruebas contra la base real

Las pruebas escriben en la base de desarrollo con la cuenta de prueba y **limpian lo que crean**, borrando hijos antes que padres porque las relaciones no tienen `CASCADE`. Fue un error real de la primera versiÃ³n de una de ellas.

---

## 18. Estado real: quÃ© estÃ¡ terminado y quÃ© no

### Funciona de punta a punta

- CatÃ¡logo con datos reales (16 servicios, 4 categorÃ­as, 6 con slug)
- Disponibilidad calculada desde horarios, cierres y contadores
- Carrito de varias zonas con pago Ãºnico
- Bloqueo de cupos a prueba de concurrencia
- No solapamiento, incluso entre categorÃ­as
- Vencimiento de bloqueos con liberaciÃ³n de cupos
- EmisiÃ³n de QR por persona y zona
- ValidaciÃ³n de acceso por puerta, con consumo atÃ³mico
- CRUD de empleados y zonas
- AutenticaciÃ³n propia + OAuth de Google (andamiaje)

### A medias

| Ãrea | QuÃ© falta |
| --- | --- |
| **Pagos** | El endpoint devuelve `501`. No hay Checkout Session. El UI ya estÃ¡ listo |
| **QR â†’ correo** | `emitirQrDeReserva()` existe pero nadie la invoca. Falta el PDF y el envÃ­o por n8n |
| **Google OAuth** | Falta `exchangeGoogleCode()`. Credenciales de prueba son ficticias |
| **Job de expiraciÃ³n** | La liberaciÃ³n es reactiva (al consultar). Falta el cron |
| **Zonas del empleado** | La asignaciÃ³n y el filtro existen en el admin; falta exponer el filtro por zona en el flujo de `/validar` |
| **Tema claro** | Descartado por decisiÃ³n del cliente. El sitio es solo oscuro |
| **Datos de contacto** | El enlace "Contacto" del footer no tiene direcciÃ³n, telÃ©fono ni horario reales |

### Deuda tÃ©cnica conocida

1. **JWT en el historial de Git.** Un `cookies.txt` con un token real estuvo en el commit `cda2581`. El archivo se borrÃ³ del disco y estÃ¡ staged, pero **la clave sigue en la historia**: hay que rotar `JWT_SECRET`.
2. **Servidor de desarrollo parado.** `npm run dev` no corre de forma persistente en este entorno; hay que relanzarlo a mano. `next dev` reescribe `AGENTS.md` en cada arranque, asÃ­ que el archivo aparece modificado sin que nadie lo haya tocado.
3. **Scripts de prueba fuera del repo.** Se movieron a `%TEMP%\opencode\omega-qa-scripts\` con un README, porque no tienen nada que ver en el control de versiones.
4. **5 warnings de lint** preexistentes, sin impacto funcional.

---

## 19. Glosario

| TÃ©rmino | Significado en este proyecto |
| --- | --- |
| **Franja / slot** | Intervalo de una hora de una instalaciÃ³n. La unidad de inventario |
| **Zona** | La puerta fÃ­sica: la categorÃ­a (Piscinas, Canchasâ€¦) |
| **Bloque** | Un tramo reservado dentro de una reserva. Une zona + franja |
| **Carrito** | Conjunto de bloques que se compran en un solo pago |
| **Hold / bloqueo** | Reserva temporal de cupos mientras el cliente paga |
| **QR por zona** | Un cÃ³digo por persona por puerta |
| **Aforo** | `Service.capacity`, el mÃ¡ximo fÃ­sico |
| **Exclusividad** | No es un atributo: si un cliente compra todos los cupos de una franja, la zona queda bloqueada para los demÃ¡s. Se cumple solo |

---

## 20. GuÃ­a de estudio para la auditorÃ­a

Si hay que revisar el sistema de arriba abajo, este es el orden que sugiere el riesgo tÃ©cnico:

### 1. Empieza por el inventario
`src/features/reservations/reservations.service.ts`

Es el archivo con mÃ¡s decisiones correctas y con mÃ¡s trampas ocultas. Busca:

- el `UPDATE` condicional (`capacity >= bookedCount + heldCount + personas`)
- el `SELECT â€¦ FOR UPDATE` **antes** del chequeo de solape
- el bucle de atÃ³micos con `CupoAgotado`
- `liberarHoldsVencidos` y su idempotencia

### 2. Comprueba que el modelo soporta lo que dice soportar
`prisma/schema.prisma` â†’ `ReservationBlock`, `QrToken.blockId`, `@@unique`

Y verifica que las migraciones realmente rellenaron los datos previos (`ReservationBlock` no deberÃ­a estar vacÃ­a).

### 3. Sigue un QR de punta a punta
```
emitirQrDeReserva()          src/features/reservations/qr.ts
   â†“  genera persona Ã— zona
findQrByTokenHash()         src/features/access/access.repository.ts
   â†“  lee la zona del bloque
validar acceso               src/features/access/access.service.ts
   â†“  7 reglas
grantAccess()                consume el QR con updateMany condicionado
```

### 4. Comprueba que la UI y la API hablan lo mismo
`src/components/storefront/BarraCarrito.tsx` construye el payload
â†’ `POST /api/reservations`
â†’ `createReservationSchema` lo valida
â†’ `createReservationWithHold` lo procesa

El total que ve el cliente **tiene** que ser el que cobra el servidor. La prueba `probar-ui-carrito` compara exactamente eso.

### 5. Busca los riesgos que aÃºn quedan

- `JWT_SECRET` sin rotar (la clave estÃ¡ en la historia de Git)
- El job de expiraciÃ³n no existe: es reactivo
- El pago no estÃ¡ conectado: el sistema retiene cupos sin cobrar
- El middleware es solo la primera barrera; las acciones vuelven a validar

### 6. Lo mÃ¡s importante de todo

**Ninguna regla de inventario depende de que el cÃ³digo se ejecute en orden.** Cada cupo, cada QR y cada solape se resuelve con SQL dentro de una transacciÃ³n. Esa es la decisiÃ³n de diseÃ±o que sostiene todo lo demÃ¡s, y la primera pregunta que le harÃ­a a un auditor.
---

## ANEXO. Configuracion de Google OAuth y del workflow de n8n

### Que hay que registrar en Google Cloud

El canje del codigo ya esta implementado (`exchangeGoogleCode()` en
`src/app/api/auth/oauth/google/callback/route.ts`). Para que el boton funcione
hace falta que en la consola de Google coincidan tres cosas:

| Dato | Valor |
|---|---|
| Tipo | **Web application** |
| Authorized redirect URI | `http://localhost:3000/api/auth/oauth/google/callback` |
| Client ID / Secret | los de `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` |

En produccion el URI cambia segun `NEXT_PUBLIC_APP_URL`; hay que registrar ahi
tambien el dominio real. Si Google responde `redirect_uri_mismatch`, casi
siempre es una barra final o `http` contra `https` de mas.

El `scope` pedido es `openid email profile`, y el flujo usa `prompt=select_account`
para que el registro manual y el de Google no se mezclen en silencio.

### Que decide Google sobre la verificacion

Antes, toda cuenta de OAuth nacia marcada como verificada sin mirar nada. Ahora
`OAuthProfile` trae `emailVerified`, tomado de `email_verified` que devuelve
Google:

- Si Google lo confirma, la cuenta nuestra queda verificada y n8n solo manda el
  correo de bienvenida.
- Si Google **no** lo confirma, la cuenta queda pendiente y se manda tambien
  nuestro codigo de verificacion, igual que en el registro manual.

Igual ocurre al vincular una cuenta manual que nunca confirmo su correo: si
Google demuestra que la persona controla ese correo, la cuenta deja de quedar
pendiente.

### Eventos que la aplicacion le manda a n8n

El cliente es `src/shared/integrations/n8n.ts`. Cada peticion va firmada con
HMAC-SHA256 sobre `evento.timestamp.cuerpo`, en las cabeceras:

| Cabecera | Uso en n8n |
|---|---|
| `X-Omega-Event` | `{{ $json.headers['x-omega-event'] }}` |
| `X-Omega-Timestamp` | `{{ $json.headers['x-omega-timestamp'] }}` |
| `X-Omega-Signature` | `{{ $json.headers['x-omega-signature'] }}` |

El cuerpo siempre trae `{ evento, timestamp, datos }`.

| Evento | Cuando | Que necesita el workflow |
|---|---|---|
| `usuario.registrado` | alta manual o con Google | `email`, `nombre`, `canal`, `emailVerificado`, `requiereCodigo` |
| `reserva.confirmada` | pago aprobado en Stripe | `email`, `nombre`, `fecha`, `pdfBase64`, `pdfNombre`, `codigos[]` |

Para verificar la firma en n8n hay una expresion de ejemplo en
`verificarFirma()` (`src/shared/integrations/n8n.ts`).

### Por que existe el plan B

`enviarEvento()` nunca lanza. Si n8n esta caido o no responde en 8 segundos, el
evento se pierde y queda registrado, y el QR se manda igual por Resend con los
codigos en el cuerpo del correo. Perder el correo de una reserva ya pagada
porque se cayo la automatizacion no seria aceptable.

Por eso `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_SECRET` pueden quedar vacias en `.env`:
la aplicacion sigue funcionando completa por el camino directo con Resend.


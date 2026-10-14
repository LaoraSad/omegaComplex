# Bugs v2.0 — detalle con evidencia + estado de ejecución

Rama: `update/version-2.0`. Todo verificado leyendo el código.
Convención: **P0** = rompe operación real / cobra mal / inconsistencia de datos.
**P1** = carrera o bypass serio. **P2** = inconsistencia UX/reglas.

> Restricción v2.0: no se toca Stripe real ni n8n (otra persona). Los fixes se
> prueban con mocks + reloj congelado, sin `stripe listen`.
> Cada bug lleva su commit a nombre local. Estado: todos hechos (P2-6 el último).

## Migraciones aplicadas (BD dev al día)

- `20261014025705_user_token_version`: `User.tokenVersion Int @default(0)` (P1-5).
- `20261014030928_access_invalidacion_manual`: `Access.invalidacionManual Boolean @default(false)` (P2-5).

## P0

### P0-1. `isPastDate` bloqueaba todo el día en curso — HECHO (`3b4cebb`)
- Causa: `src/features/reservations/reservations.service.ts:100` comparaba
  `00:00 Bogotá < now`, siempre true para hoy → toda reserva de hoy se
  rechazaba con `franja_pasada`.
- Qué se hizo: compara día calendario en `America/Bogota` (`date < hoy`); hoy
  nunca es pasado. Función exportada para probarla.
- Qué cambió: reservas para franjas futuras de hoy vuelven a pasar.
- Tests: `is-past-date.test.ts` (4, incluye regresión 00:00:01).

### P0-4. Bypass del token QR — HECHO (`616e142`)
- Causa: `findQrByTokenHash` (`access.repository.ts`) aceptaba `id` UUID y
  `reservationId` (visibles en APIs/admin) además del hash.
- Qué se hizo: se quitaron los dos fallbacks; solo `tokenHash + shortCode`.
  Verificado que los únicos llamadores son lookup/confirm/deny del escaneo.
- Tests: `qr-lookup.test.ts` (UUID desconocido → null sin tocar `reservationId`).

### P0-3. Pago tardío tras expirar — HECHO (`dc26bd1`)
- Causa: `confirmarPagoExitoso` y el webhook liquidaban mirando solo
  `payment.status === "pending"`: pago `succeeded` + reserva `expired` + QRs
  emitidos sin cupos que trasladar.
- Qué se hizo: pre-chequeo (reserva `pending_payment` + hold vigente) y
  re-verificación post-liquidación (cierra la carrera); si expiró, no se
  liquida ni se emiten QRs, se registra `pago.tardio_requiere_revision_manual`
  y se lanza `409 PAGO_TARDIO_REQUIERE_REVISION`. Webhook lo acusa (sin
  reintentos inútiles); `estado-pago` responde `requiere-revision`.
- Por qué así: el dinero puede estar cobrado de verdad; reembolsar/revivir lo
  decide el negocio fuera de la app.
- Tests: 3 casos tardíos nuevos en `payments.service.test.ts`.

### P0-2. Monto Stripe `cop * 100` — CONTENIDO (`eeddbec`), pendiente Stripe
- Riesgo: si COP fuera cero-decimal en la cuenta, se cobraría 100x.
- Qué se hizo (vía A, sin tocar Stripe): `aCentimos` exportada y aislada como
  único puente pesos → Stripe, con advertencia de no cambiar el multiplicador
  sin pago de prueba; tests que congelan el mapeo actual.
- Qué NO cambió: el comportamiento es idéntico; Stripe no recibe nada
  retroactivo.
- Pendiente (responsable de Stripe, antes de producción): confirmar COP,
  pago en test mode comparando checkout vs app, y solo entonces ajustar si aplica.

## P1

### P1-1. Webhook perdía el reintento tras un crash — HECHO (`53ad018`)
- Causa: `recordStripeEvent` antes de procesar; si la liquidación se caía, el
  reintento veía duplicado y lo ignoraba → reserva cobrada en `pending`.
- Qué se hizo: duplicado con pago aún `pending` termina la liquidación
  (`recuperado: true`); duplicado liquidado solo acusa. Errores reales siguen
  dando 500 para que Stripe reintente.
- Tests: `webhook-duplicate.test.ts`, primer test de un route handler del repo.

### P1-2. `rejectPayment` volteaba `succeeded → failed` — HECHO (`801d77e`)
- Causa: `tx.payment.update` incondicional en carrera con el webhook de éxito.
- Qué se hizo: `updateMany(where status=pending)` + relectura, igual que
  `settlePayment`. Verificado que `rechazarPago` solo usa `reservationId`.
- Tests: `payments.repository.test.ts` con transacción simulada.

### P1-3. Mantenimiento no defendido en escritura — HECHO (`fa1103b`)
- Causa: `createReservationWithHold` validaba schedule/cierre pero nunca el
  día de mantenimiento; un `ServiceSchedule` de lunes dejaba reservar.
- Qué se hizo: gate temprano con código `mantenimiento`, usando
  `esDiaDeMantenimiento` del módulo puro (se evitó importar
  `availability.repository` por ciclo con este servicio). La ruta devuelve el
  código tal cual (400 + mensaje).
- Tests: `mantenimiento.test.ts` (lunes rechaza, martes pasa, martes
  desplazado por lunes festivo rechaza).

### P1-8. `deleteServiceSchedule` filtraba mal el día — HECHO (`5e1e0cb`)
- Causa: `new Date("YYYY-MM-DD").getDay()` (UTC vs servidor) + ternaria
  redundante → borraba otro día o nada; además `deleteMany` fuera de
  transacción y sin validar 0-6.
- Qué se hizo: `diaDeSemana` en Bogotá (misma convención del schedule),
  rango con medianoche Bogotá, borrado + delete en `db.$transaction`,
  validación 0-6 como el upsert.
- Tests: `delete-schedule.test.ts` (filtra solo el día, todo en tx,
  inexistente no toca nada).

### P1-4. OAuth sin `isActive` ni puerta de verificación — HECHO (`97a6512`)
- Causa: callback abría sesión con solo `if (!existing.role)`; con Google
  `email_verified=false` igual entraba.
- Qué se hizo: `OAuthUser` trae `isActive/emailVerified`; helper puro
  `destinoOAuth()` (inactivo → login con error; sin verificar → sin sesión a
  `/verify-email?email=` donde pide el código por reenvío); callback lo aplica
  en cuenta existente y en alta/vinculación.
- Tests: `oauth-gate.test.ts` (3) + `oauth.repository.test.ts` (3).

### P1-5. Cambio/recovery no revocaba JWTs — HECHO (`5c2e79f`)
- Causa: JWT stateless 7 días; clave robada seguía válida tras cambiarla.
- Qué se hizo: `User.tokenVersion` + `tv` en el JWT. `createSession` incrusta
  la vigente; `getSession` la compara y exige cuenta activa. Cambio y recovery
  incrementan la versión; recovery exige cuenta activa (mismo error genérico).
- Qué cambió (atención al desplegar): **todas las sesiones actuales se
  cierran una vez** (tokens legacy sin `tv`). El middleware edge no tiene BD:
  la revocación la aplican layouts/APIs, no el proxy.
- Tests: `session.test.ts` (5) + repositorio + recovery inactivo/versión.

### P1-6. `src/proxy.ts` — VERIFICADO, sin cambios (`14d618a`, `cc052dd`)
- Confirmado contra Next 16.3.6 instalado: `src/proxy.ts` es ubicación
  válida, el export `proxy` es aceptado y `config.matcher` se parsea.
- En vivo (`next dev -p 3101`): `/admin`, `/validar`, `/reservas` sin cookie
  → `307` a `/login?next=…`. Quedó `src/proxy.test.ts` (5) como regresión.

### P1-7. Zona errónea en multizona — HECHO (`3910061`)
- Causa: accesos mostraban/filtraban por `reservation.service` en vez del
  bloque del QR.
- Qué se hizo: include `qrToken.block.service`, helper `zonaDeAcceso()`
  (bloque manda, reserva solo en QR legacy), filtro por bloque O reserva
  legacy. Aplicado en tabla de accesos y CSV de export (que duplicaba el include).
- Tests: `access-zone.test.ts` (display + filtro solo/combinado).

## P2

### P2-1. Ventana "pasado" inconsistente — HECHO (`9c0759a`)
- Causa: lectura marcaba `past` solo si terminó; escritura exige
  `startsAt > now` → franja iniciada se mostraba disponible y fallaba genérico.
- Qué se hizo: helper puro `estadoDeSlot()` (`startsAt <= now → past`) en día
  y rango; texto "ya empezaron o terminaron" (códigos y UI intactos).
- Tests: `slot-status.test.ts` (4).

### P2-2. Solape veía holds vencidos sin liberar — HECHO (`9088d1a`)
- Causa: limpieza con cliente global fuera de la tx + chequeo por estado.
- Qué se hizo: `liberarHoldsVencidos(now, tx)` como primer paso dentro del
  `$transaction` (la función ya aceptaba cliente). Limpieza, cupos, lock,
  solape y creación atómicos.
- Tests: `solape-limpieza.test.ts` (flujo simulado: limpia en tx, nunca fuera).

### P2-3. Ventana 3 meses en tres dialectos — HECHO (`e46a5e9`)
- Causa: backend `setMonth` local vs frontend meses-UTC vs generación 90 días
  → hueco donde se permitía pero no había franjas.
- Qué se hizo: fuente única `ultimoDiaReservable()` + `diasVentanaReserva()`
  en `colombia-holidays`; backend compara claves Bogotá, frontend delega,
  generación cubre la ventana por defecto (upsert y delete usan el mismo rango).
- Tests: helper (3) + gate backend (límite/borde).

### P2-4. Limpieza lazy sin límite — HECHO (`27ebd22`)
- Causa: cada lectura de calendario barría todos los vencidos + N updates.
- Qué se hizo: `limite = 50` por defecto (lecturas y escritura); cron con
  `null` (barrido completo, que es su trabajo). Idempotente: lo pendiente lo
  toma la siguiente pasada.
- Tests: `liberar-holds.test.ts` (take por defecto, null sin take, liberación).

### P2-5. Denegación = invalidación manual sin rastro — HECHO (`8d9a0bf`)
- Causa (33-E): `denyAccess{consumeQr:true}` mataba un QR válido con un llamado
  simple y se auditaba igual que un denied del sistema.
- Qué se hizo: migración `Access.invalidacionManual`; `denyRequestSchema`
  exige `confirmacion: true` (UI la manda tras su doble paso, flujo intacto
  para el empleado); admin muestra "Invalidación manual del QR" con quién/
  cuándo/motivo.
- Tests: servicio asserts el flag + schema rechaza sin confirmación.

### P2-6. Spam de `Access denied` — HECHO (`9297068`)
- Causa: la ruta creaba fila `denied` en cada lookup fallido; reintentar el
  mismo QR generaba N filas idénticas que contaminan métricas.
- Qué se hizo: `huboDenegacionReciente()` (mismo QR + empleado + motivo en
  5 min) y `recordDenial` omite el duplicado. El primer rechazo siempre queda.
- Tests: servicio (registra/omite) + repositorio (where + ventana).

## Orden restante
1. Alcance `decisiones-v2.0.md`: perfil cliente, correos app, métricas,
   `.env.example` + URL, E2E y concurrencia.

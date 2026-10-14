# Bugs v2.0 — detalle con evidencia

Rama: `update/version-2.0`. Todo verificado leyendo el código el 2026-10-14.
Convención: **P0** = rompe operación real / cobra mal / inconsistencia de datos.
**P1** = carrera o bypass serio. **P2** = inconsistencia UX/reglas.

> Restricción v2.0: no se toca Stripe real ni n8n (otra persona).
> Los fixes P0 se hacen con mocks + reloj congelado, sin `stripe listen`.

## P0

### P0-1. `isPastDate` bloquea todo el día en curso
- `src/features/reservations/reservations.service.ts:100-104`:
  ```ts
  const start = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0)); // 00:00 Bogotá
  return start < now;
  ```
  Para `fecha == hoy`, `start` (00:00) siempre es `< now` → **toda reserva de hoy
  se rechaza** con `franja_pasada` (`:240-241`), aunque la franja sea futura.
- Fix: comparar `dateKey < hoyBogota` (strings `YYYY-MM-DD`), no `start < now`.
- Test: reserva hoy con slot futuro debe pasar; fecha ayer debe dar `franja_pasada`.

### P0-2. Monto Stripe: `cop * 100` cobra 100x si COP es cero-decimal
- `src/features/payments/payments.service.ts:60-73` (`aCentimos`): asume que la API
  de Stripe usa 2 decimales para COP y envía `100.000 COP → 10.000.000`.
- Stripe lista COP como moneda **cero-decimal** (monto en pesos, sin centavos).
  Si es así, se cobra 100 veces el precio real.
- **Hecho en v2.0 (vía A, sin tocar Stripe):**
  - `aCentimos` exportada y aislada como único puente pesos → Stripe, con
    advertencia en el comentario: no cambiar el multiplicador sin pago de prueba.
  - Tests que congelan el comportamiento actual (`payments.service.test.ts`:
    bloque `aCentimos` + asserts `100000→10000000` en checkout).
  - El comportamiento NO cambió: las reservas nuevas envían lo mismo que antes.
    Stripe no recibe nada retroactivo; lo ya creado allá queda intacto.
- **Pendiente (responsable de Stripe, antes de producción):**
  1. Confirmar en la cuenta/docs si COP espera centavos (×100) o pesos (×1).
  2. Pago real en modo prueba y comparar lo mostrado en el checkout vs la app.
  3. Si es ×1: cambiar `aCentimos` a identidad + validar monto mínimo,
     actualizar tests y repetir el pago de prueba. Si es ×100: solo dejar constancia.

### P0-3. Pago tardío tras expirar deja pago `succeeded` + reserva `expired` + QRs emitidos
- `src/app/api/reservations/[id]/estado-pago/route.ts:62-70`: si Stripe dice `paid`,
  llama `confirmarPagoExitoso` verificando solo `record.status === "pending"`
  (`:65`). No chequea `hold.expiresAt` ni `reservation.status`.
- `handleCheckoutCompleted` (`src/app/api/payments/webhook/route.ts:109-128`):
  mismo hueco, solo mira `payment.status !== "pending"` (`:113`).
- `settlePayment` (`payments.repository.ts:94-127`): `payment pending→succeeded`
  siempre; la reserva solo avanza si sigue `pending_payment` (`:120-123`).
  Si ya estaba `expired`, el pago queda cobrado, la reserva expirada,
  `consumirHoldYTrasladarCupos` no aplica (hold ya `released`) y aun así se emiten QRs.
- Fix: antes de liquidar, exigir hold vigente y reserva en `pending_payment`;
  si expiró, no emitir QR y dejar el caso marcado para reembolso/revivir
  explícito (decisión de negocio, fuera de app en v2.0).

### P0-4. Bypass del token QR: acepta `id` UUID y `reservationId`
- `src/features/access/access.repository.ts:191-203`: si no hubo match por
  `tokenHash` ni `shortCode`, y el texto parece UUID, busca por `id` y por
  `reservationId` (`findFirst where reservationId`).
- `reservationId` es visible en APIs/admin → permite validar sin el token,
  rompe §14 (token seguro) y §27.
- Fix: quitar esos dos fallbacks; dejar solo `tokenHash + shortCode`.
  (El `shortCode` impreso se mantiene como respaldo legítimo.)

## P1

### P1-1. Webhook pierde el reintento tras un crash
- `webhook/route.ts:61-69`: `recordStripeEvent` **antes** de procesar; si
  `handleCheckoutCompleted` lanza, el reintento de Stripe ve `applied=false`
  y retorna `duplicate` sin re-liquidar → reserva cobrada queda `pending`.
- Fix: registrar después de procesar, o en duplicado re-chequear
  `payment.status === "pending"` y re-liquidar.

### P1-2. `rejectPayment` puede voltear `succeeded → failed`
- `payments.repository.ts:130-145`: `tx.payment.update` incondicional.
  Una carrera `succeeded` vs `payment_failed/session.expired` corrompe el pago
  (la reserva se salva por `updateMany pending`, el pago no).
- Fix: `updateMany(where status=pending)` como en `settlePayment`.

### P1-3. Mantenimiento de lunes no se defiende en escritura
- `createReservationWithHold` valida `schedule + closure` pero nunca llama
  `cerradoPorMantenimiento / esDiaDeMantenimiento`. Si existe `ServiceSchedule`
  de lunes o un `ServiceSlot` huérfano, la reserva pasa aunque el calendario lo cierre.
- Fix: mismo chequeo de `availability.repository` en la escritura.

### P1-4. OAuth: sin chequeo `isActive`, sin puerta de verificación
- `callback/route.ts:66-72`: con `OAuthAccount` existente abre sesión con solo
  `if (!existing.role)`. Desactivados (`User/Employee.isActive=false`) siguen entrando.
- `:74-87`: si Google devolvió `email_verified=false`, igual hace `startSession`
  (`:86`) sin forzar `/verify-email`.
- Fix: chequear `isActive` + redirigir a verificación si pendiente.

### P1-5. Cambio/recovery de clave no revoca JWTs
- JWT stateless 7 días (`shared/auth/jwt.ts`, `session.ts`). `changePassword`
  (`auth.service.ts:174`) y `completePasswordReset` (`email-flow.service.ts:183`)
  no invalidan tokens robados. Además `completePasswordReset` no chequea `isActive`.
- Fix: `passwordChangedAt/tokenVersion` en el JWT o lista de revocación + check `isActive`.

### P1-6. `src/proxy.ts` verificado en Next 16 (sin cambios)
- Confirmado contra el framework instalado (16.3.6): `src/proxy.ts` es
  ubicación válida (`isProxyFile`), el export nombrado `proxy` es aceptado y
  `config.matcher` se parsea igual que en middleware.
- Verificado en vivo (`next dev -p 3101`): `/admin`, `/validar` y `/reservas`
  sin cookie responden `307` a `/login?next=…`.
- Queda `src/proxy.test.ts` como regresión (5 casos). Nota: el middleware edge
  no tiene BD, así que la revocación P1-5 la aplican layouts/APIs, no el proxy.

### P1-7. Admin muestra zona errónea en multizona
- `listAccesses` incluye `reservation.service`, no `block.service`;
  `accesos/page.tsx:147` pinta el servicio principal aunque el QR sea de otra zona.
- Fix: incluir `qrToken.block.service`.

### P1-8. `deleteServiceSchedule` filtra el día mal
- `admin.repository.ts:405-419`: `new Date(dateKey).getDay()` parsea `YYYY-MM-DD`
  como UTC (desfase vs Bogotá) + ternaria redundante. Puede borrar slots del día
  equivocado. Además `deleteMany` fuera de transacción con `schedule.delete`.
- Fix: día de semana en zona Bogotá + transacción.

## P2

### P2-1. Ventana "pasado" inconsistente
- Disponibilidad marca `past` si `endsAt <= now`; creación exige `startsAt > now`
  (`reservations.service.ts:349`, UPDATE `startsAt > now` en `:469`).
  Franja ya iniciada se muestra disponible y falla con `ya_reservado` genérico.
- Fix: `startsAt <= now → past/no reservable` (§12 franjas ya iniciadas).

### P2-2. Solape ignora holds vencidos no limpiados
- `chocarConOtraReserva` (`:193-196`) filtra por estado sin `expiresAt`;
  la limpieza (`liberarHoldsVencidos`, `:435`) corre con `db` fuera de la tx → carrera.
- Fix: limpieza dentro de la tx o excluir holds expirados del choque.

### P2-3. Ventana 3 meses con TZ del servidor + generación 90 días
- `reservations.service.ts:93-97` usa `setMonth` local vs resto Bogotá;
  frontend y generación usan 90 días. Hueco 90-92 días: backend permite pero no hay slots.
- Fix: `hoyBogotá + 3 meses calendario` en los tres lados.

### P2-4. Limpieza lazy sin límite en cada lectura
- `getDayAvailability/getSlotsInRange` llaman `liberarHoldsVencidos` sincrónico
  (`findMany` + N updates). Lento con holds colgados.
- Fix: acotar (`take 50`) y/o dejarlo al cron + escritura.

### P2-5. `denyAccess{consumeQr:true}` es invalidación manual (prohibida 33-E)
- Consume un QR válido por decisión subjetiva. Requiere confirmación +
  auditoría separada `invalidated_by` vs `denied`.

### P2-6. Spam de `Access denied`
- `access/validate/route.ts:73-75` crea fila `denied` en cada `lookup` fallido.
  Escaneos repetidos contaminan métricas. Deduplicar / rate-limit.

### P2-7. Dominio remitente vs Gmail
- Requisito: `omegacomplex@gmail.com`. Código: `RESEND_FROM_EMAIL` debe ser
  dominio verificado (`resend.ts:22-26`). Gmail como `from` falla/spam.
- Decisión pendiente con el cliente (ver `decisiones-v2.0.md` §9); en app no se cambia.

## Orden de ejecución v2.0
1. P0-1 → P0-4 → P0-3 → P0-2 (este orden: fecha, token, tardío, monto).
2. P1-1, P1-2 (pagos sin tocar Stripe real).
3. P1-3, P1-8, P2-1, P2-2, P2-3, P2-4 (reservas/disponibilidad).
4. P1-4, P1-5, P1-6 (auth).
5. P1-7, P2-5, P2-6 (acceso/admin). P2-7 queda pendiente cliente.

# Decisiones de alcance — v2.0 (`update/version-2.0`)

Fecha: 2026-10-14. Rama: `update/version-2.0` (desde `develop`).
Base: auditoría contra `requisitos.md` + `tareas-mvp-develop.md` + `funcionalidades.md`.

## 0. Restricción global

- **No tocar automatizaciones externas: n8n ni Stripe.** Están configuradas por otra persona.
  - Implicación: en la app solo se trabaja el código que *llama* a esos servicios (`src/shared/integrations/n8n.ts`, `src/features/payments/*`, `src/app/api/payments/webhook/route.ts` en lectura), sin cambiar claves, URLs, eventos ni modo test/live.
  - Prohibido en v2.0: `stripe listen`, cambiar `STRIPE_*`, cambiar `N8N_WEBHOOK_URL/SECRET`, probar Stripe Test Mode real.

## 1. Alcance acordado (10 puntos de auditoría)

### 1 y 2. Reservas + concurrencia SÍ (sin Stripe Test Mode)
- **IN:** reserva simultánea (no doble reserva), último cupo (solo uno gana), pago abandonado (hold 10min libera), reserva pasada rechazada, solape del mismo cliente.
- **Cómo sin tocar Stripe:** pruebas a nivel servicio/repositorio con mocks de Stripe + reloj congelado + concurrencia simulada (transacciones paralelas contra `ServiceSlot`), no `stripe listen` ni checkout real.
- **OUT:** ciclo E2E con tarjeta real/de prueba, cambiar webhook, reembolsos.

### 3. E2E de los 3 flujos §34 SÍ
- **IN:** Playwright para cliente (registro → reserva → hold → QR mock), empleado (validar → dar acceso), admin (categoría → horarios → consultas). Con Stripe mockeado.
- **OUT:** E2E con Stripe real.

### 4. Métricas §20 SÍ (parcial operativo)
- **IN:** lo que falte en app: ingresos por rango/servicio/categoría, reservas por categoría, ocupación por fecha configurable, usadas vs no usadas.
- Nota: punto 5 (export) queda fuera, así que estas métricas son solo visualización en admin, no exportación.

### 5. Export Excel/PDF DESCARTADO
- Se queda solo el CSV actual (`GET /api/admin/export`). No se implementa `.xlsx` ni PDF de reportes en v2.0.

### 6. Venta física adultos mayores — PENDIENTE DE DECISIÓN (ver §2)
- No se implementa taquilla/POS en v2.0 hasta confirmar flujo de correo (abajo).
- Lo único existente hoy es el campo `channel|createdBy` con valor `in_person` (filtro muerto, sin endpoint ni UI).

### 7. Perfil cliente SÍ — prioritario
- **IN:** edición de teléfono y correo (con re-verificación al cambiar correo) + cambio de contraseña (ya existe) + historial/futuras (solo lectura, enlaza a reservas).
- **OUT explícito (33-H):** documento y fecha de nacimiento no editables.
- **Deuda asociada:** `Customer.document` es `String?` en `prisma/schema.prisma:51` y OAuth crea `Customer` sin documento (`oauth.repository.ts:109`). En v2.0 se implementa el perfil; el `NOT NULL` + backfill + captura post-OAuth queda como tarea separada (requiere migración con datos reales).

### 8. Entregables SÍ (parcial)
- **IN:** dejar campo/placeholder para URL de despliegue (README + docs), sincronizar `.env.example` con `.env` real.
- **Regla `.env.example`:** se añaden los que faltan del real (`CRON_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) **y se conservan** `N8N_WEBHOOK_URL/SECRET`, `QA_*`, `RESEND_*` aunque esta rama no los configure. Motivo: los gestiona la otra persona / QA; borrarlos rompería su setup.
- **OUT:** desplegar, dominio, `migrate deploy` prod.

### 9. Correos SÍ (solo app, sin tocar proveedor)
- **IN:** notificaciones de pago rechazado / hold expirado, emitir evento `usuario.verificado` (hoy tipado pero nunca emitido), pasar `documento` también por vía Resend (hoy solo va por n8n), retirar stub muerto `src/shared/lib/mailer.ts`.
- **OUT:** cambiar `RESEND_FROM_EMAIL`, dominio, SPF/DKIM, plantillas de n8n.

### 10. Cron de holds — explicación (ver §3)
- No se programa nada externo en v2.0 (lo haría la otra persona / infra). En app solo se deja el endpoint + documentado cómo activarlo. Detalle abajo.

### 11. CRUD servicios admin SÍ (decisión posterior, 2026-10-14)
- El punto 1 original de la auditoría (crear/editar/activar servicios) no había
  quedado en el alcance; se incorpora ahora: sin catálogo editable no hay
  operación real (§5 requisitos).
- **IN:** `createService` (categoría, precio, capacidad, horarios iniciales en
  transacción), `updateService`, `setServiceActive`, columna `imagen?` opcional
  (migración), regeneración acotada de `ServiceSlot`, API `POST/PATCH`
  (solo admin) + `ServiceForm`, tests (slug duplicado, capacidad < lo reservado,
  sin duplicar slots).
- **Guards:** no bajar capacidad bajo lo reservado; desactivar no toca reservas
  vivas; slug único; lo nuevo rige franjas futuras, lo vendido no se toca.
- **OUT:** duración como campo propio (se deriva de los slots de 1h),
  taquilla/POS (sigue en punto 6, fuera).

## 2. Punto 6: flujo de correo actual vs venta física

### Cómo funciona hoy (solo app)
1. Webhook confirma pago → `confirmarPagoExitoso` (`payments.service.ts:232`) → `emitirQrDeReserva` (`qr.ts:48`: 1 QR por persona × zona, token `randomBytes(24)`, solo hash SHA-256 en BD).
2. `entregarQrPorCorreo` (`payments.service.ts:244`): si `N8N_*` configurado → evento `reserva.confirmada` con PDF adjunto a n8n; si no → `sendQrEmail` directo por Resend (HTML + PNG + PDF `qr-pdf.ts`).
3. Cliente muestra el QR en el teléfono; empleado lo escanea en `/validar`.

### Qué pide 33-F (venta física)
- Módulo taquilla para adulto mayor: crear reserva presencial sin email, y en vez de QR por correo, mandar ticket a **impresora**.
- Hoy no existe: sin endpoint presencial, sin UI POS, sin `window.print`, sin rol de cajero. `QrToken.printedAt` está comentado en el schema.

### Implicaciones si se hiciera
- Nuevo endpoint + UI taquilla con validación de empleado/cajero, reserva `channel=in_person` sin exigir `emailVerified`.
- Alternativa al QR: ticket impreso con código corto (`short-code.ts:1`, 8 símbolos ya existe como respaldo) + registro `printedAt`.
- Riesgos: duplica el flujo de emisión (email vs impreso), hay que decidir si el ticket impreso también es de un solo uso, quién lo autoriza, y cómo se audita (hoy `Access.employeeId` lo cubre, pero falta `createdBy` cajero).
- **Decisión v2.0:** no implementar; queda documentado como cambio de alcance futuro (§36 requisitos).

## 3. Punto 10: para qué sirve el cron de holds

- Cada reserva crea `ReservationHold` de 10 min (`reservations.service.ts:20`). Si no se paga, hay que devolver los cupos (`heldCount -= q`, reserva → `expired`).
- Hoy la liberación es **reactiva (lazy):** ocurre solo cuando alguien consulta disponibilidad (`availability.repository.ts:214,351`) o crea otra reserva (`reservations.service.ts:435`).
- Problemas del modo reactivo:
  - Si nadie consulta esa franja, los cupos quedan ocupados más de 10 min.
  - Cada lectura de calendario paga el costo de buscar y liberar holds (`findMany` + N updates), lento con picos.
  - El “pago abandonado → libre a los 10 min” (§35) no se cumple por tiempo sino por coincidencia.
- El endpoint `GET /api/cron/holds` (`cron/holds/route.ts:22`, `Bearer CRON_SECRET`) hace esa limpieza de forma **proactiva** si algo externo lo llama cada N minutos (Vercel Cron, systemd, etc.).
- **Decisión v2.0:** se deja el endpoint + documentado (URL, header, frecuencia sugerida 1-5 min), sin programarlo (lo activa la otra persona / infra). Los tests de expiración (punto 1) validan la función liberadora, no el scheduler.

## 4. Bugs: hechos al 100% (ver `docs/bugs-v2.0.md`)

- Se ejecutaron en orden P0-1 → P0-4 → P0-3 → P0-2 → P1-1 → P1-2 → P1-3 → P1-8 →
  P2-1 → P2-2 → P2-3 → P2-4 → P1-4 → P1-5 → P1-6 → P1-7 → P2-5 → P2-6, cada uno
  con commit y tests. Detalle, porqués y cambios en `bugs-v2.0.md`.

## 5. Criterio de cierre v2.0 + orden de fases

- **Fase 1 — CRUD servicios:** repositorio + migración + guards + API/UI + tests.
- **Fase 2 — Perfil:** editable (teléfono/correo) con tests.
- **Fase 3 — Correos app** (pago/hold, verificado, documento consistente, sin stub).
- **Fase 4 — Métricas §20** visibles en admin (solo visualización, sin export).
- **Fase 5 — Cierre:** `.env.example` sincronizado + placeholder URL, E2E de los
  3 flujos con Stripe mockeado, concurrencia real con mocks.
- Sin regresiones: `tsc` 0, `lint` 0 errores, `vitest` en verde.

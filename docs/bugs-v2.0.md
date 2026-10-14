# Bugs y cambios v2.0 — detalle con evidencia

Rama: `update/version-2.0`. Todo verificado leyendo el código.
Convención: **P0** = rompe operación real / cobra mal / inconsistencia de datos.
**P1** = carrera o bypass serio. **P2** = inconsistencia UX/reglas.
Estado: bugs P0-1 → P2-6 hechos al 100% y Fases 1–5 implementadas.
Suite: 225 tests Vitest + 6 E2E Playwright en verde.

> Restricción v2.0: no se toca la configuración de Stripe real ni n8n
> (otra persona). Los fixes se prueban con mocks + reloj congelado.
> El flujo con Stripe test mode se verificó aparte con `stripe listen`
> (registro → reserva → checkout → webhook → QR → validación).

## Migraciones aplicadas (BD dev al día)

- `20261014025705_user_token_version`: `User.tokenVersion Int @default(0)` (P1-5).
- `20261014030928_access_invalidacion_manual`: `Access.invalidacionManual Boolean @default(false)` (P2-5).
- `20261014033446_service_imagen_activo`: `Service.imagen String?` + `Service.isActive Boolean @default(true)` (Fase 1).

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

## Fases v2.0 — qué se hizo y por qué

### Fase 1. CRUD de servicios del admin (`0ac46e8`)
- Por qué: sin catálogo editable no hay operación real (§5 requisitos); todo
  cambio iba por SQL.
- Qué: `createService` (categoría, precio, capacidad, horarios iniciales en
  transacción), `updateService`, `setServiceActive`, columna `imagen?`
  opcional, regeneración acotada de `ServiceSlot`, API `POST/PATCH` solo
  admin + `ServiceForm`, guards (no bajar capacidad bajo lo reservado,
  desactivar no toca reservas vivas, slug único, lo nuevo rige franjas
  futuras).
- Tests: slug duplicado, capacidad bajo lo reservado, sin duplicar slots.

### Fase 2. Perfil cliente (`6dab719`)
- Por qué: el cliente solo podía ver sus datos y cambiar la clave; el
  teléfono y el correo no eran editables.
- Qué: `PATCH /api/auth/me` (solo teléfono/correo; `document`/`birthDate`
  rechazados por schema estricto), cambio de correo con re-verificación
  (`emailVerified=false` + código nuevo + `tokenVersion++` que cierra las
  sesiones), UI con formularios + banner pendiente + reenvío, historial y
  futuras enlazadas a `/mis-reservas`.
- Tests: colisión de correo, P2002 en carrera, rate-limit, no-op con mismo
  correo, inactivo/inexistente.

### Fase 3. Correos de la app (3.1 `fc72f0d`, 3.2 `cfb29ea`, 3.3 `364d2c7`)
- Por qué: el rechazo de pago y el hold expirado eran silenciosos; el evento
  `usuario.verificado` existía tipado pero nunca se emitía; el `documento`
  solo viajaba por n8n; `mailer.ts` era un stub que lanzaba.
- Qué: avisos Resend directo de pago rechazado y hold expirado (el cron
  avisa lo que su barrido expira; las liberaciones perezosas no avisan),
  emisión de `usuario.verificado` al verificar, `documento` también por
  Resend, retiro del stub. Envío directo sin eventos n8n nuevos: crearlos
  exigiría workflows que su responsable no ha montado. Nada que falle en
  correo tumba el flujo principal (queda en log).
- Tests: aviso con motivo, fallo de correo no tumba, cron notifica/omite,
  callback de expiración solo al ganador.

### Fase 4. Métricas §20, solo visualización (4.1 `654f3b5`, 4.2 `f299c92`, 4.3 `b61e150`)
- Por qué: §20 exige ingresos por rango/servicio/categoría, reservas por
  categoría, ocupación por fecha configurable y usadas vs no usadas; solo
  existían totales y la foto de hoy. Export Excel/PDF fuera de alcance.
- Qué: `getMetricasRango` (ingresos por `paidAt`, reservas por `startsAt`;
  rango saneado a 30 días por defecto, máx. 90), `getOcupacionPorFecha`,
  `getUsoReservas` (no usada = confirmada pasada sin ningún QR consumido),
  sección Métricas en `/admin/reportes` con filtros, sin exportación.
- Tests: saneado de rango, agregadores, where estrictos.

### Fase 5. Cierre (5.1 `75d6610`, 5.2 `608a73c`, 5.3 `f9a616c`)
- Por qué: entregar v2.0 verificable de punta a punta.
- Qué: `.env.example` sincronizado (faltaban `CRON_SECRET` y
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; N8N/QA/Resend intactos) + placeholder
  de URL de despliegue en README; concurrencia real contra Postgres (último
  cupo: gana uno, otro `ya_reservado`; mismo cliente en paralelo:
  `horario_chocante`); E2E Playwright de los 3 flujos con Stripe mockeado
  (cliente, empleado con QR fixture, admin).
- Notas: specs E2E con pool acotado (pooler de 15) y trasplante de cookie
  `Secure` en `next start`; sin restos en BD tras correr.

### Fix adicional: mock P2-2 con `isActive` (`bd46168`)
- Por qué: el guard de Fase 1 (`!slot.service.isActive`) dejó obsoleto el
  mock de `solape-limpieza.test.ts`, que no traía el campo y fallaba.
- Qué: una línea en el mock. Falla pre-existente en árbol limpio, ajena a Fase 2.

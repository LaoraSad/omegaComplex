# Tareas para corregir la rama develop según requisitos.md

## Objetivo
Cerrar el MVP de Omega Complex de acuerdo con los requisitos funcionales definidos en `requisitos.md`, corrigiendo los huecos dejados por el merge de varias ramas y priorizando lo que afecta la operación real del negocio.

## Estado actual observado
La rama `develop` compila correctamente, pero no cumple de forma consistente el alcance mínimo del MVP. El problema no es un fallo de compilación sino una integración incompleta de funcionalidades críticas.

Se verificó que:
- `npm run build` funciona correctamente.
- La app tiene una base técnica sólida (Next.js + Prisma + PostgreSQL + Stripe + roles).
- Sin embargo, varias áreas críticas quedan pendientes o parcialmente implementadas.
- La suite actual no valida el negocio real; hay varios tests en `describe.todo(...)` y varios módulos con `TODO`.

---

## Prioridad 1 — Requisitos críticos del negocio

### 1. Completar autenticación real del sistema
**Objetivo:** cumplir el requisito de registro, login, sesión, verificación por correo, recuperación y cambio de contraseña.

Tareas:
- [x] Finalizar flujo de registro con email y contraseña.
- [x] Implementar verificación del correo electrónico.
- [x] Implementar recuperación de contraseña.
- [x] Implementar cambio de contraseña.
- [x] Completar sesión del usuario y protección de rutas por rol.
- [x] Implementar OAuth de Google si aplica al alcance.
- [x] Validar comportamiento con pruebas reales.

Archivos relevantes:
- `src/features/auth/`
- `src/shared/auth/session.ts`
- `src/app/api/auth/*`
- `src/features/auth/__tests__/auth.test.ts`

### 2. Completar checkout y pago con Stripe
**Objetivo:** cumplir el flujo completo de reserva: bloqueo temporal → checkout → pago → confirmación → QR.

Tareas:
- [x] Definir y cerrar el flujo de creación de sesión de Stripe.
- [x] Vincular la reserva con el Payment correcto.
- [x] Completar webhook de Stripe con estados claros.
- [x] Gestionar pagos rechazados, expirados y pendientes.
- [x] Asegurar que la reserva no se considera pagada solo por volver a la app.
- [x] Integrar confirmación real con Stripe como fuente de verdad.
- [ ] Probar el ciclo completo con entorno de pruebas.

Archivos relevantes:
- `src/app/api/payments/webhook/route.ts`
- `src/features/payments/`
- `src/features/reservations/reservations.service.ts`

### 3. Cerrar generación y envío del QR
**Objetivo:** cumplir la regla de confirmación, QR único y envío por correo.

Tareas:
- [x] Generar QR asociado a la reserva confirmada.
- [x] Guardar token seguro y no exponer información sensible.
- [x] Enviar QR por correo electrónico.
- [x] Asegurar que cada QR sea de un solo uso.
- [x] Validar qué pasa si el QR es reutilizado.
- [ ] Probar el flujo completo reserva → pago → QR → empleado.

Archivos relevantes:
- `src/features/reservations/qr.ts`
- `src/shared/lib/mailer.ts`
- `src/features/access/access.service.ts`

### 4. Finalizar la validación del acceso por QR para empleados
**Objetivo:** cumplir la lógica de ingreso a instalaciones con verificación manual del empleado.

Tareas:
- [x] Confirmar que la reserva existe, está confirmada y no caducó.
- [x] Validar fecha y horario real.
- [x] Denegar acceso si el QR ya fue usado.
- [x] Registrar intento fallido o acceso exitoso.
- [x] Mostrar la información correcta del servicio y la reserva al empleado.
- [x] Reforzar validación del lado del servidor y base de datos.
- [x] Probar casos de rechazo y aceptación.

Archivos relevantes:
- `src/features/access/access.service.ts`
- `src/features/access/access.repository.ts`
- `src/app/api/access/validate/route.ts`

---

## Prioridad 2 — Requisitos operativos

### 5. Completar disponibilidad, horarios, bloqueos y capacidad
**Objetivo:** cumplir la lógica de reservas, capacidad real y concurrencia.

Tareas:
- [x] Finalizar `availability` real por servicio, fecha y horario.
- [x] Implementar gestión de horarios semanales por servicio.
- [x] Definir y cerrar bloqueo temporal de franjas con expiración.
- [x] Resolver control de capacidad por servicio con lógica en base de datos.
- [x] Proteger reservas simultáneas contra race conditions.
- [x] Validar reglas de solapamiento del cliente y servicios con cupos.

Archivos relevantes:
- `src/features/availability/availability.service.ts`
- `src/features/schedules/schedules.service.ts`
- `src/features/reservations/reservations.service.ts`
- `prisma/schema.prisma`

### 6. Finalizar dashboard administrativo y reportes
**Objetivo:** cumplir métricas de reservas, ocupación, ingresos y accesos.

Tareas:
- [x] Crear consultas para reservas por rango, servicio y categoría.
- [x] Crear métricas de ocupación por servicio y fecha.
- [x] Crear reportes de ingresos por rango/servicio/categoría.
- [x] Crear conteo de accesos y reservas usadas/no usadas.
- [x] Diseñar vistas administrativas y filtros.
- [x] Cubrir estas métricas con pruebas de integridad.

Archivos relevantes:
- `src/features/admin/admin.service.ts`
- `src/app/(admin)/**`

### 7. Completar módulos de catálogo y servicios
**Objetivo:** asegurar que la gestión administrativa de servicios y categorías funcione según los requisitos.

Tareas:
- [x] Revisar creación, edición, activación y desactivación de categorías.
- [x] Revisar creación de servicios por categoría.
- [x] Confirmar capacidad, precio, duración y disponibilidad por servicio.
- [x] Validar restricciones de slugs, estado activo e integridad de datos.

Archivos relevantes:
- `src/features/catalog/`
- `src/app/api/categories/*`
- `src/app/api/services/*`

---

## Prioridad 3 — Calidad y seguridad

### 8. Reforzar protección y validación de backend
**Objetivo:** cumplir el requisito de seguridad y no depender del frontend.

Tareas:
- [x] Revisar validación de datos en servidor en cada endpoint.
- [x] Confirmar autorizaciones por rol.
- [x] Revisar rutas protegidas por middleware y permisos.
- [x] Revisar manejo seguro de Stripe webhook.
- [x] Revisar tokens seguros para QR.
- [x] Establecer logging de eventos críticos.

Archivos relevantes:
- `src/shared/auth/`
- `src/shared/http/`
- `src/shared/lib/stripe.ts`
- `src/app/api/**`

### 9. Completar pruebas reales del MVP
**Objetivo:** eliminar _placeholders_ y verificar comportamiento real.

Tareas:
- [x] Escribir pruebas reales para auth.
- [ ] Escribir pruebas reales para reservas y concurrencia.
- [x] Escribir pruebas reales para acceso por QR.
- [x] Escribir pruebas reales para pagos y webhook.
- [x] Escribir pruebas reales para dashboard y métricas.
- [ ] Ejecutar la suite de pruebas y corregir fallas.

Archivos relevantes:
- `src/features/**/__tests__/**`
- `vitest.config.ts`

---

## Prioridad 4 — Documentación y despliegue

### 10. Cerrar documentación técnica y entregables
**Objetivo:** cumplir lo especificado en la entrega final del proyecto.

Tareas:
- [x] Actualizar README con estado real del proyecto.
- [x] Documentar arquitectura final.
- [x] Documentar estructura de carpetas y flujos.
- [x] Entregar diagrama ER actualizado.
- [x] Revisar variables de entorno y despliegue.
- [x] dejar instrucciones claras para correr la app y migrar la BD.

Archivos relevantes:
- `README.md`
- `prisma/schema.prisma`
- `docs/`

---

## Orden recomendado de ejecución

1. Auth + sesiones + email + seguridad
2. Stripe + checkout + confirmación de pago
3. QR + validación de acceso + empleado
4. Disponibilidad + capacidad + bloqueo temporal + concurrencia
5. Dashboard administrativo + reportes
6. Pruebas reales
7. Documentación final y despliegue

---

## Riesgo principal detectado
El mayor riesgo de la rama `develop` no es que falle al compilar, sino que al hacer merge se mezclaron implementaciones parciales y quedaron varias capas funcionales incompletas. El sistema tiene arquitectura base, pero no está listo para operar como un complejo deportivo con reservas reales, pagos, control de acceso y reportes.

---

## Criterio de cierre del MVP
Se considerará MVP validado cuando se cumpla el flujo real:

- usuario se registra e inicia sesión,
- consulta servicios y disponibilidad,
- selecciona horario y bloquea disponibilidad,
- paga con Stripe en pruebas,
- la reserva queda confirmada,
- se genera y envía QR,
- el empleado valida el QR y registra acceso,
- el administrador ve reservas, ocupación e ingresos,
- y todo eso está cubierto por pruebas reales.


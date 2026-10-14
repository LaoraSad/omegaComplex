# Handoff — continuar v2.0 en otra sesión de opencode

## Dónde quedamos
- Rama: `update/version-2.0` (desde `develop`), al día con `origin`.
- Último commit: `0ac46e8` "feat(admin): Fase 1 CRUD de servicios con guards e imagen 360".
- Bugs (`docs/bugs-v2.0.md`): **100% hechos** (P0-1→P2-6), suite 181 tests en verde.
- **Siguiente: Fase 2 — Perfil cliente** (edición teléfono/correo con
  re-verificación + historial/futuras; documento y nacimiento NO editables).

## Leer primero (en este orden)
1. `docs/decisiones-v2.0.md` — alcance, restricciones, fases y criterio de cierre.
2. `docs/bugs-v2.0.md` — cada bug: causa, fix, commit y tests.
3. `git log --oneline -15` para el historial reciente.

## Restricciones vigentes (no negociables sin el usuario)
- **No tocar Stripe real ni n8n** (otra persona). Solo mocks, sin `stripe listen`,
  sin cambiar claves/URLs. P0-2 quedó congelado pendiente de verificación del
  responsable de Stripe antes de producción.
- Commits a nombre local del repo: `jhaymayleth <josemrn2006@gmail.com>`
  (config `--local`, no tocar la global).
- **Credenciales:** en el PC anterior el push usa
  `.git/credenciales-jhaymayleth` (archivo local, NO se sube al repo) vía
  `credential.helper` local. **En este computador NO existe**: configura tu
  propio método de push antes de subir (nunca uses ni borres credenciales
  guardadas de otras personas). El token anterior se revocó por haberse
  compartido en chat.
- Puerto 3000: lo usa el usuario (`npm run dev`); las pruebas de arranque
  usan otro puerto (ej. 3101) y se matan al terminar.

## Fases restantes
- **Fase 2**: perfil cliente (prioritario).
- **Fase 3**: correos app (pago/hold, `usuario.verificado`, `documento` en
  Resend, quitar `src/shared/lib/mailer.ts`).
- **Fase 4**: métricas §20 (solo visualización).
- **Fase 5**: `.env.example` + placeholder URL, E2E 3 flujos, concurrencia real.
- Fuera de v2.0: export Excel/PDF, venta física/POS, Stripe Test Mode real.

## Notas de despliegue (cuando toque)
- Las sesiones actuales se cierran una vez (JWT sin `tv`).
- Verificar COP con el responsable de Stripe.
- Programar el cron de holds lo hace la otra persona/infra.
- Migraciones aplicadas en BD dev: `user_token_version`,
  `access_invalidacion_manual`, `service_imagen_activo`.

## Convenciones del repo
- Lógica en `features/`, rutas solo validan (Zod) y delegan. Tests con alias
  `@`, `vi.hoisted` para mocks, español en tests y mensajes.
- `tsc` 0 errores, lint 0 errores, `vitest` en verde antes de cada commit.
- Un commit por cambio, mensajes `fix(scope):` / `feat(scope):` / `docs:` / `test:`.

# Omega Complex

Frontend de Omega Complex construido con Next.js App Router y TypeScript.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configura `NEXT_PUBLIC_API_URL` en `.env.local` con la URL base proporcionada por el equipo de backend. No agregues credenciales ni claves privadas a variables `NEXT_PUBLIC_*`.

## Autenticación

El frontend incluye las páginas `/login`, `/register`, `/verify-email`, `/forgot-password` y `/reset-password`. Las solicitudes HTTP están aisladas en `src/lib/api/auth.ts`.

Los paths de autenticación actuales (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` y `/auth/resend-verification`) son valores provisionales centralizados en `AUTH_API_PATHS`; deben confirmarse y ajustarse con el contrato del backend. La autenticación con Google no está habilitada hasta que se acuerde el proveedor y flujo OAuth. El frontend no persiste contraseñas ni simula sesiones.

## Validación

```bash
npm run lint
npm run build
```

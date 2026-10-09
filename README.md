<div align="center">

<img src="./docs/assets/banner.svg" alt="Omega Complex" width="100%" />

<br />
<br />

[![Inicio](https://img.shields.io/badge/Inicio-7A1F3D?style=for-the-badge)](#visión-general)
[![Experiencia](https://img.shields.io/badge/Experiencia-7A1F3D?style=for-the-badge)](#experiencia-de-reserva)
[![Arquitectura](https://img.shields.io/badge/Arquitectura-7A1F3D?style=for-the-badge)](#arquitectura)
[![API](https://img.shields.io/badge/API-7A1F3D?style=for-the-badge)](#referencia-api)
[![Stack](https://img.shields.io/badge/Stack-7A1F3D?style=for-the-badge)](#stack-tecnológico)
[![Instalación](https://img.shields.io/badge/Instalación-C8A96B?style=for-the-badge&labelColor=C8A96B&color=C8A96B)](#instalación)
[![Desarrollo](https://img.shields.io/badge/Desarrollo-C8A96B?style=for-the-badge&labelColor=C8A96B&color=C8A96B)](#desarrollo)

<br />

![Next.js](https://img.shields.io/badge/Next.js-App_Router-1F1F1F?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-1F1F1F?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-1F1F1F?style=flat-square&logo=typescript&logoColor=3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-1F1F1F?style=flat-square&logo=tailwindcss&logoColor=06B6D4)
![Prisma](https://img.shields.io/badge/Prisma-6.19-1F1F1F?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-1F1F1F?style=flat-square&logo=postgresql&logoColor=4169E1)
![Stripe](https://img.shields.io/badge/Stripe-Payments-1F1F1F?style=flat-square&logo=stripe&logoColor=635BFF)

</div>

<br />

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Visión general

**Omega Complex** digitaliza la experiencia completa de un complejo deportivo y recreativo: desde consultar un servicio hasta cruzar la puerta con un código QR validado.

El objetivo es que el usuario complete su reserva con la menor fricción posible, mientras el equipo operativo controla accesos, horarios y capacidad desde un único lugar.

<table>
<tr>
<td width="33%" valign="top">

### Cliente

Explora servicios, consulta disponibilidad en tiempo real, reserva por fecha y horario, paga en línea y recibe su código QR de acceso.

</td>
<td width="33%" valign="top">

### Empleado

Escanea el QR en la entrada y valida en segundos la reserva, el horario y el uso previo del código.

</td>
<td width="33%" valign="top">

### Administrador

Gestiona servicios, instalaciones, horarios, reservas y empleados desde un panel centralizado.

</td>
</tr>
</table>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Experiencia de reserva

El recorrido completo, de la consulta al acceso:

<div align="center">
<img src="./docs/assets/flow.svg" alt="Flujo de reserva: servicio, disponibilidad, reserva, pago, confirmación y acceso" width="100%" />
</div>

<br />

La disponibilidad y el estado definitivo de cada reserva son responsabilidad exclusiva del backend. El navegador nunca decide si una reserva queda confirmada.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#7A1F3D','primaryTextColor':'#F5F5F5','primaryBorderColor':'#7A1F3D','lineColor':'#C8A96B','secondaryColor':'#C8A96B','tertiaryColor':'#F5F5F5'}}}%%
flowchart LR
    S[Servicio] --> F[Fecha y horario]
    F --> I[Información de reserva]
    I --> B[Bloqueo temporal<br/>10 minutos]
    B --> P{Pago}
    P -->|Rechazado| L[Liberar disponibilidad]
    P -->|Confirmado| R[Reserva confirmada]
    R --> Q[Código QR]

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    class S,F,I,B,P primary;
    class L,R,Q accent;
```

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Funcionalidades

<details open>
<summary><strong>Cliente</strong></summary>

<br />

| Funcionalidad              | Estado        |
| -------------------------- | ------------- |
| Registro                   | **Disponible** |
| Inicio de sesión           | **Disponible** |
| Consulta de servicios      | **Disponible** |
| Consulta de disponibilidad | **Disponible** |
| Perfil                     | **Disponible** |
| Recuperación de contraseña | **Disponible** |
| Verificación de correo     | **Disponible** |
| Cambio de contraseña       | **Disponible** |
| Reservas                   | **Disponible** |
| Pagos (Stripe)             | **Disponible** |
| Código QR por correo       | **Disponible** |
| Mis reservas               | **Disponible** |
| Historial de reservas      | **Disponible** |

</details>

<details>
<summary><strong>Empleado</strong></summary>

<br />

| Funcionalidad         | Estado        |
| --------------------- | ------------- |
| Autenticación por rol | **Disponible** |
| Escaneo de QR         | **Disponible** |
| Validación de reserva | **Disponible** |
| Validación de horario | **Disponible** |
| Registro de acceso    | **Disponible** |

</details>

<details>
<summary><strong>Administrador</strong></summary>

<br />

| Funcionalidad            | Estado        |
| ------------------------ | ------------- |
| Dashboard                | **Disponible** |
| Gestión de servicios     | **Disponible** |
| Gestión de instalaciones | **Disponible** |
| Gestión de horarios      | **Disponible** |
| Gestión de reservas      | **Disponible** |
| Gestión de empleados     | **Disponible** |
| Información operativa    | **Disponible** |

</details>

<br />

### Estado del desarrollo

<div align="center">
<img src="./docs/assets/progress.svg" alt="Estado del desarrollo por módulo" width="100%" />
</div>

<sub>Los porcentajes son una representación del avance actual y se actualizan conforme progresa la implementación.</sub>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Arquitectura

Omega Complex se organiza por dominios mediante **vertical slices**. Cada feature contiene su propia lógica, validación y acceso a datos.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#7A1F3D','primaryTextColor':'#F5F5F5','primaryBorderColor':'#7A1F3D','lineColor':'#C8A96B'}}}%%
flowchart TB
    UI["Next.js / React"] --> Routes["App Router"]
    Routes --> API["Route Handlers"]

    subgraph Features["Features por dominio"]
        direction LR
        Auth["Auth"]
        Catalog["Catalog"]
        Availability["Availability"]
        Reservations["Reservations"]
        Payments["Payments"]
        Access["Access"]
        Admin["Admin"]
    end

    API --> Features
    Features --> Services["Services"]
    Services --> Repositories["Repositories"]
    Repositories --> Prisma["Prisma"]
    Prisma --> DB[("PostgreSQL")]

    classDef main fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    classDef neutral fill:#F5F5F5,color:#1F1F1F,stroke:#E5E7EB;
    class UI,Routes,API main;
    class Services,Repositories accent;
    class Prisma,DB neutral;
```

### Principio de separación

| Capa              | Responsabilidad                                         |
| ----------------- | ------------------------------------------------------- |
| Presentation      | Páginas y componentes. Sin lógica de negocio compleja.  |
| Route Handler     | Entrada HTTP, validación y respuesta.                   |
| Feature Service   | Reglas de negocio del dominio.                          |
| Repository        | Acceso a datos.                                         |
| Prisma            | ORM y consultas. Nunca se invoca desde la UI.           |
| PostgreSQL        | Persistencia.                                           |

### Comunicación HTTP

El cliente web usa `fetch` con sobres `{ data, error }` (`src/lib/api/*`) contra los Route Handlers del mismo proyecto. No hay backend externo. (`axios` sigue declarado como dependencia pero ningún módulo lo importa.)

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#7A1F3D','primaryTextColor':'#F5F5F5','lineColor':'#C8A96B'}}}%%
flowchart LR
    Component["React Component"] --> Axios --> API["/api/*"] --> Service["Feature Service"] --> Repository --> DB[("PostgreSQL")]
    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    class Component,Axios,API primary;
    class Service,Repository accent;
```

<details>
<summary><strong>Estructura del proyecto</strong></summary>

<br />

```text
src/
├── app/
│   ├── (auth)/          change-password (en perfil), forgot-password, login, register, reset-password, verify-email
│   ├── (customer)/      reservas
│   ├── (employee)/      validar, turnos
│   ├── (storefront)/    mis-reservas, perfil, servicios
│   ├── (public)/        landing
│   ├── (admin)/         panel: reservas, accesos, categorías, servicios, horarios, empleados, clientes, reportes
│   └── api/             access, admin/export, auth, availability, categories, cron/holds, payments, pools, reservations, services
│
├── components/          auth, admin, catalog, public, storefront
├── features/            access, admin, auth, availability, catalog, payments, reservations (+ qr)
├── lib/                 api, email
├── shared/              auth, http, lib (db, env, logger, stripe)
├── types/               auth
└── middleware.ts        protección por rol (JWT sin BD)
```

</details>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Stack tecnológico

<div align="center">

<img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,prisma,postgres,supabase,vitest,playwright,docker&perline=10" alt="Tecnologías principales" />

</div>

<br />

| Categoría      | Tecnología                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js App Router                  |
| Frontend       | React 19.2                          |
| Lenguaje       | TypeScript 5, modo estricto         |
| Estilos        | Tailwind CSS v4, shadcn/ui          |
| Iconografía    | Lucide React                        |
| Animaciones    | Motion                              |
| Formularios    | React Hook Form, Zod                |
| Cliente HTTP   | Axios                               |
| Estado global  | Zustand                             |
| Fechas         | date-fns, React Day Picker          |
| Notificaciones | Sonner                              |
| QR             | qrcode.react                        |
| Gráficas       | Recharts                            |
| Backend        | Next.js Route Handlers              |
| ORM            | Prisma 6.19                         |
| Base de datos  | PostgreSQL / Supabase               |
| Autenticación  | jose, bcryptjs                      |
| Pagos          | Stripe                              |
| Pruebas        | Vitest, Playwright                  |

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Dominio

### Autenticación y roles

Omega Complex implementa autenticación propia con `bcryptjs` para contraseñas y `jose` para JWT de 7 días, guardados en cookies `HttpOnly` con `SameSite=Lax`. Un middleware protege las rutas y aplica autorización por rol.

| Rol           | Área                   | Ruta de entrada       |
| ------------- | ---------------------- | --------------------- |
| Usuario       | Cliente                | `/`                   |
| Empleado      | Validación de acceso   | `/validar`            |
| Administrador | Administración         | `/admin`              |

### Reservas

La disponibilidad de un servicio es el resultado de combinar servicio, fecha, horario, capacidad, reservas existentes, bloqueos temporales y estado de cada reserva.

| Regla                | Valor         |
| -------------------- | ------------- |
| Anticipación máxima  | 3 meses       |
| Horario              | 08:00 a 17:00 |
| Mantenimiento        | Lunes         |
| Duración del bloqueo | 10 minutos    |
| Cobro                | Por hora      |

> Si un lunes es festivo, el mantenimiento se desplaza al martes.

### Pagos

Stripe es el proveedor de pagos. El estado de una reserva **no** se confirma por el retorno del navegador tras el checkout: **el webhook es la fuente de verdad**.

```mermaid
%%{init: {'theme':'base','themeVariables':{'actorBkg':'#7A1F3D','actorTextColor':'#F5F5F5','actorBorder':'#7A1F3D','signalColor':'#7A1F3D','noteBkgColor':'#C8A96B'}}}%%
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant S as Stripe
    participant DB as PostgreSQL

    C->>A: Crear reserva temporal
    A->>DB: Crear bloqueo
    A-->>C: Sesión de pago
    C->>S: Completar pago
    S-->>C: Resultado del checkout
    S->>A: Webhook
    A->>DB: Actualizar Payment
    A->>DB: Confirmar reserva
    DB-->>C: Estado confirmado
```

### Control de acceso

El empleado valida cada entrada escaneando el QR. La validación comprueba la existencia del código, la reserva asociada, su estado confirmado, la fecha, la hora y el uso previo.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#7A1F3D','primaryTextColor':'#F5F5F5','lineColor':'#C8A96B'}}}%%
flowchart TD
    Scan["Escanear QR"] --> ValidQR{"QR válido?"}
    ValidQR -->|No| Reject
    ValidQR -->|Sí| Reservation{"Reserva confirmada?"}
    Reservation -->|No| Reject
    Reservation -->|Sí| Time{"Fecha y horario válidos?"}
    Time -->|No| Reject
    Time -->|Sí| Used{"QR ya utilizado?"}
    Used -->|Sí| Reject["Rechazar acceso"]
    Used -->|No| Allow["Permitir acceso"]

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    class Scan,Allow primary;
    class Reject accent;
```

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Referencia API

Base: mismo origen, prefijo `/api`. Todas las respuestas usan el formato `{ "data": T | null, "error": { "code", "message" } | null }`. La sesión viaja en cookie `HttpOnly` (`credentials: "include"` en el cliente).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crea `User` + `Customer`, deja sesión activa (`201`) |
| POST | `/api/auth/login` | Inicia sesión (`200`) |
| POST | `/api/auth/logout` | Cierra sesión e invalida la cookie |
| GET | `/api/auth/me` | Usuario actual (`401` sin sesión) |
| POST | `/api/auth/change-password` | Cambia la contraseña con sesión (exige la actual) |
| POST | `/api/auth/forgot-password` | Envía enlace de recuperación por correo (Resend) |
| POST | `/api/auth/reset-password` | Fija nueva contraseña con token de un solo uso |
| POST | `/api/auth/resend-verification` | Reenvía código de verificación |
| POST | `/api/auth/verify-email` | Verifica el correo con el código |
| GET | `/api/auth/oauth/google` | Inicia OAuth con Google (state anti-CSRF) |
| GET | `/api/auth/oauth/google/callback` | Retorno de Google, crea/vincula cuenta |
| GET · POST | `/api/categories` | Lista y crea categorías (POST solo admin) |
| GET · PATCH | `/api/categories/[id]` | Detalle y actualización (admin) |
| GET | `/api/services` · `/api/services/[id]` | Catálogo real desde la base |
| GET | `/api/availability` | Disponibilidad por servicio y fecha (público) |
| GET | `/api/pools` · `/api/pools/[id]` | Catálogo de piscinas (datos reales) |
| GET · POST | `/api/reservations` | Lista propias y crea reservas con hold |
| GET | `/api/reservations/[id]` | Detalle propio con QR y pagos |
| POST | `/api/reservations/[id]` | Crea la Checkout Session de Stripe |
| POST | `/api/payments/webhook` | Webhook de Stripe (fuente de verdad del pago) |
| POST | `/api/access/validate` | Consulta de QR en puerta |
| POST | `/api/access/validate?action=confirm` | El empleado confirma el ingreso |
| GET | `/api/admin/export` | Exportación CSV (solo admin) |
| GET | `/api/cron/holds` | Libera holds vencidos (requiere `CRON_SECRET`) |

Códigos: `200` OK · `201` creado · `400` validación · `401` no autenticado · `403` rol insuficiente · `404` no encontrado · `409` conflicto (email/documento duplicado) · `501` no implementado · `500` error interno.

### Modelo de datos

Fuente de verdad: `prisma/schema.prisma` (PostgreSQL). Resumen por dominio:

| Dominio | Modelos |
|---|---|
| Identidad | `Role`, `User`, `Customer` (documento único, fecha de nacimiento), `Employee`, `OAuthAccount`, `EmailVerification`, `PasswordReset` |
| Catálogo | `Category`, `Service`, `ServiceSchedule`, `ServiceClosure`, `ServiceSlot` (cupos y bloqueos por franja) |
| Reservas | `Reservation` (estado, canal, cantidad, total), `ReservationBlock` (tramo por zona), `ReservationSlot`, `ReservationGuest` (titular + acompañantes), `ReservationHold` (bloqueo temporal con expiración) |
| Pagos | `Payment` (método, estado, ids de Stripe), `StripeEvent` (idempotencia por `eventId`) |
| Acceso | `QrToken` (hash único, un QR por persona y zona, un solo uso), `Access` (resultado, motivo, empleado) |

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Identidad visual

La interfaz busca una estética deportiva, moderna, elegante y profesional. El dorado funciona únicamente como acento.

<table>
<tr>
<td align="center" width="16.6%"><img src="https://placehold.co/96x96/7A1F3D/7A1F3D.png" alt="Primary" /><br /><strong>Primary</strong><br /><code>#7A1F3D</code></td>
<td align="center" width="16.6%"><img src="https://placehold.co/96x96/C8A96B/C8A96B.png" alt="Accent" /><br /><strong>Accent</strong><br /><code>#C8A96B</code></td>
<td align="center" width="16.6%"><img src="https://placehold.co/96x96/F5F5F5/F5F5F5.png" alt="Background" /><br /><strong>Background</strong><br /><code>#F5F5F5</code></td>
<td align="center" width="16.6%"><img src="https://placehold.co/96x96/1F1F1F/1F1F1F.png" alt="Text" /><br /><strong>Text</strong><br /><code>#1F1F1F</code></td>
<td align="center" width="16.6%"><img src="https://placehold.co/96x96/6B7280/6B7280.png" alt="Secondary" /><br /><strong>Secondary</strong><br /><code>#6B7280</code></td>
<td align="center" width="16.6%"><img src="https://placehold.co/96x96/E5E7EB/E5E7EB.png" alt="Border" /><br /><strong>Border</strong><br /><code>#E5E7EB</code></td>
</tr>
</table>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Instalación

**Requisitos:** Node.js, npm y una base de datos PostgreSQL o Supabase.

```bash
# 1. Clonar
git clone <REPOSITORY_URL>
cd omega-complex

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Migrar y poblar la base de datos
npx prisma migrate dev
npx prisma db seed

# 5. Ejecutar
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

<details>
<summary><strong>Variables de entorno</strong></summary>

<br />

| Variable                | Descripción                               |
| ----------------------- | ----------------------------------------- |
| `DATABASE_URL`          | Conexión PostgreSQL (+`?connection_limit=3` en dev) |
| `JWT_SECRET`            | Secreto utilizado para firmar JWT         |
| `STRIPE_SECRET_KEY`     | Clave privada de Stripe                   |
| `STRIPE_WEBHOOK_SECRET` | Firma del webhook                         |
| `RESEND_API_KEY`        | Envío de correos (QR, verificación)       |
| `RESEND_FROM_EMAIL`     | Remitente verificado en Resend            |
| `NEXT_PUBLIC_APP_URL`   | URL pública (links de correo y Stripe)    |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth con Google            |
| `CRON_SECRET`           | Bearer del cron de holds (obligatorio)    |
| `ADMIN_*`               | Variables relacionadas con administración |

Los valores reales nunca deben almacenarse en el repositorio.

</details>

<details>
<summary><strong>API</strong></summary>

<br />

La API forma parte del mismo proyecto Next.js, en `src/app/api/`. No se requiere un backend externo ni `NEXT_PUBLIC_API_URL`.

```text
/api/auth/*
/api/access/validate
/api/availability
/api/categories
/api/services
/api/pools
/api/reservations
/api/payments/webhook
/api/admin/export
/api/cron/holds
```

</details>

<details>
<summary><strong>Docker</strong></summary>

<br />

La aplicación usa una estrategia multistage. La imagen de producción corre con un usuario no privilegiado y expone el puerto `3000`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#7A1F3D','primaryTextColor':'#F5F5F5','lineColor':'#C8A96B'}}}%%
flowchart LR
    Dependencies --> Builder --> Runner["Production Runner"]
    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    class Dependencies,Builder primary;
    class Runner accent;
```

</details>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Desarrollo

### Flujo para una nueva funcionalidad

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#7A1F3D','primaryTextColor':'#F5F5F5','lineColor':'#C8A96B'}}}%%
flowchart LR
    A[Requerimiento] --> B[Analizar dominio] --> C[Tipos] --> D[Validación Zod] --> E[Service] --> F[Repository]
    F --> G[API] --> H[UI con Axios] --> I[Loading, error, success] --> J[Tests] --> K[Lint y build]
    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    class A,B,C,D,E,F primary;
    class G,H,I,J,K accent;
```

### Convenciones

* TypeScript estricto. Evitar `any`.
* Si una funcionalidad pertenece a un dominio existente, se incorpora dentro de su feature. No se crean capas paralelas.
* Antes de crear un componente: revisar los existentes, evaluar si se puede reutilizar, extenderlo si corresponde y crear uno nuevo solo con una responsabilidad clara.

```text
features/
└── reservations/
    ├── components/
    ├── repository.ts
    ├── schemas.ts
    ├── service.ts
    ├── types.ts
    └── index.ts
```

### Validación antes de un commit importante

```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

| Herramienta | Cobertura                               |
| ----------- | --------------------------------------- |
| Vitest      | Services, schemas y lógica de negocio   |
| Playwright  | Autenticación, reservas, pagos y acceso |

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Seguridad

<table>
<tr>
<td width="50%" valign="top">

**Implementado**

* Hash de contraseñas con `bcryptjs`.
* JWT con `jose`.
* Cookies `HttpOnly` y `SameSite=Lax`.
* Validación con Zod.
* Middleware de autorización.
* Control de acceso basado en roles.
* Variables sensibles mediante `.env`.
* Firma de webhook de Stripe verificada + idempotencia por `eventId`.
* QR de un solo uso (hash SHA-256, consumo atómico en BD).
* Correo transaccional (Resend) + recuperación y verificación.
* Logging JSON de eventos críticos (`shared/lib/logger`, sin secretos).

</td>
<td width="50%" valign="top">

**Pendiente antes de producción**

* Rate limiting.
* Mover la BD a una región cercana (hoy `us-west-2`, ~270 ms por consulta).
* Pruebas E2E de flujos críticos.
* PDF descargable de QR (hoy se envían por correo).

</td>
</tr>
</table>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Roadmap

```mermaid
%%{init: {'theme':'base','themeVariables':{'cScale0':'#7A1F3D','cScale1':'#C8A96B','cScale2':'#7A1F3D','cScale3':'#C8A96B','cScale4':'#7A1F3D','cScale5':'#C8A96B','cScaleLabel0':'#F5F5F5','cScaleLabel1':'#1F1F1F','cScaleLabel2':'#F5F5F5','cScaleLabel3':'#1F1F1F','cScaleLabel4':'#F5F5F5','cScaleLabel5':'#1F1F1F'}}}%%
timeline
    title Omega Complex
    section Foundation
        Arquitectura : Next.js : Prisma : PostgreSQL
        Authentication : JWT : Roles : Middleware
    section Core
        Catalog : Servicios : Instalaciones
        Availability : Horarios : Capacidad
    section Reservations
        Reservation flow : Disponibilidad : Bloqueo temporal : Confirmación
    section Payments
        Stripe : Checkout : Webhooks
    section Access
        QR : Generación : Validación : Registro
    section Administration
        Dashboard : Gestión : Reportes : Operación
```

### Alcance del MVP

<table>
<tr>
<td width="50%" valign="top">

**Incluido**

* Autenticación y roles.
* Catálogo, servicios e instalaciones.
* Disponibilidad.
* Reservas y pagos.
* QR y control de acceso.
* Gestión administrativa.

</td>
<td width="50%" valign="top">

**Fuera del MVP**

* Membresías y suscripciones.
* Puntos y marketplace.
* Reconocimiento facial.
* Hardware de acceso.
* Aplicación móvil nativa.
* Modo offline.
* Múltiples sedes.
* Facturación electrónica.
* WhatsApp.

</td>
</tr>
</table>

<img src="./docs/assets/divider.svg" width="100%" alt="" />

## Licencia

Este proyecto es de uso privado y forma parte del desarrollo de **Omega Complex**.

<br />

<div align="center">

**Omega Complex**

Plataforma digital para una experiencia deportiva más simple, conectada y eficiente.

</div>
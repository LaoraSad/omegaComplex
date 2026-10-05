# Omega Complex

<p align="center">
  <img src="./docs/assets/omega-complex-logo.svg" width="180" alt="Omega Complex" />
</p>

<p align="center">
  <strong>Plataforma web para la gestión, reserva y control de acceso de un complejo deportivo y recreativo.</strong>
</p>

<p align="center">
  <a href="#características">Características</a>
  ·
  <a href="#arquitectura">Arquitectura</a>
  ·
  <a href="#stack-tecnológico">Stack</a>
  ·
  <a href="#instalación">Instalación</a>
  ·
  <a href="#desarrollo">Desarrollo</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-App%20Router-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
</p>

---

## Sobre el proyecto

**Omega Complex** es una aplicación web orientada a digitalizar la experiencia de un complejo deportivo y recreativo.

La plataforma conecta en un mismo ecosistema:

* Catálogo de servicios e instalaciones.
* Consulta de disponibilidad.
* Reservas por fecha y horario.
* Pagos en línea.
* Generación y validación de códigos QR.
* Control de acceso.
* Gestión administrativa.
* Gestión de usuarios, servicios, horarios y reservas.

El objetivo principal es construir una experiencia donde el usuario pueda pasar de consultar un servicio a completar su reserva con la menor fricción posible.

---

## Experiencia del usuario

```mermaid
flowchart LR
    A[Inicio] --> B[Servicios]
    B --> C[Detalle]
    C --> D[Disponibilidad]
    D --> E[Reserva]
    E --> F[Pago]
    F --> G[Confirmación]
    G --> H[QR]
    H --> I[Acceso]

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;

    class A,B,C,D,E primary;
    class F,G,H,I accent;
```

### Flujo de reserva

La experiencia de reserva sigue un flujo controlado:

```text
Servicio
   │
   ▼
Fecha y horario
   │
   ▼
Información de reserva
   │
   ▼
Bloqueo temporal — 10 minutos
   │
   ▼
Pago
   │
   ├──────── Pago rechazado ────────► Liberar disponibilidad
   │
   ▼
Pago confirmado
   │
   ▼
Reserva confirmada
   │
   ▼
Código QR
```

La disponibilidad y el estado definitivo de una reserva son responsabilidad del backend.

---

# Características

## Cliente

| Funcionalidad              |     Estado    |
| -------------------------- | :-----------: |
| Registro                   |   Disponible  |
| Inicio de sesión           |   Disponible  |
| Recuperación de contraseña | En desarrollo |
| Verificación de correo     | En desarrollo |
| Consulta de servicios      |   Disponible  |
| Consulta de disponibilidad |   Disponible  |
| Reservas                   | En desarrollo |
| Pagos                      | En desarrollo |
| Código QR                  | En desarrollo |
| Mis reservas               | En desarrollo |
| Historial de reservas      | En desarrollo |
| Perfil                     |   Disponible  |

## Empleado

| Funcionalidad         |     Estado    |
| --------------------- | :-----------: |
| Autenticación por rol |   Disponible  |
| Escaneo de QR         | En desarrollo |
| Validación de reserva | En desarrollo |
| Validación de horario | En desarrollo |
| Registro de acceso    | En desarrollo |

## Administrador

| Funcionalidad            |     Estado    |
| ------------------------ | :-----------: |
| Dashboard                | En desarrollo |
| Gestión de servicios     | En desarrollo |
| Gestión de instalaciones | En desarrollo |
| Gestión de horarios      | En desarrollo |
| Gestión de reservas      | En desarrollo |
| Gestión de empleados     | En desarrollo |
| Información operativa    | En desarrollo |

---

# Arquitectura

Omega Complex utiliza una arquitectura organizada por dominios mediante **vertical slices**.

```mermaid
flowchart TB

    UI["Next.js / React"]

    UI --> Components["Components"]
    UI --> Routes["App Router"]

    Routes --> API["Route Handlers"]

    API --> Features["Features"]

    Features --> Auth["Auth"]
    Features --> Catalog["Catalog"]
    Features --> Availability["Availability"]
    Features --> Reservations["Reservations"]
    Features --> Payments["Payments"]
    Features --> Access["Access"]
    Features --> Schedules["Schedules"]
    Features --> Admin["Admin"]

    Auth --> Services["Services"]
    Catalog --> Services
    Availability --> Services
    Reservations --> Services
    Payments --> Services
    Access --> Services
    Schedules --> Services
    Admin --> Services

    Services --> Repositories["Repositories"]
    Repositories --> Prisma["Prisma"]
    Prisma --> Database[("PostgreSQL")]

    classDef main fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;
    classDef neutral fill:#F5F5F5,color:#1F1F1F,stroke:#E5E7EB;

    class UI,Routes,API main;
    class Features,Services,Repositories accent;
    class Prisma,Database neutral;
```

### Principio de separación

```text
Presentation
     │
     ▼
Route Handler
     │
     ▼
Feature Service
     │
     ▼
Repository
     │
     ▼
Prisma
     │
     ▼
PostgreSQL
```

Cada capa tiene una responsabilidad específica.

Las páginas y componentes no deben contener lógica de negocio compleja ni acceder directamente a Prisma.

---

# Estructura

```text
src/
│
├── app/
│   ├── (auth)/
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── register/
│   │   ├── reset-password/
│   │   └── verify-email/
│   │
│   ├── (customer)/
│   │   └── reservas/
│   │
│   ├── (employee)/
│   │   └── validar/
│   │
│   ├── (piscinas)/
│   │   ├── informacion/
│   │   ├── mis-reservas/
│   │   ├── perfil/
│   │   ├── piscinas/
│   │   ├── servicios/
│   │   └── tour/
│   │
│   ├── (public)/
│   │
│   └── api/
│       ├── access/
│       ├── auth/
│       ├── availability/
│       ├── categories/
│       ├── facilities/
│       ├── payments/
│       ├── pools/
│       └── reservations/
│
├── components/
│   ├── auth/
│   ├── piscinas/
│   └── ui/
│
├── features/
│   ├── access/
│   ├── admin/
│   ├── auth/
│   ├── availability/
│   ├── catalog/
│   ├── payments/
│   ├── reservations/
│   └── schedules/
│
├── lib/
│   ├── api/
│   └── piscinas/
│
├── shared/
│   ├── auth/
│   ├── http/
│   ├── lib/
│   └── ui/
│
├── types/
│   ├── auth.ts
│   └── piscinas/
│
└── middleware.ts
```

---

# Stack tecnológico

| Categoría      | Tecnología             |
| -------------- | ---------------------- |
| Framework      | Next.js App Router     |
| Frontend       | React 19.2             |
| Lenguaje       | TypeScript 5 — strict  |
| Styling        | Tailwind CSS v4        |
| UI             | shadcn/ui              |
| Iconografía    | Lucide React           |
| Animaciones    | Motion                 |
| Formularios    | React Hook Form        |
| Validación     | Zod                    |
| Cliente HTTP   | Axios                  |
| Estado global  | Zustand                |
| Fechas         | date-fns               |
| Calendario     | React Day Picker       |
| Notificaciones | Sonner                 |
| QR             | qrcode.react           |
| Gráficas       | Recharts               |
| Backend        | Next.js Route Handlers |
| ORM            | Prisma 6.19            |
| Database       | PostgreSQL / Supabase  |
| Auth           | jose + bcryptjs        |
| Payments       | Stripe                 |
| Unit testing   | Vitest                 |
| E2E            | Playwright             |

---

# Comunicación HTTP

El proyecto utiliza **Axios** como cliente HTTP.

No se utiliza TanStack Query inicialmente.

La comunicación sigue una estructura sencilla:

```mermaid
flowchart LR
    Component["React Component"]
    Axios["Axios"]
    API["/api/*"]
    Service["Feature Service"]
    Repository["Repository"]
    DB[("PostgreSQL")]

    Component --> Axios
    Axios --> API
    API --> Service
    Service --> Repository
    Repository --> DB

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;

    class Component,Axios,API primary;
    class Service,Repository accent;
```

Esto mantiene la comunicación con el backend simple y coherente con la arquitectura actual.

Si posteriormente aparecen necesidades importantes de caché, revalidación, polling o sincronización avanzada de server state, se podrá evaluar la incorporación de una herramienta especializada.

---

# Autenticación

Omega Complex implementa autenticación propia.

### Tecnologías

* `bcryptjs` para contraseñas.
* `jose` para JWT.
* Cookies `HttpOnly`.
* `SameSite=Lax`.
* JWT con duración de 7 días.
* Middleware para protección de rutas.
* Autorización basada en roles.

### Roles

```mermaid
flowchart LR
    User["user"]
    Employee["employee"]
    Admin["admin"]

    User --> CustomerArea["Área cliente"]
    Employee --> EmployeeArea["Validación de acceso"]
    Admin --> AdminArea["Administración"]

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;

    class User,Employee,Admin primary;
    class CustomerArea,EmployeeArea,AdminArea accent;
```

### Rutas principales

| Rol           | Ruta                  |
| ------------- | --------------------- |
| Usuario       | `/piscinas/inicio`    |
| Empleado      | `/validar`            |
| Administrador | `/piscinas/dashboard` |

---

# Reservas

Las reservas dependen de múltiples variables:

```text
Servicio
   +
Fecha
   +
Horario
   +
Capacidad
   +
Reservas existentes
   +
Bloqueos temporales
   +
Estado de la reserva
   ↓
Disponibilidad
```

### Reglas

| Regla                | Valor         |
| -------------------- | ------------- |
| Anticipación máxima  | 3 meses       |
| Horario              | 08:00 – 17:00 |
| Mantenimiento        | Lunes         |
| Duración del bloqueo | 10 minutos    |
| Cobro                | Por hora      |

Si un lunes es festivo, el mantenimiento se desplaza al martes.

---

# Pagos

Stripe será utilizado como proveedor de pagos.

El estado de una reserva no se confirma únicamente por el retorno del navegador después del checkout.

```mermaid
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

El webhook constituye la fuente de verdad para la confirmación del pago.

---

# Control de acceso

El empleado puede validar una entrada mediante QR.

```mermaid
flowchart TD
    Scan["Escanear QR"]
    ValidQR{"QR válido?"}
    Reservation{"Reserva confirmada?"}
    Time{"Fecha y horario válidos?"}
    Used{"QR ya utilizado?"}
    Allow["Permitir acceso"]
    Reject["Rechazar acceso"]

    Scan --> ValidQR

    ValidQR -->|No| Reject
    ValidQR -->|Sí| Reservation

    Reservation -->|No| Reject
    Reservation -->|Sí| Time

    Time -->|No| Reject
    Time -->|Sí| Used

    Used -->|Sí| Reject
    Used -->|No| Allow

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;

    class Scan,Allow primary;
    class Reject accent;
```

La validación considera:

* Existencia del QR.
* Reserva asociada.
* Estado confirmado.
* Fecha.
* Hora.
* Uso previo del QR.

---

# Diseño

La identidad visual utiliza una combinación de:

```text
Primary
#7A1F3D

Background
#F5F5F5

Text
#1F1F1F

Secondary
#6B7280

Border
#E5E7EB

Accent
#C8A96B
```

La interfaz busca una estética deportiva, moderna, elegante y profesional.

El color dorado funciona únicamente como elemento de acento.

---

# Instalación

## Requisitos

* Node.js
* npm
* PostgreSQL o Supabase

## Clonar

```bash
git clone <REPOSITORY_URL>
cd omega-complex
```

## Instalar dependencias

```bash
npm install
```

## Variables de entorno

```bash
cp .env.example .env
```

Configurar:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
```

Las variables adicionales de Stripe y administración deben configurarse según el entorno.

## Migraciones

```bash
npx prisma migrate dev
```

## Seed

```bash
npx prisma db seed
```

## Ejecutar

```bash
npm run dev
```

Aplicación:

```text
http://localhost:3000
```

---

# API

La API forma parte del mismo proyecto Next.js.

```text
src/app/api/
```

Principales endpoints:

```text
/api/auth/*
/api/access/validate
/api/availability
/api/categories
/api/facilities
/api/pools
/api/reservations
/api/payments/webhook
```

No se requiere un backend externo ni `NEXT_PUBLIC_API_URL`.

---

# Validación

Antes de realizar un commit importante:

```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

### Tests

```text
Vitest
  │
  ├── Services
  ├── Schemas
  └── Business logic

Playwright
  │
  ├── Authentication
  ├── Reservations
  ├── Payments
  └── Access
```

---

# Variables de entorno

| Variable                | Descripción                               |
| ----------------------- | ----------------------------------------- |
| `DATABASE_URL`          | Conexión PostgreSQL                       |
| `JWT_SECRET`            | Secreto utilizado para firmar JWT         |
| `STRIPE_SECRET_KEY`     | Clave privada de Stripe                   |
| `STRIPE_WEBHOOK_SECRET` | Firma del webhook                         |
| `ADMIN_*`               | Variables relacionadas con administración |

Los valores reales nunca deben almacenarse en el repositorio.

---

# Docker

La aplicación utiliza una estrategia multistage:

```mermaid
flowchart LR
    Dependencies["Dependencies"] --> Builder["Builder"]
    Builder --> Runner["Production Runner"]

    classDef primary fill:#7A1F3D,color:#fff,stroke:#7A1F3D;
    classDef accent fill:#C8A96B,color:#1F1F1F,stroke:#C8A96B;

    class Dependencies,Builder primary;
    class Runner accent;
```

La imagen de producción utiliza un usuario no privilegiado y expone el puerto `3000`.

---

# Estado del proyecto

```text
Core
████████████████████████████████████████ 100%

Authentication
██████████████████████████████████░░░░░░  85%

Catalog
████████████████████████████████████░░░░  90%

Reservations
████████████████████████░░░░░░░░░░░░░░░░  60%

Payments
██████████████████░░░░░░░░░░░░░░░░░░░░░░  45%

Access
████████████████████░░░░░░░░░░░░░░░░░░░░  55%

Admin
████████████████░░░░░░░░░░░░░░░░░░░░░░░░  40%
```

> Los porcentajes anteriores son una representación visual del estado actual del desarrollo y deben actualizarse conforme avance la implementación.

---

# Roadmap

```mermaid
timeline
    title Omega Complex

    section Foundation
        Arquitectura : Next.js
                       Prisma
                       PostgreSQL
        Authentication : JWT
                         Roles
                         Middleware

    section Core
        Catalog : Servicios
                  Instalaciones
        Availability : Horarios
                       Capacidad

    section Reservations
        Reservation flow : Disponibilidad
                           Bloqueo temporal
                           Confirmación

    section Payments
        Stripe : Checkout
                 Webhooks

    section Access
        QR : Generación
             Validación
             Registro

    section Administration
        Dashboard : Gestión
                    Reportes
                    Operación
```

---

# Alcance del MVP

### Incluido

* Autenticación.
* Roles.
* Catálogo.
* Servicios.
* Instalaciones.
* Disponibilidad.
* Reservas.
* Pagos.
* QR.
* Control de acceso.
* Gestión administrativa.

### Fuera del MVP

* Membresías.
* Suscripciones.
* Puntos.
* Marketplace.
* Reconocimiento facial.
* Hardware de acceso.
* Aplicación móvil nativa.
* Modo offline.
* Múltiples sedes.
* Facturación electrónica.
* WhatsApp.

---

# Convenciones

## Código

El proyecto utiliza TypeScript estricto.

Se debe evitar:

```typescript
any
```

Las nuevas funcionalidades deben respetar la arquitectura existente.

## Nuevas features

Cuando una funcionalidad pertenece a un dominio existente, debe incorporarse dentro de su feature correspondiente.

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

No crear capas paralelas si la funcionalidad ya tiene un lugar dentro de la arquitectura.

## Componentes

Antes de crear un componente nuevo:

1. Revisar componentes existentes.
2. Determinar si puede reutilizarse.
3. Extenderlo si corresponde.
4. Crear uno nuevo únicamente cuando tenga una responsabilidad clara.

---

# Desarrollo

El flujo recomendado para una nueva funcionalidad es:

```text
Requerimiento
      │
      ▼
Analizar dominio
      │
      ▼
Definir tipos
      │
      ▼
Definir validación
      │
      ▼
Implementar Service
      │
      ▼
Implementar Repository
      │
      ▼
Crear / actualizar API
      │
      ▼
Conectar UI con Axios
      │
      ▼
Estados de loading / error / success
      │
      ▼
Tests
      │
      ▼
Lint + Build
```

---

# Seguridad

Actualmente se utilizan:

* Hash de contraseñas mediante `bcryptjs`.
* JWT mediante `jose`.
* Cookies `HttpOnly`.
* `SameSite=Lax`.
* Validación mediante Zod.
* Middleware de autorización.
* Control de acceso basado en roles.
* Variables sensibles mediante `.env`.

Antes de producción se recomienda completar:

* Rate limiting.
* Hardening de autenticación.
* Proveedor de correo transaccional.
* Recuperación de contraseña.
* Verificación de correo.
* Configuración definitiva de Stripe.
* Pruebas E2E de flujos críticos.
* Observabilidad y logging.

---

# Licencia

Este proyecto es de uso privado y forma parte del desarrollo de **Omega Complex**.

---

<p align="center">
  <strong>Omega Complex</strong>
  <br />
  Plataforma digital para una experiencia deportiva más simple, conectada y eficiente.
</p>

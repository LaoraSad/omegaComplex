# Diagrama entidad–relación (MVP)

Fuente de verdad: `prisma/schema.prisma` (PostgreSQL). Generado el 2026-10-09
sobre la rama `feat/aseguramiento-mvp`.

```mermaid
erDiagram
    Role ||--o{ User : tiene
    User ||--o| Customer : "es cliente"
    User ||--o| Employee : "es empleado"
    User ||--o{ OAuthAccount : vincula
    User ||--o{ EmailVerification : verifica
    User ||--o{ PasswordReset : recupera
    User ||--o{ Reservation : "crea presencial"

    Category ||--o{ Service : agrupa
    Service ||--o{ ServiceSchedule : horario
    Service ||--o{ ServiceClosure : bloqueos
    Service ||--o{ ServiceSlot : franjas
    Service ||--o{ Reservation : recibe
    Service ||--o{ ReservationBlock : tramos
    Employee ||--o{ EmployeeAssignment : atiende
    Service ||--o{ EmployeeAssignment : cubierto_por

    Customer ||--o{ Reservation : reserva
    Reservation ||--o{ ReservationSlot : ocupa
    ServiceSlot ||--o{ ReservationSlot : apartado_en
    Reservation ||--o{ ReservationBlock : zonas
    Reservation ||--o{ ReservationGuest : personas
    Reservation ||--o{ ReservationHold : bloqueo_10min
    Reservation ||--o{ Payment : cobros
    Payment ||--o{ StripeEvent : eventos
    Reservation ||--o{ QrToken : accesos
    ReservationBlock ||--o{ QrToken : por_zona
    ReservationGuest ||--o{ QrToken : por_persona
    QrToken ||--o{ Access : ingresos
    Employee ||--o{ Access : valida

    Role {
        uuid id PK
        string name
    }
    User {
        uuid id PK
        string email
        string passwordHash
        boolean emailVerified
        boolean isActive
    }
    Customer {
        uuid id PK
        uuid userId FK
        string document
    }
    Employee {
        uuid id PK
        uuid userId FK
        string document
        boolean isActive
    }
    Category {
        uuid id PK
        string name
        string slug
        boolean isActive
    }
    Service {
        uuid id PK
        string name
        string slug
        int price
        int capacity
    }
    ServiceSlot {
        uuid id PK
        timestamptz startsAt
        int capacity
        int bookedCount
        int heldCount
    }
    Reservation {
        uuid id PK
        string status
        string channel
        int quantity
        int totalCop
        timestamptz startsAt
        timestamptz endsAt
    }
    ReservationBlock {
        uuid id PK
        timestamptz startsAt
        timestamptz endsAt
    }
    ReservationGuest {
        uuid id PK
        string fullName
        string document
        boolean isTitular
    }
    ReservationHold {
        uuid id PK
        string status
        timestamptz expiresAt
    }
    Payment {
        uuid id PK
        string status
        int amountCop
        string stripeSessionId
    }
    StripeEvent {
        string eventId PK
        string type
        json payload
    }
    QrToken {
        uuid id PK
        string tokenHash
        int seqNo
        string status
    }
    Access {
        uuid id PK
        string result
        timestamptz accessedAt
    }
```

## Reglas que el diagrama debe leerse con

- Un `ServiceSlot` nunca se sobrevende: `bookedCount`/`heldCount` solo se
  mueven con `UPDATE` condicionales evaluados por PostgreSQL.
- Un `ReservationHold` activo retiene cupos 10 minutos; al confirmar se
  consume (`consumed`), al fallar/expirar se libera (`released`).
- Un `QrToken` es único por `(reservationId, blockId, seqNo)`: un QR por
  persona **y** por zona, de un solo uso (`active` → `used` atómico).
- Solo se guarda el SHA-256 del token; el crudo viaja una vez por correo.
- `StripeEvent.eventId` es la clave de idempotencia del webhook.
```


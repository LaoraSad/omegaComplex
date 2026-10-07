# Catálogo con datos reales

## Objetivo

La tienda y el panel administrativo deben usar PostgreSQL como fuente de verdad para categorías y servicios. Este cambio sustituye los mocks del catálogo por consultas Prisma y agrega gestión administrativa de categorías.

## Modelo y datos

`Category` incluye nombre, slug único, descripción y estado `isActive`. Las categorías activas iniciales son:

- Piscinas (`piscinas`)
- Canchas (`canchas`)
- Zonas húmedas (`zonas-humedas`)
- Gimnasio (`gimnasio`)

`Service` conserva sus UUID, precios, capacidades y slugs. La migración reclasifica los servicios existentes con estas reglas: piscinas a Piscinas; canchas y polideportivas a Canchas; gimnasio a Gimnasio; turco y sauna a Zonas húmedas. Si encuentra un servicio cuyo nombre no coincida con esas reglas, la migración falla con los nombres que requieren revisión.

“Deportes” y “Eventos” se conservan como categorías archivadas, en lugar de borrar registros que puedan tener relaciones. La migración también guarda la categoría previa de cada reserva en `categoryNameSnapshot` antes de reclasificar sus servicios, para preservar la etiqueta histórica.

El seed quedó alineado con las cuatro categorías y los slugs de servicio que ya existen en la base inspeccionada. No se copiaron precios ni descripciones de los mocks; esos valores deben provenir de registros verificados.

## API

Todas las respuestas usan el sobre común `{ data, error }` del proyecto.

| Método y ruta | Acceso | Comportamiento |
| --- | --- | --- |
| `GET /api/categories` | Público | Lista categorías activas, ordenadas por nombre, con conteo de servicios. |
| `GET /api/categories?includeInactive=true` | Admin | Incluye categorías archivadas. |
| `POST /api/categories` | Admin | Crea una categoría y genera el slug a partir del nombre. Acepta `{ "name": "...", "description": "..." }`. |
| `GET /api/categories/{id}` | Público | Devuelve una categoría activa. El parámetro `includeInactive=true` requiere admin. |
| `PATCH /api/categories/{id}` | Admin | Actualiza `name`, `description` o `isActive`. Cambiar el nombre también recalcula el slug. |
| `DELETE /api/categories/{id}` | Admin | Archiva la categoría; no borra filas ni servicios relacionados. |
| `GET /api/services` | Público | Lista servicios de categorías activas con categoría y horarios registrados. |
| `GET /api/services?category=canchas` | Público | Filtra por slug de categoría. |
| `GET /api/services/{id}` | Público | Devuelve un servicio de categoría activa por UUID. |

Las escrituras requieren `requireRole("admin")`. La validación rechaza nombres o slugs inválidos, cuerpos vacíos e identificadores que no sean UUID. Los conflictos por nombre o slug duplicado responden como conflicto HTTP.

## Consumo en la aplicación

- `/admin/categorias` gestiona categorías a través de los endpoints HTTP. Permite crear, editar, archivar y reactivar; muestra el número de servicios asociados.
- La portada consulta servicios desde Prisma.
- El catálogo público consulta `GET /api/categories` y `GET /api/services`; filtra por slug de categoría y busca sobre nombres/descripciones reales.
- La ficha `/servicios/{id}` consulta `GET /api/services/{id}` y muestra capacidad, precio y horarios almacenados. No presenta duración, reglas o precio por hora si no existen en el modelo.
- Las imágenes son archivos locales existentes vinculados por una regla de presentación; no se usan como fuente de nombres, categorías, precios ni capacidades.
- Se retiraron los adaptadores y fixtures mock de categorías y servicios que alimentaban estas vistas.

## Estado de reservas y piscinas

Este cambio no implementa el flujo de reserva. La disponibilidad, creación de reservas, pagos y emisión de QR siguen sin backend completo. Por eso la ficha informa que las reservas online no están disponibles y no simula cobros ni confirmaciones.

Los datos mock de “Mis reservas” y el catálogo de piscinas también siguen en el proyecto y requieren una fase propia con modelos y endpoints verificados. Este documento no declara que toda la aplicación esté libre de datos estáticos.

## Migración y despliegue

Las migraciones relevantes están en `prisma/migrations/20261007150000_add_slug_to_service/migration.sql` y `prisma/migrations/20261007160000_catalog_categories/migration.sql`. La primera se recuperó desde la rama remota que la contenía y se verificó contra el checksum registrado en Supabase. La inspección del catálogo encontró 15 servicios clasificables y ninguna instalación asociada a “Eventos”.

**Estado actual:** la migración `20261007160000_catalog_categories` se aplicó correctamente a Supabase. `prisma migrate status` confirma que la base está al día. No se ejecutó el seed ni se cambiaron precios.

## Validación realizada

- `npm test`: 9 pruebas pasaron; 8 suites están pendientes/omitidas.
- `npx tsc --noEmit`: pasó.
- `npx prisma validate`: pasó.
- ESLint focalizado en los archivos de este cambio: sin errores; permanecen dos advertencias anteriores en `prisma/seed.ts` (`userRole` y `employeeRole` sin uso).
- `npm run lint` global sigue reportando dos errores ajenos al cambio en `Navbar.tsx` y `PanoramaModal.tsx`.
- Se aplicó la migración del catálogo en Supabase; no se ejecutó el seed.
- La portada, `GET /api/categories` y `GET /api/services` respondieron HTTP 200 después de la migración.

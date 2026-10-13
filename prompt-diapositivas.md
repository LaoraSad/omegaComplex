# Prompt para generar la presentación de Omega Complex

> Copia y pega este prompt en la herramienta de IA que uses para generar diapositivas (Gamma, Canva, PowerPoint con Copilot, etc.).

---

## Prompt principal

Genera una presentación en español para defender el proyecto **Omega Complex** ante un jurado universitario. El proyecto es una plataforma full-stack de reservas y control de acceso para un complejo deportivo, construida con Next.js 16, TypeScript, Prisma y PostgreSQL.

**Estilo visual**: oscuro y elegante. Fondo `#0e0b0d` (casi negro con tinte vino). Acentos en vinotinto `#7A1F3D` y dorado `#C8A96B`. Texto blanco `#F5F5F5`. Tipografía sans-serif (Inter o similar). Nada de graduados chillones ni emojis. Cada diapositiva debe verse como parte de un producto real, no de una plantilla escolar.

**Estructura exacta** (respeta el orden y los títulos; puedes dividir alguna en dos si queda muy cargada):

1. **Portada** — Título: "Omega Complex". Subtítulo: "Plataforma de reservas y control de acceso". Más pequeño: "Proyecto de ingeniería de software — [Tu nombre y curso]". Con el eslogan: *"De la reserva a la pueta, en un solo flujo."*

2. **El problema** — "Un complejo deportivo pierde tiempo y dinero cuando: las reservas se toman por teléfono, los cupos se venden dos veces, y en la puerta nadie sabe quién entró." Tres viñetas con iconos.

3. **La solución en una frase** — "Omega Complex digitaliza el ciclo completo: catálogo → disponibilidad → carrito multi-zona → pago → código QR → validación en puerta." Un diagrama simple de 6 pasos en flecha.

4. **Demo del flujo (la estrella)** — Capturas o descripción de cada paso: (a) catálogo con servicios reales, (b) selector de franjas con disponibilidad en vivo, (c) carrito con varias zonas y acompañantes, (d) checkout de Stripe, (e) correo con QR y PDF, (f) pantalla del empleado escaneando.

5. **Arquitectura técnica** — Diagrama de capas: Next.js (UI + API) → Features por dominio (auth, reservations, payments, access) → Repositories → Prisma → PostgreSQL. Con la frase clave: *"El inventario se resuelve en PostgreSQL, nunca en el navegador."*

6. **El carrito multi-zona** — Explica la regla de negocio: un cliente puede ir solo a la cancha y con tres amigos a la piscina, en un solo pago. Cada persona lleva su QR por zona.

7. **Pagos con Stripe** — Diagrama de secuencia: cliente → API → Stripe → webhook → confirma reserva + emite QR + envía correo. Frase clave: *"El webhook es la fuente de verdad: si Stripe no confirma, la reserva no existe."*

8. **El código QR por dentro** — Token aleatorio de 32 caracteres → SHA-256 guardado (nunca el token crudo) → un QR por persona y por zona → validación en 8 reglas → consumo atómico. Menciona el código corto de respaldo si la cámara falla.

9. **El PDF de acceso** — Muestra cómo se arma: logo, fecha, documento, un QR por persona, paginación calculada. *"Es lo que el empleado imprime y lleva a la puerta."*

10. **Visor 360** — three.js con import dinámico. *"Solo pesa cuando el cliente abre el detalle de un servicio."*

11. **Autenticación** — JWT con jose, cookies HttpOnly, verificación de correo obligatoria, OAuth con Google, rate limiting en login.

12. **Decisiones que tomamos y por qué** — Tabla de 4-5 filas: "¿Por qué Next.js? ¿Por qué Prisma? ¿Por qué webhook y no retorno de navegador? ¿Por qué PDF y no solo imagen? ¿Por qué n8n opcional?"

13. **Pruebas y calidad** — 120 tests unitarios, 0 errores de lint, flujos verificados end-to-end con Playwright. *"Las reglas de negocio se prueban sin levantar la aplicación."*

14. **Despliegue** — Docker multistage, usuario no root, migraciones y seed antes de levantar. *"Una imagen, un comando, todo corriendo."*

15. **Aprendizajes y retos** — 3 cosas: (1) el cupo es del servidor, no del cliente; (2) un pago no es real hasta que el webhook lo dice; (3) diseñar para el fallo (cámara rota, correo que no llega, pago huérfano).

16. **Cierre** — "Omega Complex: de la reserva a la puerta, en un solo flujo." Gracias. Preguntas.

**Reglas**: no incluyas código en las diapositivas salvo una o dos líneas muy cortas si son el corazón de la explicación. Prefiere diagramas y frases cortas. Cada diapositiva debe poder explicarse en menos de un minuto. El jurado hará preguntas técnicas: la presentación tiene que dar pie a hablar de transacciones, webhooks y consumo atómico, no a esquivarlos.
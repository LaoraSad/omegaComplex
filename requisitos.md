1. Información general del proyecto
Nombre del proyecto: Omega Complex - Sistema de reservas y control de acceso para complejo deportivo
Tecnología principal: Next.js
Zona horaria: Colombia — America/Bogota
Modalidad: Aplicación web responsive, orientada a dispositivos móviles
Integración de pagos: Stripe — modo de prueba durante el desarrollo
Control de acceso: Código QR desde el teléfono del cliente y cámara del teléfono del empleado.

2. Objetivo del proyecto
Desarrollar una aplicación web que permita administrar digitalmente el ciclo completo de utilización de las instalaciones del complejo deportivo:

Administración de instalaciones y servicios.

Configuración de horarios y disponibilidad.

Registro y autenticación de clientes.

Consulta de disponibilidad en tiempo real.

Creación de reservas.

Bloqueo temporal de horarios durante el proceso de pago.

Procesamiento del pago mediante Stripe.

Confirmación automática de la reserva.

Generación y envío de un código QR.

Validación del QR mediante el teléfono de un empleado.

Control de ingreso y prevención del uso duplicado del QR.

Consulta de reservas, ocupación e ingresos por parte del administrador.

El objetivo es eliminar la gestión manual mediante llamadas, WhatsApp, cuadernos, impresiones y dispositivos físicos de escaneo.

3. Alcance de la primera versión
La primera versión (MVP) incluirá tres tipos de usuario:

Administrador.

Cliente.

Empleado.

Cada rol tendrá permisos y vistas diferentes.

4. Arquitectura funcional
La aplicación estará compuesta, como mínimo, por los siguientes módulos:

Autenticación y usuarios.

Gestión de clientes.

Gestión de empleados.

Gestión de administradores.

Categorías de servicios.

Servicios/instalaciones.

Horarios y disponibilidad.

Reservas.

Control de capacidad.

Bloqueo temporal de reservas.

Pagos.

Confirmación de pagos.

Códigos QR.

Control de acceso.

Historial de accesos.

Dashboard administrativo.

Reportes y métricas.

Notificaciones por correo electrónico.

5. Roles y permisos
5.1 Administrador
El administrador podrá:

Gestión de categorías
Crear, editar, activar y desactivar categorías.

Ejemplos:

Piscinas.

Canchas.

Gimnasio.

Zona húmeda.

Gestión de servicios
Dentro de cada categoría podrá crear servicios individuales.

Ejemplos:

Categoría: Canchas

Cancha 1.

Cancha 2.

Cancha 3.

Categoría: Piscinas

Piscina Olímpica.

Piscina Infantil.

Cada servicio tendrá su propia configuración y disponibilidad.

La disponibilidad de un servicio no afectará automáticamente a otro servicio de la misma categoría.

Configuración del servicio
Dependiendo del tipo de servicio, podrá definirse:

Nombre.

Descripción.

Imagen.

Categoría.

Estado activo/inactivo.

Capacidad máxima.

Duración de la reserva.

Precio.

Horarios disponibles.

Días disponibles.

Reglas específicas de disponibilidad.

6. Gestión de horarios
El administrador podrá configurar las franjas horarias disponibles.

Ejemplo:

Cancha 1

08:00 – 09:00

09:00 – 10:00

10:00 – 11:00

11:00 – 12:00

Cada franja tendrá su propia disponibilidad.

El sistema deberá impedir que una misma franja pueda ser reservada simultáneamente por dos operaciones concurrentes.

La disponibilidad deberá determinarse en función de:

Servicio.

Fecha.

Hora.

Capacidad.

Reservas existentes.

Reservas temporalmente bloqueadas.

Estado de la reserva.

7. Servicios con capacidad
Algunos servicios no representan una única reserva exclusiva, sino un cupo limitado.

Ejemplo:

Gimnasio

Capacidad máxima: 80 personas. no se puede el ingreso de menores de 12 años, no se puede entrar mojado, solo calzado deportivo

piscinas

solo licras, para entrar a la piscina solo se puede entrar con gorros

Si existen 20 reservas confirmadas para una franja, la franja deberá aparecer como completa.

Si existen 19 reservas, solamente quedará un cupo disponible.

La validación de capacidad deberá realizarse a nivel de base de datos y transacción, evitando que dos usuarios puedan consumir simultáneamente el último cupo disponible.

8. Registro de clientes
El cliente podrá registrarse mediante:

Correo electrónico y contraseña.

Cuenta de Google mediante OAuth.

Durante el registro mediante correo electrónico deberá realizarse una confirmación del correo.

El sistema deberá contemplar:

Registro.

Inicio de sesión.

Cierre de sesión.

Verificación de correo.

Recuperación de contraseña.

Cambio de contraseña.

9. Reserva
El cliente podrá:

Iniciar sesión.

Consultar las categorías.

Seleccionar una categoría.

Seleccionar un servicio.

Seleccionar una fecha.

Consultar horarios disponibles.

Seleccionar una franja.

Iniciar el proceso de reserva.

Realizar el pago.

Recibir confirmación.

Recibir su código QR.

10. Bloqueo temporal de horarios
Este es uno de los componentes críticos del sistema.

Cuando un cliente seleccione una franja y comience el proceso de pago, el sistema deberá crear un bloqueo temporal.

Ejemplo:

Un cliente selecciona:

Cancha 1 — 15:00 a 16:00

El sistema reserva temporalmente esa disponibilidad mientras el cliente realiza el pago.

Durante ese periodo otro cliente no podrá apropiarse de la misma disponibilidad.

Si el pago se completa:

Bloqueo → Reserva confirmada

Si el pago falla o el usuario abandona el proceso:

Bloqueo → Liberación

El tiempo exacto del bloqueo deberá ser definido y aprobado por el cliente.

11. Regla de reservas simultáneas del cliente
Un cliente no podrá tener dos reservas activas que se solapen en el mismo horario.

Ejemplo:

El cliente tiene:

10:00 – 11:00

en Cancha 1.

No podrá reservar simultáneamente:

10:30 – 11:30

en Piscina.

Esto deberá aplicarse tanto a reservas confirmadas como, según la regla definitiva que apruebe el cliente, a reservas temporalmente bloqueadas.

12. Restricción de fechas y horas
El sistema no permitirá crear reservas para:

Fechas anteriores.

Horarios anteriores.

Franjas ya iniciadas, según la regla de anticipación que se defina.

El sistema utilizará la zona horaria:

America/Bogota

Todas las fechas almacenadas y procesadas deberán manejarse de forma consistente para evitar problemas entre servidor, base de datos y navegador.

13. Pagos
El sistema utilizará Stripe como plataforma de pagos.

Durante el desarrollo se utilizará el entorno de pruebas de Stripe.

El flujo será:

Seleccionar horario → Bloqueo temporal → Checkout → Pago → Confirmación → Reserva confirmada → Generación de QR

El sistema no deberá considerar simplemente que el usuario regresó desde Stripe como prueba suficiente del pago.

La confirmación deberá basarse en el mecanismo oficial de confirmación de Stripe, mediante webhook/evento de pago.

Estados posibles
Una reserva podrá tener estados como:

Pendiente de pago.

Pago en proceso.

Confirmada.

Pago rechazado.

Expirada.

Utilizada.

Los estados definitivos serán establecidos durante el diseño técnico.

14. Código QR
Una vez confirmado el pago, el sistema generará un código QR asociado a la reserva.

El QR será enviado al correo electrónico del cliente.

El QR deberá representar un identificador/token seguro de la reserva y no deberá exponer información sensible innecesaria.

El cliente podrá mostrar el QR directamente desde su teléfono.

No será necesario:

Imprimir el QR.

Utilizar tarjetas físicas.

Utilizar lectores especializados.

15. Control de acceso
El empleado tendrá una interfaz especialmente diseñada para utilizarse desde un teléfono móvil.

El empleado podrá:

Iniciar sesión.

Abrir el lector QR.

Permitir acceso a la cámara.

Escanear el código del cliente.

Consultar la información de la reserva.

Verificar el servicio.

Verificar fecha y horario.

Confirmar explícitamente el ingreso.

El sistema deberá mostrar información suficiente para que el empleado pueda verificar que la persona está intentando ingresar al servicio correcto.

16. Validaciones del QR
Al escanear un QR se deberán validar, como mínimo:

Que el QR sea válido.

Que exista la reserva.

Que la reserva esté confirmada.

Que corresponda a la fecha actual.

Que la hora actual esté dentro de la franja permitida.

Que el QR no haya sido utilizado anteriormente.

Que la reserva no haya expirado.

Que el acceso no haya sido registrado previamente.

Si alguna validación falla, el sistema deberá denegar el acceso y mostrar una razón.

17. Regla de horario de ingreso
El cliente podrá ingresar en cualquier momento dentro de su franja reservada.

Ejemplo:

Reserva:

14:00 – 15:00

Podrá ingresar:

14:00

14:15

14:30

14:55

No podrá ingresar después de:

15:00

El sistema deberá registrar la hora exacta del acceso.

La regla sobre si el cliente puede ingresar unos minutos antes del inicio deberá definirse explícitamente antes del desarrollo.

18. Uso único del QR
Cada reserva tendrá un QR de un solo uso.

Una vez que el empleado confirme:

Dar acceso

el sistema registrará el ingreso.

Si posteriormente se intenta utilizar el mismo QR nuevamente, el sistema deberá mostrar:

QR ya utilizado

y denegar el acceso.

El registro de acceso deberá almacenarse en la base de datos.

19. Verificación previa del empleado
El sistema no otorgará acceso automáticamente después del escaneo.

El proceso será:

Escanear QR → Mostrar información → Empleado verifica → Dar acceso

Esto permite que el empleado pueda detectar situaciones como:

Cliente reservó Cancha 1, pero está intentando ingresar a Cancha 2.

La aplicación deberá mostrar claramente el servicio asociado a la reserva.

20. Dashboard administrativo
El administrador tendrá acceso a métricas y consultas.

Como mínimo:

Reservas
Reservas por rango de fechas.

Reservas por servicio.

Reservas por categoría.

Reservas por estado.

Ocupación
Ocupación por servicio.

Ocupación por fecha.

Porcentaje de utilización.

Ingresos
Ingresos por rango de fechas.

Ingresos por servicio.

Ingresos por categoría.

Accesos
Cantidad de accesos.

Reservas utilizadas.

Reservas no utilizadas.

Historial de accesos.

Los indicadores exactos y las fórmulas de cada métrica deberán aprobarse antes de su implementación.

21. Gestión de empleados
El administrador podrá:

Crear empleados.

Activar/desactivar empleados.

Gestionar sus credenciales.

Consultar sus accesos.

Controlar quién puede utilizar el módulo de control de acceso.

Inicialmente todos los empleados podrán validar QR en cualquier instalación del complejo.

No se contempla en esta versión restringir empleados por zonas.

22. Correos electrónicos
El sistema deberá enviar correos para los eventos que se definan.

Como mínimo:

Confirmación de registro.

Recuperación de contraseña.

Confirmación de reserva.

Código QR.

Posibles notificaciones relacionadas con el pago.

Los correos serán enviados mediante un proveedor externo de correo electrónico.

El proveedor específico deberá definirse antes del desarrollo o ser propuesto por el equipo técnico.

23. Base de datos
La base de datos deberá soportar correctamente:

Concurrencia.

Transacciones.

Restricciones.

Integridad referencial.

Control de capacidad.

Bloqueos temporales.

Estados de reservas.

Uso único de QR.

Las reglas críticas no dependerán únicamente de validaciones realizadas en el frontend.

El backend y la base de datos deberán ser responsables de garantizar la integridad de las reservas.

24. Arquitectura propuesta
La solución será desarrollada utilizando Next.js.

Se propone una arquitectura web con:

Frontend

Next.js.

React.

TypeScript.

Diseño responsive/mobile-first.

Backend

Next.js Server Components / Server Actions / Route Handlers, según corresponda al caso de uso.

APIs internas.

Validaciones del lado del servidor.

Integración con Stripe.

Integración con proveedor de correo.

Autenticación.

Base de datos

 opción propuesta es:

PostgreSQL.

El ORM prisma, proveedor de base de datos y estrategia definitiva de despliegue serán definidos durante la etapa técnica.

25. Modelo de datos preliminar
El modelo podrá contener entidades similares a:

User

Role

Category

Service

ServiceSchedule

Reservation

ReservationHold

Payment

QRToken

Access

Employee

EmailVerification

PasswordReset

El modelo definitivo se establecerá durante el diseño técnico y será entregado mediante un diagrama ER.

26. Concurrencia
La concurrencia es un requisito crítico.

Ejemplo:

Dos clientes intentan reservar simultáneamente:

Cancha 1 — 18:00–19:00

El sistema deberá garantizar que solamente uno pueda obtener la disponibilidad cuando se trate de una reserva exclusiva.

En servicios con capacidad:

Piscina — capacidad 10

Si quedan 2 cupos y 3 usuarios intentan reservar simultáneamente, el sistema deberá garantizar que como máximo se asignen los 2 cupos disponibles.

Estas reglas deberán protegerse mediante mecanismos de base de datos/transacciones y no únicamente mediante lógica JavaScript.

27. Seguridad
La aplicación deberá contemplar, como mínimo:

Contraseñas almacenadas de forma segura.

Autenticación.

Autorización basada en roles.

Protección de rutas.

Validación de datos en servidor.

Protección de endpoints.

Tokens seguros para QR.

Prevención de reutilización del QR.

Manejo seguro de webhooks de Stripe.

Protección contra operaciones duplicadas.

Registro de eventos críticos.

28. Responsabilidad de la información
El cliente será responsable de suministrar:

Logo.

Colores corporativos.

Información de contacto.

Catálogo inicial de servicios.

Precios.

Horarios.

Capacidades.

Políticas de uso.

Textos legales.

Información requerida para los correos.

Dominio, si ya existe.

Información necesaria para configurar el correo transaccional.

29. Responsabilidad del equipo de desarrollo
El equipo de desarrollo será responsable de:

Analizar los requerimientos.

Diseñar la arquitectura.

Diseñar la base de datos.

Crear el diagrama ER.

Desarrollar la aplicación.

Implementar autenticación.

Implementar reservas.

Implementar control de concurrencia.

Integrar Stripe.

Implementar generación y validación de QR.

Implementar control de acceso.

Implementar dashboard.

Realizar pruebas.

Documentar el proyecto.

Preparar el despliegue.

Entregar el código fuente.

30. Entregables
El proyecto deberá entregar:

30.1 Código fuente
Repositorio con el código completo de la aplicación.

30.2 Aplicación desplegada
Aplicación funcional disponible mediante una URL.

30.3 Diagrama ER
Diagrama entidad-relación de la base de datos.

30.4 README.md
El README deberá documentar:

Descripción del proyecto.

Tecnologías utilizadas.

Lenguaje.

Framework.

Arquitectura.

Estructura de carpetas.

Motor de base de datos.

ORM utilizado.

Variables de entorno.

Configuración local.

Instalación.

Ejecución.

Migraciones.

Integración con Stripe.

Configuración de OAuth.

Configuración del correo.

Proceso de despliegue.

30.5 Tablero de tareas(opcional)no
Tablero de trabajo con:

Tareas.

Responsables.

Estado.

Prioridad.

Dependencias.

Criterios de aceptación.

31. Fuera del alcance de la primera versión
Las siguientes funcionalidades no forman parte del MVP, salvo que sean incorporadas posteriormente mediante un cambio de alcance:

Cancelación de reservas.

Reembolsos.

Impresión de tickets.

Lectores físicos de QR.

Tarjetas físicas de acceso.

Aplicación móvil nativa para Android.

Aplicación móvil nativa para iOS.

Sistema de membresías.

Planes de suscripción.

Puntos o beneficios.

Marketplace.

Integración con torniquetes electrónicos.

Integración con hardware de control de acceso.

Reconocimiento facial.

Restricción de empleados por instalación.

Aplicación offline.

Múltiples sedes, salvo que se acuerde expresamente.

Integraciones contables.

Facturación electrónica, salvo que sea incluida expresamente.

Notificaciones por WhatsApp.

Reportes avanzados no especificados.

Estas exclusiones podrán modificarse mediante una nueva definición de alcance.

32. Limitaciones conocidas
Dependencia de Internet
El sistema requiere conexión a Internet para:

Realizar reservas.

Procesar pagos.

Consultar disponibilidad.

Validar QR.

Registrar accesos.

No se contempla funcionamiento offline en esta versión.

Cámara del dispositivo
El escaneo QR depende de que el teléfono del empleado:

Tenga cámara.

Permita acceso a la cámara desde el navegador.

Tenga un navegador compatible.

Tenga conexión a Internet.

Stripe
El procesamiento de pagos dependerá de la disponibilidad y funcionamiento de Stripe.

Durante el desarrollo se utilizará Stripe en modo de pruebas. 

Correo electrónico
La entrega de correos dependerá del proveedor de correo utilizado y de la correcta configuración del dominio.

Navegadores
La aplicación será desarrollada para navegadores modernos y dispositivos móviles actuales. No se garantiza compatibilidad con navegadores obsoletos.

33. Preguntas que deben ser respondidas por el cliente
Antes de comenzar el desarrollo definitivo, el cliente deberá confirmar las siguientes reglas.

A. Reservas
¿Con cuánta anticipación mínima se puede reservar? no hay limite de reserva

¿Con cuánta anticipación máxima se puede reservar? 3meses

¿Cuál es la duración de cada reserva? no hay limite

¿Todos los servicios tendrán la misma duración? si

¿Un servicio puede tener diferentes duraciones? cobro por hora

¿Los horarios serán fijos o podrán cambiar diariamente? 8-5pm

¿Puede existir un horario diferente para fines de semana?8-5pm

¿Habrá días festivos en los que el complejo permanezca cerrado? no hay atención los lunes por mantenimiento, si el lunes es festivo el martes es el dia de mantenimiento

¿El administrador podrá cerrar manualmente una instalación para mantenimiento? si

¿Qué sucede con las reservas existentes cuando un administrador bloquea una instalación? no pasa nada/sin solucion

B. Capacidad
¿Qué servicios funcionan por capacidad? 
- piscinas: 
1niños(100) 
4adulto (
1 olas(100)
zona toboganes(3 piscinas - 1(30tobogan) / 2(20inodoro) / 3(luisita20)),
gym(40)
zona humeda(turco(30), sauna(30)) , 
- canchas:
4 de microfutbol(14) 
futbol(22), 
canchas polideportivo2(12)

¿Qué servicios funcionan como reserva exclusiva? si pagas todas las entradas si

¿La capacidad se define por franja horaria?si

¿Una persona representa siempre un cupo?no

¿Puede una reserva incluir varias personas?si

Si una reserva incluye varias personas, ¿cómo se controla el número de asistentes?el numero de qrs que se envian 

C. Pagos
¿El pago debe ser obligatorio para confirmar una reserva? si

¿Se permitirá reservar sin pagar?no

¿Qué monedas se utilizarán? COP

¿Qué métodos de pago de Stripe desean habilitar? tarjeta de debito o credito

¿Qué ocurre si Stripe confirma el pago pero el navegador del cliente se cierra antes de volver a la aplicación? idenpotencia

¿Se requiere factura o comprobante de pago?no

¿Se requiere facturación electrónica? NO

D. Bloqueo durante el pago
¿Cuánto tiempo debe permanecer bloqueada una franja mientras el cliente paga?10min

Por ejemplo:

10 minutos.

¿Qué debe suceder exactamente cuando expira el bloqueo?le aparece una alerta al cliente y se devuelve

¿El cliente podrá volver a intentar pagar después de que expire?si

E. QR y acceso
¿El QR permite solamente un ingreso por reserva?si

¿Puede salir y volver a entrar durante la misma reserva?no, se van a implementar manillas por color

Si la respuesta anterior es sí, ¿cómo se controlarán las salidas?por color

¿Qué ocurre si el cliente llega 5 minutos antes? esperar

¿Qué ocurre si llega 10 minutos tarde? lo dejo pasar con la hora recortada

¿Existe un periodo de tolerancia?no 

¿Qué ocurre exactamente al finalizar la reserva? una alerta

¿El sistema debe registrar solamente el ingreso o también la salida?solo el ingreso

¿Un empleado puede invalidar manualmente un QR? no

¿Un administrador puede volver a habilitar un QR utilizado por error? no

F. Empleados
¿Todos los empleados podrán escanear cualquier QR? no, tienen un lugar especifico los empleados y si no esta en la zona que dice el qr el empleado los lleva a la zona donde debe ingresar

si el cliente es adulto mayor debe haber un modulo para venta fisica y en vez de qr que lo mande a una impresora

¿Se necesitan diferentes niveles de empleados?no

¿Se necesita un supervisor?no

¿El administrador podrá consultar qué empleado autorizó cada ingreso?si

¿Debe registrarse fecha y hora exacta de cada acceso?si

G. Administrador
¿Habrá un único administrador o varios?uno solo

¿Todos los administradores tendrán los mismos permisos?si

¿Se requiere historial/auditoría de cambios administrativos?no

Por ejemplo:

Administrador X cambió el precio de Cancha 1 de $50.000 a $60.000.

¿Se necesita exportar reportes a Excel/CSV/PDF?si/

¿Qué métricas son indispensables para el negocio?

H. Clientes
¿Qué información debe solicitarse durante el registro?

Por ejemplo:

Nombre.

Apellido.

Documento.

Teléfono.

Fecha de nacimiento.

Correo.

contraseña

¿El documento de identidad será obligatorio?si

¿Se permitirá que una persona tenga más de una cuenta?no

¿El cliente podrá modificar sus datos?solo el telefono y el correo y contraseña

¿El cliente podrá consultar su historial de reservas? si

¿El cliente podrá ver sus reservas futuras?si

I. Correos
¿Qué proveedor de correo desean utilizar?omegacomplex@gmail.com

¿Desde qué dirección deben enviarse los correos?omegacomplex@gmail.com

¿Se requiere una plantilla corporativa?si

¿Qué información debe contener el correo de confirmación? el codigo de verificacion

J. Diseño
¿El cliente tiene logo? no

¿Tiene manual de marca? no

¿Qué colores corporativos deben utilizarse?

¿Tiene referencias de aplicaciones o páginas cuyo diseño le guste?no sabe

¿La primera versión debe estar optimizada principalmente para celular?no, solo lo de la lectura de celular

K. Infraestructura
¿El cliente ya tiene dominio? SI

¿El cliente ya tiene cuenta de hosting/cloud? SI

34. Criterios de aceptación principales
El proyecto podrá considerarse funcional cuando, como mínimo, sea posible realizar el siguiente flujo completo:

Flujo de cliente
Registro → Verificación de correo → Inicio de sesión → Selección de servicio → Selección de horario → Bloqueo → Pago → Confirmación → QR → Correo

Flujo de empleado
Inicio de sesión → Escaneo QR → Consulta de reserva → Validación → Dar acceso → Registro de ingreso

Flujo administrativo
Inicio de sesión → Crear categoría → Crear servicio → Configurar capacidad → Configurar horarios → Consultar reservas → Consultar ocupación → Consultar ingresos

Además, deberán superarse las pruebas de concurrencia, expiración de bloqueos, capacidad, pago y reutilización del QR.

35. Pruebas críticas
Antes de entregar el sistema se deberán probar, como mínimo:

Reserva simultánea
Dos usuarios intentan reservar el mismo horario al mismo tiempo.

Resultado esperado: no se genera doble reserva.

Último cupo
Dos usuarios intentan obtener el último cupo disponible.

Resultado esperado: solamente uno obtiene el cupo.

Pago abandonado
Usuario inicia pago y abandona.

Resultado esperado: después del tiempo configurado, la disponibilidad vuelve a quedar libre.

Pago rechazado
El pago falla.

Resultado esperado: la reserva no queda confirmada.

Pago confirmado
Stripe confirma correctamente el pago.

Resultado esperado: reserva confirmada y QR generado.

QR fuera de horario
Se intenta utilizar el QR después de finalizar la reserva.

Resultado esperado: acceso rechazado.

QR reutilizado
Se utiliza dos veces el mismo QR.

Resultado esperado: primer acceso permitido; segundo acceso rechazado.

Reserva pasada
Usuario intenta reservar una fecha/hora pasada.

Resultado esperado: operación rechazada.

Reservas simultáneas del cliente
Cliente intenta reservar dos servicios con horarios superpuestos.

Resultado esperado: operación rechazada según las reglas aprobadas.

36. Cambios de alcance
Cualquier funcionalidad no contemplada en este documento deberá considerarse como un cambio de alcance.

Los cambios podrán afectar:

Tiempo de desarrollo.

Costo.

Arquitectura.

Diseño.

Pruebas.

Infraestructura.

Antes de implementar una funcionalidad adicional, deberá documentarse y aprobarse el cambio correspondiente.

37. Aprobación del alcance
Antes de iniciar el desarrollo, el cliente deberá revisar y confirmar:

Funcionalidades.

Reglas de reserva.

Reglas de pago.

Reglas de capacidad.

Reglas de acceso.

Información solicitada al cliente.

Diseño general.

Integraciones.

Exclusiones.

Entregables.

La aprobación de este documento representa la aceptación del alcance funcional definido para la primera versión del sistema.

Cliente: ______________________________

Nombre: ______________________________

Fecha: _______________________________

Firma: ________________________________

Responsable del proyecto: ______________________________

Fecha: _______________________________

Firma: ________________________________
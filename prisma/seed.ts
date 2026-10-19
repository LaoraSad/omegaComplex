// -----------------------------------------------------------------------------
// prisma/seed.ts
// Seed de la base de datos: crea los datos iniciales necesarios para que la
// aplicación funcione (roles, usuarios, categorías, servicios, horarios y
// franjas). Se ejecuta con `npx prisma db seed` o desde Docker (servicio
// `migrate` de docker-compose.yml).
// -----------------------------------------------------------------------------

import { PrismaClient, nameRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateServiceSlotsForRange } from "@/features/availability/availability.repository";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // =========================
  // 1. ROLES
  // =========================
  // Crea los tres roles del sistema si no existen: user, admin, employee.
  // Se usa upsert para que el seed sea idempotente (se puede ejecutar varias veces).
  const userRole = await prisma.role.upsert({
    where: { name: nameRole.user },
    update: {},
    create: { name: nameRole.user },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: nameRole.admin },
    update: {},
    create: { name: nameRole.admin },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: nameRole.employee },
    update: {},
    create: { name: nameRole.employee },
  });

  console.log("✅ Roles creados/verificados");

  // =========================
  // 2. USUARIO ADMINISTRADOR
  // =========================
  // Crea el admin por defecto con credenciales de entorno o valores por defecto.
  // emailVerified = true para que no requiera verificación en el seed.
  const adminEmail = process.env.ADMIN_EMAIL || "admin@omegacomplex.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: adminRole.id,
      passwordHash,
      firstName: "Administrador",
      lastName: "Omega Complex",
      isActive: true,
      emailVerified: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: "Administrador",
      lastName: "Omega Complex",
      roleId: adminRole.id,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Administrador creado/verificado: ${adminEmail} / ${adminPassword}`);

  // =========================
  // 2.1 EMPLEADOS
  // =========================
  // Crea 3 empleados con credenciales predeterminadas y sus registros Employee.
  const empleadosData = [
    { email: "empleado1@omegacomplex.com", firstName: "Carlos", lastName: "Pérez", document: "1010101011" },
    { email: "empleado2@omegacomplex.com", firstName: "María", lastName: "Gómez", document: "1010101022" },
    { email: "empleado3@omegacomplex.com", firstName: "Andrés", lastName: "Ruiz", document: "1010101033" },
  ];

  const empPasswordHash = await bcrypt.hash("emp123456", 12);
  for (const emp of empleadosData) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        roleId: employeeRole.id,
        passwordHash: empPasswordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        isActive: true,
        emailVerified: true,
      },
      create: {
        email: emp.email,
        passwordHash: empPasswordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        roleId: employeeRole.id,
        isActive: true,
        emailVerified: true,
      },
    });

    await prisma.employee.upsert({
      where: { userId: user.id },
      update: { document: emp.document, isActive: true },
      create: { userId: user.id, document: emp.document, isActive: true },
    });
  }

  console.log("✅ Empleados creados/verificados (contraseña predeterminada: emp123456)");

  // =========================
  // 3. CATEGORÍAS
  // =========================
  // Crea las categorías base: Piscinas, Canchas, Zonas húmedas, Gimnasio.
  const categories = [
    { name: "Piscinas", slug: "piscinas" },
    { name: "Canchas", slug: "canchas" },
    { name: "Zonas húmedas", slug: "zonas-humedas" },
    { name: "Gimnasio", slug: "gimnasio" },
  ];

  const createdCategories = [];

  for (const category of categories) {
    const createdCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: { slug: category.slug, isActive: true },
      create: { name: category.name, slug: category.slug, isActive: true },
    });

    createdCategories.push(createdCategory);
  }

  // Desactiva categorías obsoletas si existen.
  await prisma.category.updateMany({
    where: { name: { in: ["Deportes", "Eventos"] } },
    data: { isActive: false },
  });

  console.log("✅ Categorías creadas/verificadas");

  // =========================
  // 3. OBTENER CATEGORÍAS
  // =========================
  const piscinas = createdCategories.find((category) => category.name === "Piscinas");
  const canchas = createdCategories.find((category) => category.name === "Canchas");
  const zonasHumedas = createdCategories.find((category) => category.name === "Zonas húmedas");
  const gimnasio = createdCategories.find((category) => category.name === "Gimnasio");

  if (!piscinas || !canchas || !zonasHumedas || !gimnasio) {
    throw new Error("No se pudieron encontrar las categorías.");
  }

  // =========================
  // 4. SERVICIOS
  // =========================
  // Crea los servicios iniciales con precio, capacidad y categoría.
  const services = [
    // Piscinas
    { name: "Piscina infantil", slug: "piscina-infantil", description: "Piscina destinada al uso infantil.", price: 8000, capacity: 100, categoryId: piscinas.id },
    { name: "Piscina de olas", slug: "piscina-de-olas", description: "Piscina de olas.", price: 12000, capacity: 100, categoryId: piscinas.id },
    { name: "Piscina Tobogán", slug: "piscina-tobogan", description: "Tobogán acuático.", price: 10000, capacity: 30, categoryId: piscinas.id },
    { name: "Piscina Inodoro", slug: "piscina-inodoro", description: "Piscina Inodoro.", price: 10000, capacity: 30, categoryId: piscinas.id },
    { name: "Piscina Torpedo", slug: "piscina-torpedo", description: "Piscina Torpedo.", price: 9000, capacity: 20, categoryId: piscinas.id },

    // Gimnasio y Canchas
    { name: "Gimnasio", slug: "gimnasio", description: "Gimnasio del complejo.", price: 15000, capacity: 40, categoryId: gimnasio.id },
    { name: "Cancha de microfútbol 1", slug: "cancha-microfutbol-1", description: "Cancha de microfútbol.", price: 60000, capacity: 14, categoryId: canchas.id },
    { name: "Cancha de microfútbol 2", slug: "cancha-microfutbol-2", description: "Cancha de microfútbol.", price: 60000, capacity: 14, categoryId: canchas.id },
    { name: "Cancha de microfútbol 3", slug: "cancha-microfutbol-3", description: "Cancha de microfútbol.", price: 60000, capacity: 14, categoryId: canchas.id },
    { name: "Cancha de microfútbol 4", slug: "cancha-microfutbol-4", description: "Cancha de microfútbol.", price: 60000, capacity: 14, categoryId: canchas.id },
    { name: "Cancha de fútbol", slug: "cancha-futbol", description: "Cancha de fútbol.", price: 100000, capacity: 22, categoryId: canchas.id },
    { name: "Polideportiva 1", slug: "polideportiva-1", description: "Cancha polideportiva.", price: 50000, capacity: 12, categoryId: canchas.id },
    { name: "Polideportiva 2", slug: "polideportiva-2", description: "Cancha polideportiva.", price: 50000, capacity: 12, categoryId: canchas.id },

    // Zonas húmedas
    { name: "Turco", slug: "bano-turco", description: "Baño turco del complejo.", price: 12000, capacity: 30, categoryId: zonasHumedas.id },
    { name: "Sauna", slug: "sauna", description: "Sauna del complejo.", price: 12000, capacity: 30, categoryId: zonasHumedas.id },
  ];

  // Mapea slugs antiguos a nuevos para preservar reservas y evitar conflictos de FK.
  const mapping = [
    { oldSlug: "piscina-adultos-1", newSlug: "piscina-de-olas", name: "Piscina de olas" },
    { oldSlug: "piscina-adultos-2", newSlug: "piscina-tobogan", name: "Piscina Tobogán" },
    { oldSlug: "piscina-adultos-3", newSlug: "piscina-inodoro", name: "Piscina Inodoro" },
    { oldSlug: "piscina-adultos-4", newSlug: "piscina-torpedo", name: "Piscina Torpedo" },
  ];
  for (const m of mapping) {
    await prisma.service.updateMany({
      where: { slug: m.oldSlug },
      data: { slug: m.newSlug, name: m.name },
    }).catch(() => {});
  }

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {
        name: service.name,
        description: service.description,
        price: service.price,
        capacity: service.capacity,
        categoryId: service.categoryId,
      },
      create: {
        name: service.name,
        slug: service.slug,
        description: service.description,
        price: service.price,
        capacity: service.capacity,
        categoryId: service.categoryId,
      },
    });
  }

  console.log("✅ Servicios creados/verificados");

  // =========================
  // 5. HORARIOS POR DEFECTO
  // =========================
  // Crea horarios semanales (08:00-17:00) para los 7 días de cada servicio.
  // El lunes es día de mantenimiento (se apaga en la lógica de disponibilidad),
  // pero se genera el horario para evitar inconsistencia en festivos.
  const operatingDays = [0, 1, 2, 3, 4, 5, 6];
  const createdServices = await prisma.service.findMany({ select: { id: true } });

  for (const service of createdServices) {
    for (const dayOfWeek of operatingDays) {
      await prisma.serviceSchedule.upsert({
        where: {
          serviceId_dayOfWeek: { serviceId: service.id, dayOfWeek },
        },
        update: {},
        create: {
          serviceId: service.id,
          dayOfWeek,
          openTime: "08:00",
          closeTime: "17:00",
        },
      });
    }
  }

  console.log("✅ Horarios semanales creados");

  // =========================
  // 6. GENERACIÓN DE SLOTs POR FECHAS
  // =========================
  // Genera las franjas de 1 hora para los próximos 90 días de cada servicio,
  // saltando días de mantenimiento y cierres. Se usa la función del repositorio
  // de disponibilidad para reutilizar la lógica.
  const lookAheadDays = 90;

  for (const service of createdServices) {
    await generateServiceSlotsForRange(service.id, lookAheadDays, prisma);
  }

  console.log("🎉 Seed completado correctamente.");
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

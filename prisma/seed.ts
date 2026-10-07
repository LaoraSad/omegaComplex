import { PrismaClient, nameRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // =========================
  // 1. ROLES
  // =========================

  const userRole = await prisma.role.upsert({
    where: {
      name: nameRole.user,
    },
    update: {},
    create: {
      name: nameRole.user,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: {
      name: nameRole.admin,
    },
    update: {},
    create: {
      name: nameRole.admin,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: {
      name: nameRole.employee,
    },
    update: {},
    create: {
      name: nameRole.employee,
    },
  });

  console.log("✅ Roles creados/verificados");

  // =========================
  // 2. CATEGORÍAS
  // =========================

  const categories = [
    {
      name: "Piscinas",
      description: "Servicios relacionados con las piscinas del complejo.",
    },
    {
      name: "Deportes",
      description: "Servicios y espacios deportivos del complejo.",
    },
    {
      name: "Eventos",
      description: "Espacios y servicios para eventos.",
    },
  ];

  const createdCategories = [];

  for (const category of categories) {
    const createdCategory = await prisma.category.upsert({
      where: {
        name: category.name,
      },
      update: {
        description: category.description,
      },
      create: {
        name: category.name,
        description: category.description,
      },
    });

    createdCategories.push(createdCategory);
  }

  console.log("✅ Categorías creadas/verificadas");

  // =========================
  // 3. OBTENER CATEGORÍAS
  // =========================

  const piscinas = createdCategories.find(
    (category) => category.name === "Piscinas",
  );

  const deportes = createdCategories.find(
    (category) => category.name === "Deportes",
  );

  const eventos = createdCategories.find(
    (category) => category.name === "Eventos",
  );

  if (!piscinas || !deportes || !eventos) {
    throw new Error("No se pudieron encontrar las categorías.");
  }

  // =========================
  // 4. SERVICIOS
  // =========================

  const services = [
    // Piscinas
    {
      name: "Piscina infantil",
      slug: "piscina-infantil",
      description: "Piscina destinada al uso infantil.",
      price: 8000,
      capacity: 100,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 1",
      slug: "piscina-adultos-1",
      description: "Piscina para adultos.",
      price: 12000,
      capacity: 100,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 2",
      slug: "piscina-adultos-2",
      description: "Piscina para adultos.",
      price: 10000,
      capacity: 30,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 3",
      slug: "piscina-adultos-3",
      description: "Piscina para adultos.",
      price: 10000,
      capacity: 30,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 4",
      slug: "piscina-adultos-4",
      description: "Piscina para adultos.",
      price: 9000,
      capacity: 20,
      categoryId: piscinas.id,
    },

    // Deportes
    {
      name: "Gimnasio",
      slug: "gimnasio",
      description: "Gimnasio del complejo.",
      price: 15000,
      capacity: 40,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 1",
      slug: "cancha-microfutbol-1",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 2",
      slug: "cancha-microfutbol-2",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 3",
      slug: "cancha-microfutbol-3",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 4",
      slug: "cancha-microfutbol-4",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de fútbol",
      slug: "cancha-futbol",
      description: "Cancha de fútbol.",
      price: 100000,
      capacity: 22,
      categoryId: deportes.id,
    },
    {
      name: "Polideportiva 1",
      slug: "polideportiva-1",
      description: "Cancha polideportiva.",
      price: 50000,
      capacity: 12,
      categoryId: deportes.id,
    },
    {
      name: "Polideportiva 2",
      slug: "polideportiva-2",
      description: "Cancha polideportiva.",
      price: 50000,
      capacity: 12,
      categoryId: deportes.id,
    },

    // Bienestar dentro de Deportes por ahora
    {
      name: "Turco",
      slug: "bano-turco",
      description: "Baño turco del complejo.",
      price: 12000,
      capacity: 30,
      categoryId: deportes.id,
    },
    {
      name: "Sauna",
      slug: "sauna",
      description: "Sauna del complejo.",
      price: 12000,
      capacity: 30,
      categoryId: deportes.id,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: {
        name: service.name,
      },
      update: {
        description: service.description,
        price: service.price,
        capacity: service.capacity,
        categoryId: service.categoryId,
        slug: service.slug,
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
  // 4b. HORARIOS DE SERVICIOS (ServiceSchedule)
  // =========================
  // Todos los servicios operan de martes a domingo, 08:00 a 17:00
  // Lunes (1) = cerrado por mantenimiento
  const daysOfWeek = [0, 2, 3, 4, 5, 6]; // Domingo, Martes, Miércoles, Jueves, Viernes, Sábado
  const openTime = "08:00";
  const closeTime = "17:00";

  const createdServices = await prisma.service.findMany({
    select: { id: true },
  });

  for (const service of createdServices) {
    for (const dayOfWeek of daysOfWeek) {
      await prisma.serviceSchedule.upsert({
        where: {
          serviceId_dayOfWeek: {
            serviceId: service.id,
            dayOfWeek,
          },
        },
        update: {
          openTime,
          closeTime,
        },
        create: {
          serviceId: service.id,
          dayOfWeek,
          openTime,
          closeTime,
        },
      });
    }
  }

  console.log("✅ Horarios de servicios creados/verificados");

  // =========================
  // 4c. GENERAR FRANJAS (ServiceSlot) para los próximos 14 días
  // =========================
  await generateServiceSlots(prisma, 14);

  console.log("✅ Franjas de servicios generadas");

  // =========================
  // 5. USUARIO ADMIN
  // =========================

  // =========================
  // 5. USUARIO ADMIN
  // =========================

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Faltan ADMIN_EMAIL o ADMIN_PASSWORD en las variables de entorno.",
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      roleId: adminRole.id,
      passwordHash,
      firstName: "Administrador",
      lastName: "Omega Complex",
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: "Administrador",
      lastName: "Omega Complex",
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log("✅ Administrador creado/verificado");

  console.log("🎉 Seed completado correctamente.");
}

async function generateServiceSlots(prisma: PrismaClient, daysAhead: number) {
  const schedules = await prisma.serviceSchedule.findMany({
    include: { service: { select: { id: true, capacity: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Process sequentially to avoid connection pool exhaustion
  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);
    const dayOfWeek = currentDate.getDay();

    // Skip Monday (1) - maintenance day
    if (dayOfWeek === 1) continue;

    const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);

    for (const schedule of daySchedules) {
      const [openHour, openMin] = schedule.openTime.split(":").map(Number);
      const [closeHour, closeMin] = schedule.closeTime.split(":").map(Number);

      const startBase = new Date(currentDate);
      startBase.setHours(openHour, openMin, 0, 0);

      const endBase = new Date(currentDate);
      endBase.setHours(closeHour, closeMin, 0, 0);

      // Generate 1-hour slots sequentially
      let slotStart = new Date(startBase);
      while (slotStart < endBase) {
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        if (slotEnd > endBase) break;

        await prisma.serviceSlot.upsert({
          where: {
            serviceId_startsAt: {
              serviceId: schedule.serviceId,
              startsAt: slotStart,
            },
          },
          update: {
            capacity: schedule.service.capacity,
          },
          create: {
            serviceId: schedule.serviceId,
            startsAt: slotStart,
            endsAt: slotEnd,
            capacity: schedule.service.capacity,
            bookedCount: 0,
            heldCount: 0,
          },
        });

        slotStart = slotEnd;
      }
    }
    console.log(`  Generadas franjas para ${currentDate.toISOString().split('T')[0]}`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

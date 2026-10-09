import { PrismaClient, nameRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateServiceSlotsForRange } from "@/features/availability/availability.repository";

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
  // 2. USUARIO ADMIN (Inmediato)
  // =========================
  const adminEmail = process.env.ADMIN_EMAIL || "admin@omegacomplex.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
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
  // 3. CATEGORÍAS
  // =========================

  const categories = [
    { name: "Piscinas", slug: "piscinas" },
    { name: "Canchas", slug: "canchas" },
    { name: "Zonas húmedas", slug: "zonas-humedas" },
    { name: "Gimnasio", slug: "gimnasio" },
  ];

  const createdCategories = [];

  for (const category of categories) {
    const createdCategory = await prisma.category.upsert({
      where: {
        name: category.name,
      },
      update: {
        slug: category.slug,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        isActive: true,
      },
    });

    createdCategories.push(createdCategory);
  }

  await prisma.category.updateMany({
    where: { name: { in: ["Deportes", "Eventos"] } },
    data: { isActive: false },
  });

  console.log("✅ Categorías creadas/verificadas");

  // =========================
  // 3. OBTENER CATEGORÍAS
  // =========================

  const piscinas = createdCategories.find(
    (category) => category.name === "Piscinas",
  );

  const canchas = createdCategories.find(
    (category) => category.name === "Canchas",
  );

  const zonasHumedas = createdCategories.find(
    (category) => category.name === "Zonas húmedas",
  );

  const gimnasio = createdCategories.find(
    (category) => category.name === "Gimnasio",
  );

  if (!piscinas || !canchas || !zonasHumedas || !gimnasio) {
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
      categoryId: gimnasio.id,
    },
    {
      name: "Cancha de microfútbol 1",
      slug: "cancha-microfutbol-1",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: canchas.id,
    },
    {
      name: "Cancha de microfútbol 2",
      slug: "cancha-microfutbol-2",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: canchas.id,
    },
    {
      name: "Cancha de microfútbol 3",
      slug: "cancha-microfutbol-3",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: canchas.id,
    },
    {
      name: "Cancha de microfútbol 4",
      slug: "cancha-microfutbol-4",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: canchas.id,
    },
    {
      name: "Cancha de fútbol",
      slug: "cancha-futbol",
      description: "Cancha de fútbol.",
      price: 100000,
      capacity: 22,
      categoryId: canchas.id,
    },
    {
      name: "Polideportiva 1",
      slug: "polideportiva-1",
      description: "Cancha polideportiva.",
      price: 50000,
      capacity: 12,
      categoryId: canchas.id,
    },
    {
      name: "Polideportiva 2",
      slug: "polideportiva-2",
      description: "Cancha polideportiva.",
      price: 50000,
      capacity: 12,
      categoryId: canchas.id,
    },

    // Servicios de zonas húmedas
    {
      name: "Turco",
      slug: "bano-turco",
      description: "Baño turco del complejo.",
      price: 12000,
      capacity: 30,
      categoryId: zonasHumedas.id,
    },
    {
      name: "Sauna",
      slug: "sauna",
      description: "Sauna del complejo.",
      price: 12000,
      capacity: 30,
      categoryId: zonasHumedas.id,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: {
        slug: service.slug,
      },
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

  const operatingDays = [0, 2, 3, 4, 5, 6];
  const createdServices = await prisma.service.findMany({
    select: { id: true },
  });

  for (const service of createdServices) {
    for (const dayOfWeek of operatingDays) {
      await prisma.serviceSchedule.upsert({
        where: {
          serviceId_dayOfWeek: {
            serviceId: service.id,
            dayOfWeek,
          },
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

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
      description: "Piscina destinada al uso infantil.",
      price: 8000,
      capacity: 100,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 1",
      description: "Piscina para adultos.",
      price: 12000,
      capacity: 100,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 2",
      description: "Piscina para adultos.",
      price: 10000,
      capacity: 30,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 3",
      description: "Piscina para adultos.",
      price: 10000,
      capacity: 30,
      categoryId: piscinas.id,
    },
    {
      name: "Piscina adultos 4",
      description: "Piscina para adultos.",
      price: 9000,
      capacity: 20,
      categoryId: piscinas.id,
    },

    // Deportes
    {
      name: "Gimnasio",
      description: "Gimnasio del complejo.",
      price: 15000,
      capacity: 40,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 1",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 2",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 3",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de microfútbol 4",
      description: "Cancha de microfútbol.",
      price: 60000,
      capacity: 14,
      categoryId: deportes.id,
    },
    {
      name: "Cancha de fútbol",
      description: "Cancha de fútbol.",
      price: 100000,
      capacity: 22,
      categoryId: deportes.id,
    },
    {
      name: "Polideportiva 1",
      description: "Cancha polideportiva.",
      price: 50000,
      capacity: 12,
      categoryId: deportes.id,
    },
    {
      name: "Polideportiva 2",
      description: "Cancha polideportiva.",
      price: 50000,
      capacity: 12,
      categoryId: deportes.id,
    },

    // Bienestar dentro de Deportes por ahora
    {
      name: "Turco",
      description: "Baño turco del complejo.",
      price: 12000,
      capacity: 30,
      categoryId: deportes.id,
    },
    {
      name: "Sauna",
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
      },
      create: {
        name: service.name,
        description: service.description,
        price: service.price,
        capacity: service.capacity,
        categoryId: service.categoryId,
      },
    });
  }

  console.log("✅ Servicios creados/verificados");

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

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

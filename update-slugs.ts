import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const services = [
    { id: 'ninos', slug: 'ninos' },
    { id: 'adulto1', slug: 'adulto1' },
    { id: 'adulto2', slug: 'adulto2' },
    { id: 'adulto3', slug: 'adulto3' },
    { id: 'olas', slug: 'olas' },
    { id: 'tobogan', slug: 'tobogan' },
    { id: 'inodoro', slug: 'inodoro' },
    { id: 'luisita', slug: 'luisita' },
    { id: 'gym', slug: 'gym' },
    { id: 'turco', slug: 'turco' },
    { id: 'sauna', slug: 'sauna' },
    { id: 'microfutbol', slug: 'microfutbol' },
    { id: 'microfutbol2', slug: 'microfutbol2' },
    { id: 'futbol', slug: 'futbol' },
    { id: 'padel', slug: 'padel' },
    { id: 'tenis', slug: 'tenis' },
    { id: 'polideportivo1', slug: 'polideportivo1' },
    { id: 'polideportivo2', slug: 'polideportivo2' },
  ];

  for (const s of services) {
    await prisma.service.update({
      where: { id: s.id },
      data: { slug: s.slug },
    });
    console.log(`Updated ${s.id} -> ${s.slug}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

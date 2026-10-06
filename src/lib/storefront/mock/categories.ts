import { Category } from '@/types/storefront/omega';

export const mockCategories: Category[] = [
  {
    id: 'cat-piscinas',
    name: 'Piscinas',
    slug: 'piscinas',
    description: 'Instalaciones acuáticas recreativas, piscina de olas y zona de toboganes.',
    icon: '🏊',
  },
  {
    id: 'cat-canchas',
    name: 'Canchas',
    slug: 'canchas',
    description: 'Campos deportivos de fútbol, canchas de microfútbol y polideportivos al aire libre.',
    icon: '⚽',
  },
  {
    id: 'cat-gimnasio',
    name: 'Gimnasio',
    slug: 'gimnasio',
    description: 'Área equipada para entrenamiento funcional, cardio y musculación.',
    icon: '🏋️',
  },
  {
    id: 'cat-zona-humeda',
    name: 'Zona húmeda',
    slug: 'zona-humeda',
    description: 'Espacios de relajación térmica con sauna seco y baño turco tradicional.',
    icon: '🧖',
  },
];

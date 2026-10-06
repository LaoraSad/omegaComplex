import type { Metadata } from 'next';
import LandingPage from '@/components/public/LandingPage';

export const metadata: Metadata = {
  title: 'Omega Complex | Reservas y Control de Acceso Deportivo',
  description:
    'Plataforma oficial de reservas para Omega Complex. Piscinas, canchas sintéticas, gimnasio y zona húmeda con acceso digital QR.',
};

export default function PublicPage() {
  return <LandingPage />;
}

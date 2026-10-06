import { redirect } from 'next/navigation';

// La landing vive ahora en `/` (grupo público).
// Se conserva esta ruta como redirección para no romper enlaces existentes.
export default function LegacyInicioPage() {
  redirect('/');
}

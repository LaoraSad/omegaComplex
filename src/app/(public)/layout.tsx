import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { CarritoProvider } from '@/components/storefront/CarritoReserva';
import { BarraCarrito } from '@/components/storefront/BarraCarrito';
import { getSession } from '@/shared/auth/session';
import { cargarUsuarioDeSesion } from '@/shared/auth/session-user';
import '../(storefront)/storefront.css';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let user = null;
  if (session?.userId) {
    try {
      user = await cargarUsuarioDeSesion(session.userId);
    } catch {
      user = null;
    }
  }

  // Mismo provider que en el storefront: el Navbar usa el carrito, así que sin él
  // el botón de carrito reventaría en las páginas públicas.
  return (
    <CarritoProvider haySesion={Boolean(user)} usuarioId={user?.id ?? null}>
      <div className="storefront-shell flex min-h-screen flex-col bg-[#0e0b0d] text-[#f5f1ec] antialiased font-sans">
        <Navbar initialUser={user} />
        <main className="flex-1 pt-20">{children}</main>
        <Footer />
        <BarraCarrito />
      </div>
    </CarritoProvider>
  );
}

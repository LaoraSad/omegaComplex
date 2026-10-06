import Navbar from '@/components/piscinas/layout/Navbar';
import Footer from '@/components/piscinas/layout/Footer';
import { getSession } from '@/shared/auth/session';
import { findSessionUserById } from '@/features/auth/auth.repository';
import '../(piscinas)/piscinas.css';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session ? await findSessionUserById(session.userId) : null;

  return (
    <div className="piscinas-shell flex min-h-screen flex-col bg-[#F5F5F5] text-[#1F1F1F] antialiased font-sans">
      <Navbar initialUser={user} />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}

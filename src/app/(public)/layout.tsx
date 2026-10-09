import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getSession } from '@/shared/auth/session';
import { findSessionUserById } from '@/features/auth/auth.repository';
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
      user = await findSessionUserById(session.userId);
    } catch {
      user = null;
    }
  }

  return (
    <div className="storefront-shell flex min-h-screen flex-col bg-[#0e0b0d] text-[#f5f1ec] antialiased font-sans">
      <Navbar initialUser={user} />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}

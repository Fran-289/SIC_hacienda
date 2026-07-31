import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ClientSidebar from './ClientSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // Consultar base de datos para obtener el nombre, correo y avatar siempre actualizados
  const dbUser = session ? await prisma.user.findUnique({ where: { id: session.id as number } }) : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-tertiary)' }}>
      {/* Sidebar Colapsable */}
      <ClientSidebar isAdmin={session?.role === 'ADMIN'} dbUser={dbUser} />

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import { getPageUser } from '@/lib/authz';
import { redirect } from 'next/navigation';
import ClientUsuariosTable from './ClientUsuariosTable';
import { Users } from 'lucide-react';

export default async function UsuariosPage() {
  const user = await getPageUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/configuracion');

  const initialUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      jobTitle: true,
      permissions: true,
      createdAt: true,
    },
    orderBy: { id: 'desc' }
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} />
            Administración de Usuarios
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Gestiona los accesos, roles y contraseñas del sistema.
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <ClientUsuariosTable initialUsers={initialUsers} currentUserId={user.id} />
      </div>
    </div>
  );
}

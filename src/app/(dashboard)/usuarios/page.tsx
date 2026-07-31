import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ClientUsuariosTable from './ClientUsuariosTable';
import { Users } from 'lucide-react';

export default async function UsuariosPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'ADMIN') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Acceso Denegado</h2>
        <p>No tienes permisos para ver esta página.</p>
      </div>
    );
  }

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
        <ClientUsuariosTable initialUsers={initialUsers} currentUserId={session.id as number} />
      </div>
    </div>
  );
}

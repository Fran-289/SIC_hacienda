import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Settings } from 'lucide-react';
import ProfileForm from './ProfileForm';
import SettingsForm from './SettingsForm';
import ThemeToggle from './ThemeToggle';
import LogoutButton from '@/components/LogoutButton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function ConfiguracionPage() {
  const session = await getSession();
  
  if (!session) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Acceso Denegado</h2>
        <p>No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({ where: { id: session.id as number } });
  const isAdmin = session.role === 'ADMIN';

  const logs = isAdmin ? await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: true }
  }) : [];

  const settings = isAdmin ? await prisma.systemSetting.findMany() : [];
  const config = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={24} />
          Configuraciones del Sistema
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          {isAdmin ? 'Administra tu perfil, apariencia y parámetros del sistema' : 'Administra tu perfil personal y apariencia visual'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Columna Izquierda: Perfil y Sesión */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ProfileForm user={{ name: dbUser?.name || '', email: dbUser?.email || '', avatar: dbUser?.avatar || null }} isAdmin={isAdmin} />
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--danger)' }}>
              Seguridad
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Finaliza tu sesión de forma segura cuando termines de utilizar el sistema.
            </p>
            <LogoutButton fullWidth={false} />
          </div>

          {isAdmin && (
            <div className="glass-panel" style={{ padding: '1.5rem', height: '400px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Historial de Actividad
              </h3>
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                {logs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>
                    No hay actividad registrada aún.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {logs.map(log => (
                      <li key={log.id} style={{ borderLeft: '2px solid var(--accent-primary)', paddingLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            textTransform: 'uppercase',
                            padding: '0.15rem 0.4rem', 
                            borderRadius: 'var(--radius-sm)', 
                            backgroundColor: log.action === 'CREATE_RECORD' ? '#dbeafe' : log.action === 'UPDATE_PROFILE' ? '#f3e8ff' : '#f1f5f9',
                            color: log.action === 'CREATE_RECORD' ? '#1e40af' : log.action === 'UPDATE_PROFILE' ? '#6b21a8' : '#475569'
                          }}>
                            {log.action === 'CREATE_RECORD' ? 'INGRESO REGISTRADO' : log.action === 'UPDATE_PROFILE' ? 'PERFIL ACTUALIZADO' : log.action}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {log.details}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>👤 Por: {log.userName || log.user?.name || 'Usuario Eliminado'}</span>
                          <span>🕒 {format(log.createdAt, "d MMM yyyy, h:mm a", { locale: es })}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Tema e Historial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ThemeToggle />
          
          {isAdmin && (
            <SettingsForm initialSettings={config} />
          )}
        </div>
      </div>
    </div>
  );
}

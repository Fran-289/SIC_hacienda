'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Database, User, Menu, ChevronLeft, ChevronRight, History, ClipboardList } from 'lucide-react';

export default function ClientSidebar({ isAdmin, dbUser }: { isAdmin: boolean, dbUser: any }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  let userPermissions: string[] = [];
  try {
    if (dbUser?.permissions) {
      userPermissions = JSON.parse(dbUser.permissions);
    }
  } catch (e) {
    userPermissions = [];
  }

  const links = [];

  if (isAdmin || userPermissions.includes('ingresos')) {
    links.push({ href: '/ingresos', icon: Home, label: 'Bandeja de Ingresos' });
  }
  if (isAdmin || userPermissions.includes('reportes')) {
    links.push({ href: '/historial', icon: History, label: 'Bandeja de Reportes' });
    links.push({ href: '/tareas-pendientes', icon: ClipboardList, label: 'Tareas Pendientes' });
  }
  if (isAdmin || userPermissions.includes('directorio')) {
    links.push({ href: '/catalogos/procedencias', icon: Database, label: 'Directorio Consular' });
  }

  if (isAdmin) {
    links.push({ href: '/usuarios', icon: User, label: 'Usuarios' });
  }

  links.push({ href: '/configuracion', icon: Settings, label: 'Configuración' });

  return (
    <aside style={{
      width: isCollapsed ? '80px' : '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease-in-out',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: isCollapsed ? '1.5rem 0' : '1.5rem', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between'
      }}>
        {!isCollapsed && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              SIC - Hacienda
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ingresos Consulares</p>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={isCollapsed ? "Expandir" : "Contraer"}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <nav style={{ padding: '1rem', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, padding: 0 }}>
          {links.map((link) => {
            const isActive = link.href === '/reportes' ? pathname === link.href : pathname.startsWith(link.href);
            const Icon = link.icon;
            
            return (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: isCollapsed ? '0.75rem' : '0.75rem 1rem', 
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                    textDecoration: 'none', 
                    fontWeight: isActive ? 600 : 500, 
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease-in-out',
                    whiteSpace: 'nowrap'
                  }}
                  title={isCollapsed ? link.label : undefined}
                >
                  <Icon size={isCollapsed ? 22 : 18} style={{ flexShrink: 0 }} />
                  {!isCollapsed && <span>{link.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', overflow: 'hidden', flexShrink: 0 }}>
            {dbUser?.avatar ? (
              dbUser.avatar.startsWith('data:image') ? (
                <img src={dbUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '18px' }}>{dbUser.avatar}</span>
              )
            ) : (
              <User size={16} />
            )}
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {dbUser?.name || 'Usuario'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {dbUser?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

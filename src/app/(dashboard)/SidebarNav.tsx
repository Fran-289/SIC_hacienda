'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Database, User } from 'lucide-react';

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: '/ingresos', icon: Home, label: 'Bandeja de Ingresos' },
    { href: '/reportes', icon: FileText, label: 'Generar Reportes' },
  ];

  if (isAdmin) {
    links.push({ href: '/catalogos/procedencias', icon: Database, label: 'Directorio Consular' });
    links.push({ href: '/usuarios', icon: User, label: 'Usuarios' });
    links.push({ href: '/configuracion', icon: Settings, label: 'Configuración' });
  }

  return (
    <nav style={{ padding: '1rem', flex: 1 }}>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, padding: 0 }}>
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;
          
          return (
            <li key={link.href}>
              <Link 
                href={link.href} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.75rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                  textDecoration: 'none', 
                  fontWeight: isActive ? 600 : 500, 
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

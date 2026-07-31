'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ fullWidth = true, showText = true }: { fullWidth?: boolean, showText?: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className={fullWidth ? '' : 'btn btn-secondary'}
        style={fullWidth ? { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', backgroundColor: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, borderRadius: 'var(--radius-md)', transition: 'background-color 0.2s', justifyContent: showText ? 'flex-start' : 'center' } : { color: 'var(--danger)', borderColor: 'var(--danger)', padding: showText ? undefined : '0.5rem', display: 'flex', justifyContent: 'center' }}
        title={!showText ? "Cerrar Sesión" : undefined}
      >
        <LogOut size={16} />
        {showText && "Cerrar Sesión"}
      </button>

      {mounted && showModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '50%' }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>¿Estás seguro que quieres cerrar sesión?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Tendrás que volver a ingresar tus credenciales para acceder al sistema.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="btn"
                  style={{ flex: 1, backgroundColor: '#fee2e2', color: '#991b1b' }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#991b1b' }}
                  disabled={loading}
                >
                  {loading ? 'Cerrando...' : 'Aceptar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

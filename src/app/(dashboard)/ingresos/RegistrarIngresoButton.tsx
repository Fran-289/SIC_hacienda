'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function RegistrarIngresoButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn btn-primary">
        <Plus size={16} /> Registrar Ingreso
      </button>

      {showModal && mounted && createPortal(
        <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '450px', width: '100%', textAlign: 'center', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              ¿Cómo deseas abrir el registro?
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Puedes abrir el formulario en una <strong>nueva pestaña</strong> si quieres seguir viendo esta bandeja de ingresos sin cerrarla.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => {
                setShowModal(false);
                router.push('/ingresos/nuevo');
              }} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                Misma página
              </button>
              <button onClick={() => {
                setShowModal(false);
                window.open('/ingresos/nuevo', '_blank');
              }} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                Nueva pestaña
              </button>
            </div>
            <button 
              onClick={() => setShowModal(false)} 
              className="btn"
              style={{ 
                marginTop: '1.5rem', 
                backgroundColor: '#fee2e2', 
                color: '#991b1b', 
                border: '1px solid #fca5a5', 
                width: '100%', 
                justifyContent: 'center' 
              }}
            >
              Cancelar
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

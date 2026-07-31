'use client';

export default function NotificarButton({ recordId }: { recordId: number }) {
  return (
    <button 
      onClick={async () => {
        alert('Simulando envío SMTP...');
        await fetch('/api/notificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId })
        });
        alert('Correo enviado (simulado). Revisa la terminal.');
      }}
      className="btn btn-secondary" 
      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
    >
      Notificar a RREE
    </button>
  );
}

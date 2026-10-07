'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/client/api';

export default function NotificarButton({ recordId }: { recordId: number }) {
  const [sending, setSending] = useState(false);

  const notify = async () => {
    setSending(true);
    try {
      const res = await apiFetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });
      const data = await res.json().catch(() => ({}));
      alert(res.ok ? data.message || 'Correo enviado.' : data.error || 'No se pudo enviar el correo.');
    } catch {
      alert('Error de conexión con el servidor.');
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={notify}
      disabled={sending}
      className="btn btn-secondary"
      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', opacity: sending ? 0.6 : 1 }}
    >
      {sending ? 'Enviando…' : 'Notificar a RREE'}
    </button>
  );
}

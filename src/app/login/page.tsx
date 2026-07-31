'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Redirigir a la bandeja de ingresos
      router.push(data.redirectUrl);
    } catch (err) {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, backgroundColor: '#1e3a8a', overflowY: 'auto', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '1000px', 
        width: '100%', 
        backgroundColor: '#ffffff', 
        padding: '4rem 3rem',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
      }}>
        
        {/* Top Header section */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1', minWidth: '250px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Logo Placeholder - Usando Escudo Nacional desde Wikimedia para propósitos demostrativos */}
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Coat_of_arms_of_El_Salvador.svg" 
              style={{ height: '110px', marginBottom: '15px' }} 
              alt="Escudo de El Salvador" 
            />
            <h2 style={{ 
              fontFamily: '"Times New Roman", Times, serif', 
              color: '#1e3a8a', 
              margin: 0, 
              fontWeight: 400, 
              fontSize: '1.4rem',
              letterSpacing: '1px',
              lineHeight: '1.2'
            }}>
              GOBIERNO DE<br/>EL SALVADOR
            </h2>
          </div>
          
          <div style={{ 
            width: '2px', 
            height: '140px', 
            backgroundColor: '#1e3a8a', 
            margin: '0 3rem',
            display: 'block'
          }}></div>
          
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{ 
              fontFamily: '"Times New Roman", Times, serif', 
              color: '#1e3a8a', 
              fontSize: '3rem', 
              fontWeight: 400, 
              lineHeight: '1.1',
              margin: 0,
              letterSpacing: '2px'
            }}>
              MINISTERIO<br/>DE HACIENDA
            </h1>
          </div>
        </div>

        {/* Bottom content section */}
        <div style={{ display: 'flex', gap: '5rem', flexWrap: 'wrap' }}>
          
          {/* Login Form (Left) */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <form onSubmit={handleLogin}>
              
              {error && (
                <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem', backgroundColor: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#4b5563', marginBottom: '0.5rem', fontSize: '1rem' }}>Usuario</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', 
                    padding: '0.6rem', outline: 'none', color: '#111827', fontSize: '1rem',
                    backgroundColor: '#ffffff'
                  }} 
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#4b5563', marginBottom: '0.5rem', fontSize: '1rem' }}>Contraseña</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', 
                    padding: '0.6rem', outline: 'none', color: '#111827', fontSize: '1rem',
                    backgroundColor: '#ffffff'
                  }} 
                />
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="recordar" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="recordar" style={{ color: '#4b5563', fontSize: '1rem', cursor: 'pointer' }}>Recordar</label>
              </div>

              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  width: '100%', backgroundColor: '#6495ED', color: 'white', border: 'none', 
                  borderRadius: '4px', padding: '0.6rem', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'background-color 0.2s'
                }}
              >
                {loading ? 'Iniciando...' : 'Iniciar sesión'}
              </button>
            </form>
          </div>

          {/* Legal Text (Right) */}
          <div style={{ flex: '1.2', minWidth: '350px', color: '#1e3a8a', fontSize: '1.05rem', lineHeight: '1.6', textAlign: 'justify' }}>
            <p style={{ marginBottom: '1.25rem', marginTop: 0 }}>
              "La información que contiene este sistema está sujeta a los criterios de CONFIDENCIALIDAD establecidos en la Ley de Acceso a la Información Pública y su uso está condicionado a la autorización que regulan las normas legales y técnicas aplicables.
            </p>
            <p style={{ marginBottom: '1.25rem' }}>
              Las actividades que se realizan dentro del sistema son registradas y monitoreadas.
            </p>
            <p style={{ margin: 0 }}>
              Cualquier acción indebida en el uso de la información, relativa a su generación, distribución y/o difusión parcial o total para fines no autorizados, queda sujeta a las sanciones legales correspondientes."
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

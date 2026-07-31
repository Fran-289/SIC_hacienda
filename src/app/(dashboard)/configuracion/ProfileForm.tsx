'use client';

import { useState, useRef } from 'react';
import { Save, CheckCircle, Upload, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DEFAULT_AVATARS = ['👨‍💼', '👩‍💼', '🧑‍💻', '👩‍💻'];

export default function ProfileForm({ user, isAdmin = false }: { user: { name: string; email: string; avatar?: string | null }; isAdmin?: boolean }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar los 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatar }),
      });

      if (res.ok) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        Información Personal
      </h3>
      
      {success && (
        <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CheckCircle size={16} />
          Perfil actualizado correctamente.
        </div>
      )}

      {/* Selector de Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatar ? (
              avatar.startsWith('data:image') ? (
                <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '40px' }}>{avatar}</span>
              )
            ) : (
              <UserIcon size={40} color="var(--text-muted)" />
            )}
          </div>
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ position: 'absolute', bottom: 0, right: '-10px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
            title="Subir imagen"
          >
            <Upload size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {DEFAULT_AVATARS.map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setAvatar(emoji)}
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: avatar === emoji ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAvatar(null)}
            style={{ padding: '0 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            Quitar
          </button>
        </div>
      </div>

      <div className="input-group">
        <label>Nombre Completo</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="input-control" 
          required 
        />
      </div>

      <div className="input-group" style={{ marginBottom: '1.5rem' }}>
        <label>Correo Electrónico</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="input-control" 
          required 
          disabled={!isAdmin}
          style={{ cursor: !isAdmin ? 'not-allowed' : 'text', opacity: !isAdmin ? 0.7 : 1 }}
          title={!isAdmin ? "Solicita al administrador cambiar tu correo" : ""}
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        <Save size={16} />
        {loading ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </form>
  );
}

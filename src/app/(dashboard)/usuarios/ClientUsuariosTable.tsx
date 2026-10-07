'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Shield, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/client/api';

type UserData = {
  id: number;
  email: string;
  name: string;
  role: string;
  jobTitle: string | null;
  permissions?: string | null;
  createdAt: Date;
};

export default function ClientUsuariosTable({ initialUsers, currentUserId }: { initialUsers: UserData[], currentUserId: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: number, email: string } | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    jobTitle: '',
    permissions: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.jobTitle && u.jobTitle.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'USER', jobTitle: '', permissions: [] });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    
    let parsedPerms: string[] = [];
    if (user.permissions) {
      try {
        parsedPerms = JSON.parse(user.permissions);
      } catch(e) {}
    }

    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: '', // Blank implies no change
      role: user.role, 
      jobTitle: user.jobTitle || '',
      permissions: parsedPerms
    });
    setError('');
    setShowModal(true);
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (!/[A-Z]/.test(pass)) return 'La contraseña debe tener al menos una letra mayúscula.';
    if (!/[0-9]/.test(pass)) return 'La contraseña debe tener al menos un número.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Nombre y correo son obligatorios.');
      return;
    }

    if (!editingUser) {
      // Create mode
      const pwdError = validatePassword(formData.password);
      if (pwdError) {
        setError(pwdError);
        return;
      }
    } else {
      // Edit mode: only validate if password was entered
      if (formData.password.length > 0) {
        const pwdError = validatePassword(formData.password);
        if (pwdError) {
          setError(pwdError);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al guardar usuario');
        setLoading(false);
        return;
      }

      // Refresh list
      const updatedListRes = await apiFetch('/api/usuarios');
      if (updatedListRes.ok) {
        const updatedList = await updatedListRes.json();
        setUsers(updatedList);
      }

      setShowModal(false);
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        setShowDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  return (
    <div>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: '300px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar usuario..."
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--text-primary)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={openAddModal}>
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>ID</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Nombre Completo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Correo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Función / Cargo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Tipo de Usuario</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay usuarios registrados o no coinciden con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{String(u.id).padStart(2, '0')}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>{u.jobTitle || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: u.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    }}>
                      {u.role === 'ADMIN' ? 'Administrador' : 'Operador (USER)'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}
                        title="Editar"
                        onClick={() => openEditModal(u)}
                      >
                        <Pencil size={16} />
                      </button>
                      {u.id !== currentUserId && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', color: 'var(--danger)' }}
                          title="Eliminar"
                          onClick={() => setShowDeleteConfirm({ id: u.id, email: u.email })}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {mounted && showModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 1rem' }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} color="var(--accent-primary)" />
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              <form id="user-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nombre Completo <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" className="input-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Juan Pérez" />
                </div>
                
                <div className="input-group">
                  <label>Correo Institucional <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="email" className="input-control" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="usuario@hacienda.gob.sv" />
                </div>

                <div className="input-group">
                  <label>Función que desempeña</label>
                  <input type="text" className="input-control" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="Ej: Técnico de Ingresos" />
                </div>

                <div className="input-group">
                  <label>Tipo de Usuario <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select className="input-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="USER">Operador (USER)</option>
                    <option value="ADMIN">Administrador (ADMIN)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>
                    Contraseña {editingUser && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(Dejar en blanco para mantener actual)</span>}
                    {!editingUser && <span style={{ color: 'var(--danger)' }}>*</span>}
                  </label>
                  <input 
                    type="password" 
                    autoComplete="new-password"
                    className="input-control" 
                    required={!editingUser} 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="Al menos 6 chars, 1 Mayúscula y 1 número" 
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Requisitos: min 6 caracteres, 1 mayúscula, 1 número.
                  </p>
                </div>

                {formData.role === 'USER' && (
                  <div className="input-group">
                    <label>Módulos Permitidos</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {[
                        { id: 'ingresos', label: 'Bandeja de Ingresos' },
                        { id: 'reportes', label: 'Generar Reportes' },
                        { id: 'directorio', label: 'Directorio Consular' },
                      ].map(mod => (
                        <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                          <input 
                            type="checkbox" 
                            checked={formData.permissions.includes(mod.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, permissions: [...formData.permissions, mod.id]});
                              } else {
                                setFormData({...formData, permissions: formData.permissions.filter(p => p !== mod.id)});
                              }
                            }}
                          />
                          {mod.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', backgroundColor: 'var(--bg-tertiary)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" form="user-form" className="btn btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && showDeleteConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Eliminar Usuario</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                ¿Estás seguro de que deseas eliminar permanentemente al usuario <strong>{showDeleteConfirm.email}</strong>? Esta acción no se puede deshacer.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(null)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)' }} onClick={() => handleDelete(showDeleteConfirm.id)}>
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

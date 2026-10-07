'use client';

import { useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';

export default function SettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    caja_banco_nombre: initialSettings.caja_banco_nombre || 'BANCO CUSCATLAN DE EL SALVADOR',
    caja_banco_cuenta: initialSettings.caja_banco_cuenta || '00-11-005225-1',
    caja_codigo_contable: initialSettings.caja_codigo_contable || '85803099',
    caja_codigo_pasaportes: initialSettings.caja_codigo_pasaportes || '12106',
    caja_codigo_dui: initialSettings.caja_codigo_dui || '14297',
    caja_codigo_consulares: initialSettings.caja_codigo_consulares || '12209',
    caja_codigo_diversos: initialSettings.caja_codigo_diversos || '15799',
    firma_aprobo_nombre: initialSettings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA',
    firma_aprobo_cargo: initialSettings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS',
    logo_izquierdo: initialSettings.logo_izquierdo || '',
    logo_derecho: initialSettings.logo_derecho || '',
    notif_rree_to: initialSettings.notif_rree_to || 'jachavez@rree.gob.sv',
    notif_rree_cc: initialSettings.notif_rree_cc || 'hugo.martinez@mh.gob.sv;santiago.mendez@rree.gob.sv;aurbina@rree.gob.sv;ronal.aguilar@mh.gob.sv',
    notif_banco_to: initialSettings.notif_banco_to || 'Magdalena.galan@bancocuscatlan.com',
    notif_banco_cc: initialSettings.notif_banco_cc || 'hugo.martinez@mh.gob.sv;ronal.aguilar@mh.gob.sv',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'izquierdo' | 'derecho') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for logos
        alert('La imagen no puede pesar más de 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({
          ...prev,
          [side === 'izquierdo' ? 'logo_izquierdo' : 'logo_derecho']: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (side: 'izquierdo' | 'derecho') => {
    setSettings(prev => ({
      ...prev,
      [side === 'izquierdo' ? 'logo_izquierdo' : 'logo_derecho']: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      alert('Configuración guardada exitosamente');
      router.refresh();
    } catch (error) {
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        Parámetros de Reportes Consulares
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Logos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Logos de Documentos</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 500 }}>Logo Izquierdo (M. Hacienda)</p>
              {settings.logo_izquierdo ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <img src={settings.logo_izquierdo} alt="Logo Izquierdo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                  <button type="button" onClick={() => removeLogo('izquierdo')} style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Quitar</button>
                </div>
              ) : (
                <div>
                  <input type="file" id="logo_izquierdo" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'izquierdo')} />
                  <label htmlFor="logo_izquierdo" className="btn btn-secondary" style={{ display: 'inline-flex', padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <Upload size={14} style={{ marginRight: '0.5rem' }} /> Subir Imagen
                  </label>
                </div>
              )}
            </div>
            <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 500 }}>Logo Derecho (Gobierno)</p>
              {settings.logo_derecho ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <img src={settings.logo_derecho} alt="Logo Derecho" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                  <button type="button" onClick={() => removeLogo('derecho')} style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Quitar</button>
                </div>
              ) : (
                <div>
                  <input type="file" id="logo_derecho" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'derecho')} />
                  <label htmlFor="logo_derecho" className="btn btn-secondary" style={{ display: 'inline-flex', padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <Upload size={14} style={{ marginRight: '0.5rem' }} /> Subir Imagen
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Firmas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Firma de Aprobación</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>La firma de elaboración se tomará automáticamente del usuario que genera el reporte.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Nombre Aprobó</label>
              <input type="text" className="input-control" name="firma_aprobo_nombre" value={settings.firma_aprobo_nombre} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">Cargo Aprobó</label>
              <input type="text" className="input-control" name="firma_aprobo_cargo" value={settings.firma_aprobo_cargo} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Banco y Códigos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Información Bancaria</h4>
          <div>
            <label className="input-label">Nombre del Banco</label>
            <input type="text" className="input-control" name="caja_banco_nombre" value={settings.caja_banco_nombre} onChange={handleChange} />
          </div>
          <div>
            <label className="input-label">Cuenta Bancaria</label>
            <input type="text" className="input-control" name="caja_banco_cuenta" value={settings.caja_banco_cuenta} onChange={handleChange} />
          </div>
          <div>
            <label className="input-label">Código Contable Principal</label>
            <input type="text" className="input-control" name="caja_codigo_contable" value={settings.caja_codigo_contable} onChange={handleChange} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Códigos Presupuestarios</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Pasaportes</label>
              <input type="text" className="input-control" name="caja_codigo_pasaportes" value={settings.caja_codigo_pasaportes} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">DUI Exterior</label>
              <input type="text" className="input-control" name="caja_codigo_dui" value={settings.caja_codigo_dui} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">Consulares</label>
              <input type="text" className="input-control" name="caja_codigo_consulares" value={settings.caja_codigo_consulares} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">Diversos</label>
              <input type="text" className="input-control" name="caja_codigo_diversos" value={settings.caja_codigo_diversos} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Notificaciones por Correo</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Separados por punto y coma. El servidor SMTP se configura en el archivo .env (SMTP_HOST, SMTP_USER, SMTP_PASS).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">RREE — Para</label>
              <input type="text" className="input-control" name="notif_rree_to" value={settings.notif_rree_to} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">RREE — Con copia</label>
              <input type="text" className="input-control" name="notif_rree_cc" value={settings.notif_rree_cc} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">Banco Cuscatlán — Para</label>
              <input type="text" className="input-control" name="notif_banco_to" value={settings.notif_banco_to} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">Banco Cuscatlán — Con copia</label>
              <input type="text" className="input-control" name="notif_banco_cc" value={settings.notif_banco_cc} onChange={handleChange} />
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={saving}>
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Parámetros'}
        </button>
      </div>
    </form>
  );
}

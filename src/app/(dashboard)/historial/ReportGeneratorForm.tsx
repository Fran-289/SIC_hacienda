'use client';

import { useState, useEffect } from 'react';
import { FileText, Settings, AlertTriangle, ArrowLeft, Eye, Download, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';

const reportGroups = [
  { id: 'consulares', name: 'Reportes Consulares' },
  { id: 'no_identificados', name: 'No Identificados / No Distribuidos' }
];

const months = [
  { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
  { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
  { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
  { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' },
];

const REPORTS_MAPPING: Record<string, { id: string, name: string }[]> = {
  consulares: [
    { id: 'cablegraficas', name: 'Reporte de Transferencias Cablegráficas' },
    { id: 'liquidacion', name: 'Liquidación de Fondos del Servicio Exterior' },
    { id: 'saldos', name: 'Reporte de Control de Saldos' },
    { id: 'caja', name: 'Informe de Caja Consular' }
  ],
  no_identificados: [
    { id: 'noidentificados', name: 'No Identificados' }
  ]
};

interface ReportGeneratorFormProps {
  minYear?: number;
  currentYear?: number;
}

export default function ReportGeneratorForm({ minYear = 2021, currentYear = new Date().getFullYear() }: ReportGeneratorFormProps) {
  const router = useRouter();
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);

  // --- FORM STATE ---
  const [grupoReporte, setGrupoReporte] = useState('consulares');
  const [repMonth, setRepMonth] = useState(new Date().getMonth() + 1);
  const [repYear, setRepYear] = useState(currentYear);
  const [bankAccount, setBankAccount] = useState('11-005225-1');
  const [estado, setEstado] = useState('PRELIMINAR');
  const [hasDefinitivo, setHasDefinitivo] = useState(false);

  // --- RESULTS STATE ---
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedParams, setGeneratedParams] = useState<unknown>(null);

  const [actionError, setActionError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Notificar
  const handleNotificar = (tipo: 'rree' | 'banco') => {
    const monthName = months.find(m => m.id === repMonth)?.name.toUpperCase() || '';
    const subject = `VALORES PENDIENTES DEL PERÍODO ${monthName}-${repYear}`;
    
    let to = '';
    let cc = '';
    let body = '';

    if (tipo === 'rree') {
      to = 'jachavez@rree.gob.sv';
      cc = 'hugo.martinez@mh.gob.sv;santiago.mendez@rree.gob.sv;aurbina@rree.gob.sv;ronal.aguilar@mh.gob.sv';
      body = `Buenas Tardes\nLicenciado Chávez\n\nPor medio de la presente remito archivo adjunto, solicitando de favor nos pueda identificar la procedencia y distribución de los montos de conformidad a sus controles.\n\nAgradeciéndole de antemano por su apoyo\nCordialmente`;
    } else {
      to = 'Magdalena.galan@bancocuscatlan.com';
      cc = 'hugo.martinez@mh.gob.sv;ronal.aguilar@mh.gob.sv';
      body = `Buenas Tardes\nLicenciada Magdalena Galán\n\nPor medio de la presente remito archivo adjunto, solicitando de favor nos pueda mandar los Swift de los montos de conformidad a sus controles.\n\nAgradeciéndole de antemano por su apoyo\nCordialmente`;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&cc=${cc}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    alert('Se ha abierto una pestaña nueva con Gmail. Recuerda adjuntar los archivos generados antes de enviar.');
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // El estado DEFINITIVO se consulta por grupo de reporte seleccionado
        const tipo = grupoReporte === 'no_identificados' ? 'noidentificados' : 'caja';
        const res = await apiFetch(`/api/reportes/check-status?tipo=${tipo}&mes=${repMonth}&anio=${repYear}`);
        if (res.ok) {
          const data = await res.json();
          setHasDefinitivo(data.hasDefinitivo);
          if (data.hasDefinitivo && estado === 'DEFINITIVO') {
            setEstado('DEFINITIVO MODIFICADO');
          } else if (!data.hasDefinitivo && estado === 'DEFINITIVO MODIFICADO') {
            setEstado('PRELIMINAR');
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };
    checkStatus();
    setIsGenerated(false); // reset generated state when inputs change
  }, [grupoReporte, repMonth, repYear]);

  const handleGenerateList = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const payload = {
        grupo: grupoReporte,
        mes: repMonth,
        anio: repYear,
        estado: grupoReporte === 'no_identificados' ? 'N/A' : estado,
        banco: bankAccount
      };
      
      const res = await apiFetch('/api/reportes/generar-grupo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar el grupo de reportes');
      }

      setSuccessMessage('El grupo de reportes se generó correctamente. Puedes procesarlo en Tareas Pendientes.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', width: '100%', gap: '2rem' }}>
      
      {/* FORMULARIO PRINCIPAL */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={20} color="var(--accent-primary)" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Generador de Reportes de Ingresos Consulares</span>
          </div>
          <button type="button" onClick={() => router.push('/historial')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Volver a la Bandeja
          </button>
        </div>

        <form onSubmit={handleGenerateList} style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', margin: 0 }}>
              <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Tipo de Reporte:</legend>
              <select style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }} value={grupoReporte} onChange={e => setGrupoReporte(e.target.value)} required>
                {reportGroups.map(r => <option key={r.id} value={r.id} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{r.name}</option>)}
              </select>
            </fieldset>

            {grupoReporte === 'consulares' && (
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', margin: 0 }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Cuenta Bancaria (Informe de Caja):</legend>
                <select style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }} value={bankAccount} onChange={e => setBankAccount(e.target.value)} required>
                  <option value="11-005225-1" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>11-005225-1 - INGRESOS CONSULARES</option>
                </select>
              </fieldset>
            )}

            {grupoReporte !== 'no_identificados' && (
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', margin: 0 }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Estado:</legend>
                <select style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }} value={estado} onChange={e => setEstado(e.target.value)} required>
                  {!hasDefinitivo ? (
                    <>
                      <option value="PRELIMINAR" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>PRELIMINAR</option>
                      <option value="DEFINITIVO" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>DEFINITIVO</option>
                    </>
                  ) : (
                    <>
                      <option value="PRELIMINAR" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>PRELIMINAR</option>
                      <option value="DEFINITIVO MODIFICADO" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>DEFINITIVO MODIFICADO</option>
                    </>
                  )}
                </select>
              </fieldset>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', margin: 0 }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Mes:</legend>
                <select style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }} value={repMonth} onChange={e => setRepMonth(Number(e.target.value))} required>
                  {months.map(m => <option key={m.id} value={m.id} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{m.name}</option>)}
                </select>
              </fieldset>
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', margin: 0 }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Año:</legend>
                <select style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }} value={repYear} onChange={e => setRepYear(Number(e.target.value))} required>
                  {years.map(y => <option key={y} value={y} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{y}</option>)}
                </select>
              </fieldset>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white' }} disabled={isGenerating}>
              <FileText size={18} style={{marginRight:'0.5rem'}}/><span>{isGenerating ? 'Generando...' : 'Generar Reportes'}</span>
            </button>
          </div>
        </form>
      </div>

      {actionError && (
        <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} /><span>{actionError}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '1.5rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
             <FileText size={24} /><span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => router.push('/tareas-pendientes')} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            Ir a Tareas Pendientes
          </button>
        </div>
      )}



    </div>
  );
}

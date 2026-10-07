'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Eye, FileText, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, PenTool, Upload, Mail, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiFetch } from '@/lib/client/api';

interface ReportDocument {
  id: number;
  reportType: string;
  pdfUrl: string | null;
  excelUrl: string | null;
  signedPdfUrl: string | null;
}

interface ReportGroup {
  id: number;
  correlative: string;
  groupType: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  processStatus: string;
  createdBy: { name: string; email: string };
  createdAt: string;
  documents: ReportDocument[];
}

const months = [
  { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
  { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
  { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
  { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' }
];

type FilterKey = 'correlative' | 'groupType' | 'month' | 'year' | 'status' | 'user' | 'createdAt' | 'processStatus';

export default function ClientTareasPendientes({ currentYear, minYear }: { currentYear: number, minYear: number }) {
  const [history, setHistory] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
  const [isSigning, setIsSigning] = useState<number | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

  // --- FILTERS & SORTING STATE ---
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    correlative: '',
    groupType: '',
    month: '',
    year: '',
    status: '',
    user: '',
    createdAt: '',
    processStatus: ''
  });

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
    key: 'createdAt',
    direction: 'desc'
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/historial');
      if (!res.ok) throw new Error('Error al obtener el historial');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getMailtoRREE = (group: ReportGroup) => {
    const monthName = months.find(m => m.id === group.periodMonth)?.name.toUpperCase() || '';
    const subject = `VALORES PENDIENTES DEL PERÍODO ${monthName}-${group.periodYear}`;
    const to = 'jachavez@rree.gob.sv';
    const cc = 'hugo.martinez@mh.gob.sv;santiago.mendez@rree.gob.sv;aurbina@rree.gob.sv;ronal.aguilar@mh.gob.sv';
    const body = `Buenas Tardes\nLicenciado Chávez\n\nPor medio de la presente remito archivo adjunto, solicitando de favor nos pueda identificar la procedencia y distribución de los montos de conformidad a sus controles.\n\nAgradeciéndole de antemano por su apoyo\nCordialmente`;
    return `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getMailtoBanco = (group: ReportGroup) => {
    const monthName = months.find(m => m.id === group.periodMonth)?.name.toUpperCase() || '';
    const subject = `VALORES PENDIENTES DEL PERÍODO ${monthName}-${group.periodYear}`;
    const to = 'Magdalena.galan@bancocuscatlan.com';
    const cc = 'hugo.martinez@mh.gob.sv;ronal.aguilar@mh.gob.sv';
    const body = `Buenas Tardes\nLicenciada Magdalena Galán\n\nPor medio de la presente remito archivo adjunto, solicitando de favor nos pueda mandar los Swift de los montos de conformidad a sus controles.\n\nAgradeciéndole de antemano por su apoyo\nCordialmente`;
    return `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handlePreview = (url: string | null) => {
    if (url) window.open(url, '_blank');
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: FilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const advanceProcess = async (groupId: number) => {
    try {
      const res = await apiFetch('/api/reportes/avanzar-proceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      if (res.ok) {
        fetchHistory();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al avanzar el proceso');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleSignConfirm = async (docId: number) => {
    if (confirm('¿Seguro quieres aplicar tu firma digital en este documento?')) {
      setIsSigning(docId);
      try {
        const res = await apiFetch('/api/documentos/firmar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId })
        });
        
        if (res.ok) {
          fetchHistory();
          alert('Documento firmado correctamente.');
        } else {
          const err = await res.json();
          alert(err.error || 'Error al firmar documento');
        }
      } catch (e) {
        alert('Error de conexión');
      } finally {
        setIsSigning(null);
      }
    }
  };

  const handleUploadClick = (docId: number) => {
    setUploadingDocId(docId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', uploadingDocId.toString());

    try {
      const res = await apiFetch('/api/reportes/upload-signed', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al subir archivo');
      }

      alert('Documento firmado subido exitosamente.');
      fetchHistory(); // Refresh to get updated urls and process status
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setUploadingDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReportEmail = async (group: ReportGroup) => {
    if (!confirm('¿Enviar el reporte por correo a RREE y Banco Cuscatlán desde el servidor?')) return;
    setSendingReport(true);
    try {
      const res = await apiFetch('/api/notificaciones/reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoReporte: 'noidentificados', mes: group.periodMonth, anio: group.periodYear })
      });
      const data = await res.json().catch(() => ({}));
      alert(res.ok ? data.message || 'Correo enviado.' : data.error || 'No se pudo enviar el correo.');
    } catch {
      alert('Error de conexión');
    } finally {
      setSendingReport(false);
    }
  };

  const filteredAndSortedHistory = useMemo(() => {
    let processed = history.filter(r => r.processStatus.toLowerCase() !== 'finalizado');

    if (filters.correlative) processed = processed.filter(r => r.correlative.toLowerCase().includes(filters.correlative.toLowerCase()));
    if (filters.createdAt) processed = processed.filter(r => format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm').includes(filters.createdAt));
    if (filters.user) processed = processed.filter(r => r.createdBy.name.toLowerCase().includes(filters.user.toLowerCase()));
    if (filters.groupType) processed = processed.filter(r => r.groupType.toLowerCase().includes(filters.groupType.toLowerCase()));
    if (filters.month) {
      processed = processed.filter(r => {
        const mStr = (months.find(m => m.id === r.periodMonth)?.name || '').toLowerCase();
        return mStr.includes(filters.month.toLowerCase());
      });
    }
    if (filters.year) {
      processed = processed.filter(r => r.periodYear.toString().includes(filters.year));
    }
    if (filters.status) processed = processed.filter(r => r.status.toLowerCase().includes(filters.status.toLowerCase()));
    if (filters.processStatus) processed = processed.filter(r => r.processStatus.toLowerCase().includes(filters.processStatus.toLowerCase()));

    if (sortConfig.direction !== null) {
      processed.sort((a, b) => {
        let aVal: string | number | { name: string; email: string } | ReportDocument[] = a[sortConfig.key as keyof ReportGroup];
        let bVal: string | number | { name: string; email: string } | ReportDocument[] = b[sortConfig.key as keyof ReportGroup];

        if (sortConfig.key === 'user') {
          aVal = a.createdBy.name.toLowerCase();
          bVal = b.createdBy.name.toLowerCase();
        } else if (sortConfig.key === 'month') {
          aVal = a.periodMonth;
          bVal = b.periodMonth;
        } else if (sortConfig.key === 'year') {
          aVal = a.periodYear;
          bVal = b.periodYear;
        } else if (sortConfig.key === 'createdAt') {
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return processed;
  }, [history, filters, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey || sortConfig.direction === null) return <ArrowUpDown size={14} style={{ opacity: 0.3, marginLeft: '0.25rem' }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} style={{ color: 'var(--accent-primary)', marginLeft: '0.25rem' }} /> : <ArrowDown size={14} style={{ color: 'var(--accent-primary)', marginLeft: '0.25rem' }} />;
  };

  const columns: { key: FilterKey; label: string; minWidth: string; align: React.CSSProperties['textAlign'] }[] = [
    { key: 'correlative', label: 'Correlativo', minWidth: '60px', align: 'left' },
    { key: 'groupType', label: 'Tipo de Reporte', minWidth: '160px', align: 'left' },
    { key: 'month', label: 'Mes', minWidth: '100px', align: 'left' },
    { key: 'year', label: 'Año', minWidth: '80px', align: 'left' },
    { key: 'status', label: 'Estado', minWidth: '110px', align: 'left' },
    { key: 'user', label: 'Generado Por', minWidth: '150px', align: 'left' },
    { key: 'createdAt', label: 'Fecha generado', minWidth: '150px', align: 'left' },
    { key: 'processStatus', label: 'Estado del proceso', minWidth: '130px', align: 'left' }
  ];

  return (
    <div className="glass-panel" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      
      <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={20} color="var(--accent-primary)" />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Tareas Pendientes</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchHistory} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
            Actualizar
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /><span>{error}</span>
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
                <th style={{ width: '40px', padding: '0.5rem', borderRight: '1px solid var(--border-color)' }}></th>
                {columns.map((col, idx) => (
                  <th key={col.key} style={{ padding: '0.5rem', fontWeight: 600, minWidth: col.minWidth, borderRight: '1px solid var(--border-color)', textAlign: col.align }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', fontSize: '0.75rem' }} onClick={() => handleSort(col.key)}>
                        {col.label}
                        <SortIcon columnKey={col.key} />
                      </div>
                      <input 
                        type="text" 
                        className="input-control" 
                        style={{ padding: '0.2rem', marginBottom: 0, fontSize: '0.75rem', height: '24px' }} 
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        placeholder=""
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1rem', height: '1rem', border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Cargando historial...
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay reportes registrados o ninguno coincide con los filtros.
                  </td>
                </tr>
              ) : (
                filteredAndSortedHistory.map((group) => {
                  const isExpanded = expandedRows[group.id];
                  
                  return (
                    <React.Fragment key={group.id}>
                      <tr 
                        onClick={() => toggleRow(group.id)}
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent' }} 
                        className="hover:bg-var(--bg-secondary)"
                      >
                        <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, borderRight: '1px solid var(--border-color)' }}>
                          {group.correlative}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', borderRight: '1px solid var(--border-color)' }}>
                          {group.groupType}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>
                          {months.find(m => m.id === group.periodMonth)?.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>
                          {group.periodYear}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', borderRight: '1px solid var(--border-color)' }}>
                          <span style={{ 
                            padding: '0.125rem 0.5rem', 
                            borderRadius: '9999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            backgroundColor: group.status.includes('DEFINITIVO MODIFICADO') ? 'rgba(245, 158, 11, 0.1)' : group.status.includes('DEFINITIVO') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: group.status.includes('DEFINITIVO MODIFICADO') ? 'var(--warning)' : group.status.includes('DEFINITIVO') ? 'var(--success)' : 'var(--accent-primary)'
                          }}>
                            {group.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', borderRight: '1px solid var(--border-color)' }}>
                          {group.createdBy.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>
                          {format(new Date(group.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ 
                              padding: '0.125rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1'
                            }}>
                              {group.processStatus}
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); advanceProcess(group.id); }}
                              className="btn btn-primary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                              title="Avanzar Estado"
                            >
                              Siguiente
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Documento</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Estado Actual</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.documents.map(doc => (
                                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        {doc.reportType.toUpperCase()}
                                      </td>
                                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                        {doc.signedPdfUrl ? (
                                          <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px',height:'8px',borderRadius:'50%',backgroundColor:'#10b981'}}></div> Firmado</span>
                                        ) : (
                                          <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><div style={{width:'8px',height:'8px',borderRadius:'50%',backgroundColor:'#f59e0b'}}></div> Pendiente</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                          
                                          <button onClick={(e) => { e.stopPropagation(); handlePreview(doc.pdfUrl); }} title="Vista Previa Generado" className="btn btn-secondary" style={{ padding: '0.4rem' }}>
                                            <Eye size={16} color="var(--text-secondary)" />
                                          </button>
                                          
                                          {doc.signedPdfUrl && (
                                            <button onClick={(e) => { e.stopPropagation(); handlePreview(doc.signedPdfUrl); }} title="Vista Previa Firmado" className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid #10b981' }}>
                                              <Eye size={16} color="#10b981" />
                                            </button>
                                          )}
                                          
                                          {doc.pdfUrl && (
                                            <a href={doc.pdfUrl} download title="Descargar PDF Original" onClick={e => e.stopPropagation()} className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid #ef4444', color: '#ef4444' }}>
                                              <FileText size={16} />
                                            </a>
                                          )}
                                          
                                          {doc.excelUrl && (
                                            <a href={doc.excelUrl} download title="Descargar Excel" onClick={e => e.stopPropagation()} className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid #10b981', color: '#10b981' }}>
                                              <Download size={16} />
                                            </a>
                                          )}
                                          {doc.reportType !== 'noidentificados_nodistribuidos' && (
                                            <>
                                              <button onClick={(e) => { e.stopPropagation(); handleSignConfirm(doc.id); }} title="Firma Digital" className="btn btn-primary" style={{ padding: '0.4rem' }} disabled={isSigning === doc.id}>
                                                {isSigning === doc.id ? <span style={{fontSize:'0.75rem'}}>...</span> : <PenTool size={16} />}
                                              </button>
                                              
                                              <button onClick={(e) => { e.stopPropagation(); handleUploadClick(doc.id); }} title="Subir PDF Firmado" className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid #3b82f6', color: '#3b82f6' }}>
                                                <Upload size={16} />
                                              </button>
                                            </>
                                          )}

                                          {doc.reportType === 'noidentificados_nodistribuidos' && (
                                            <>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleSendReportEmail(group); }}
                                                title="Enviar por correo desde el servidor"
                                                className="btn btn-primary"
                                                style={{ padding: '0.4rem', border: '1px solid #10b981', color: '#10b981' }}
                                                disabled={sendingReport}
                                              >
                                                <Send size={16} />
                                              </button>
                                              <a href={getMailtoBanco(group)} title="Enviar a Banco Cuscatlán" onClick={e => { e.stopPropagation(); alert('Recuerda adjuntar el archivo PDF en tu correo antes de enviarlo.'); }} className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid #8b5cf6', color: '#8b5cf6' }}>
                                                <Mail size={16} />
                                              </a>
                                              <a href={getMailtoRREE(group)} title="Enviar a Relaciones Exteriores" onClick={e => { e.stopPropagation(); alert('Recuerda adjuntar el archivo PDF en tu correo antes de enviarlo.'); }} className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid #ec4899', color: '#ec4899' }}>
                                                <Mail size={16} />
                                              </a>
                                            </>
                                          )}

                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

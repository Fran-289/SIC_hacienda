'use client';

import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { format } from 'date-fns';
import { Search, Pencil, Trash2, X, AlertTriangle, Printer, FileSpreadsheet, FileText, Lock, ArrowUp, ArrowDown, ArrowUpDown, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import RegistrarIngresoButton from './RegistrarIngresoButton';
import { exportRecordsToExcel, exportSingleRecordToExcel } from '@/lib/utils/exportUtils';
import { statusLabel } from '@/lib/utils/status';
import { formatDateOnly, formatDateOnlyISO } from '@/lib/utils/dateUtils';
import { apiFetch } from '@/lib/client/api';

type RecordType = {
  id: number;
  depositDate: Date;
  depositAmount: number;
  concentrationDate: Date | null;
  days: number | null;
  region: string | null;
  country: string | null;
  location: string | null;
  passportValue: number;
  duiValue: number;
  consularValue: number;
  commissionValue: number;
  status: string;
  deletedAt: Date | null;
  deleteReason: string | null;
  informeCaja?: { status: string } | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { name: string } | null;
  updatedBy?: { name: string } | null;
};

type ConsulateType = {
  id: number;
  type: string;
  region: string;
  country: string;
  location: string;
};

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const SortIcon = ({ columnKey, sortConfig }: { columnKey: string; sortConfig: SortConfig }) => {
  if (sortConfig?.key !== columnKey) return <ArrowUpDown size={12} color="var(--text-muted)" style={{ marginLeft: 4, opacity: 0.5 }} />;
  return sortConfig.direction === 'asc' ? <ArrowUp size={12} style={{ marginLeft: 4, color: 'var(--accent-primary)' }} /> : <ArrowDown size={12} style={{ marginLeft: 4, color: 'var(--accent-primary)' }} />;
};

export default function ClientIngresosTable({ 
  initialRecords, 
  statuses,
  consulates
}: { 
  initialRecords: RecordType[];
  statuses: string[];
  consulates: ConsulateType[];
}) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  
  // Header Filters (Top section)
  const [dateFilterType, setDateFilterType] = useState<'depositDate' | 'concentrationDate'>('depositDate');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [procedenciaFilter, setProcedenciaFilter] = useState('');
  const [montoDepositoFilter, setMontoDepositoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Column Filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalDelete, setModalDelete] = useState<{dbId: number, displayId: string} | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const getProcedencia = (r: RecordType | ConsulateType) => {
    if (!r.location) return 'NO IDENTIFICADA';
    const parts = [];
    if (r.region) parts.push(r.region);
    if (r.country) parts.push(r.country);
    parts.push(r.location);
    return parts.join(', ');
  };

  // Unique procedencias for the dropdown
  const procedencias = useMemo(() => {
    const list = new Set(consulates.map(c => getProcedencia(c)));
    return Array.from(list).sort();
  }, [consulates]);

  // Handle Filtering
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Top Header Filters
      if (dateFrom && dateTo) {
        const rawDate = dateFilterType === 'depositDate' ? r.depositDate : r.concentrationDate;
        if (!rawDate) return false;
        const iso = formatDateOnlyISO(rawDate);
        if (!iso || iso < dateFrom || iso > dateTo) return false;
      }

      if (procedenciaFilter) {
        const proc = getProcedencia(r);
        if (proc !== procedenciaFilter) return false;
      }

      if (montoDepositoFilter) {
        if (r.depositAmount.toString() !== montoDepositoFilter) return false;
      }

      if (estadoFilter) {
        if (r.status !== estadoFilter) return false;
      }

      // 2. Column Filters
      for (const [key, value] of Object.entries(columnFilters)) {
        if (!value) continue;
        const searchVal = value.toLowerCase();
        
        let cellVal = '';
        switch(key) {
          case 'id': cellVal = String(r.id).padStart(2, '0'); break;
          case 'fechaIngreso': cellVal = formatDateOnly(r.depositDate); break;
          case 'montoDeposito': cellVal = r.depositAmount.toFixed(2); break;
          case 'fechaConcentracion': cellVal = formatDateOnly(r.concentrationDate); break;
          case 'diasConcentracion': cellVal = r.days?.toString() || ''; break;
          case 'procedencia': cellVal = getProcedencia(r); break;
          case 'totalIngresos': cellVal = r.depositAmount.toFixed(2); break;
          case 'pasaporte': cellVal = r.passportValue.toFixed(2); break;
          case 'dui': cellVal = r.duiValue.toFixed(2); break;
          case 'consular': cellVal = r.consularValue.toFixed(2); break;
          case 'comision': cellVal = r.commissionValue.toFixed(2); break;
          case 'estado': cellVal = r.status; break;
          case 'usuarioRegistra': cellVal = r.createdBy?.name || ''; break;
          case 'fechaRegistro': cellVal = format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm'); break;
          case 'usuarioModifica': cellVal = r.updatedBy?.name || ''; break;
          case 'fechaModifica': cellVal = format(new Date(r.updatedAt), 'dd/MM/yyyy HH:mm'); break;
        }

        if (!cellVal.toLowerCase().includes(searchVal)) return false;
      }

      return true;
    });
  }, [records, dateFilterType, dateFrom, dateTo, procedenciaFilter, montoDepositoFilter, estadoFilter, columnFilters]);

  // Handle Sorting
  const sortedRecords = useMemo(() => {
    const sortable = [...filteredRecords];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        
        switch(sortConfig.key) {
          case 'id': aVal = a.id; bVal = b.id; break;
          case 'fechaIngreso': aVal = new Date(a.depositDate).getTime(); bVal = new Date(b.depositDate).getTime(); break;
          case 'montoDeposito': aVal = a.depositAmount; bVal = b.depositAmount; break;
          case 'fechaConcentracion': aVal = a.concentrationDate ? new Date(a.concentrationDate).getTime() : 0; bVal = b.concentrationDate ? new Date(b.concentrationDate).getTime() : 0; break;
          case 'diasConcentracion': aVal = a.days || 0; bVal = b.days || 0; break;
          case 'procedencia': aVal = getProcedencia(a); bVal = getProcedencia(b); break;
          case 'totalIngresos': aVal = a.depositAmount; bVal = b.depositAmount; break;
          case 'pasaporte': aVal = a.passportValue; bVal = b.passportValue; break;
          case 'dui': aVal = a.duiValue; bVal = b.duiValue; break;
          case 'consular': aVal = a.consularValue; bVal = b.consularValue; break;
          case 'comision': aVal = a.commissionValue; bVal = b.commissionValue; break;
          case 'estado': aVal = a.status; bVal = b.status; break;
          case 'usuarioRegistra': aVal = a.createdBy?.name || ''; bVal = b.createdBy?.name || ''; break;
          case 'fechaRegistro': aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); break;
          case 'usuarioModifica': aVal = a.updatedBy?.name || ''; bVal = b.updatedBy?.name || ''; break;
          case 'fechaModifica': aVal = new Date(a.updatedAt).getTime(); bVal = new Date(b.updatedAt).getTime(); break;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Por defecto orden descendente por fecha de ingresos (Regla 1)
      sortable.sort((a, b) => new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime());
    }
    return sortable;
  }, [filteredRecords, sortConfig]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFilterType, dateFrom, dateTo, procedenciaFilter, montoDepositoFilter, estadoFilter, columnFilters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const confirmDelete = async () => {
    if (!modalDelete) return;
    setDeletingId(modalDelete.dbId);
    try {
      const res = await apiFetch(`/api/ingresos/${modalDelete.dbId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason })
      });
      if (res.ok) {
        setRecords(prev => prev.map(r => r.id === modalDelete.dbId ? { ...r, deletedAt: new Date(), deleteReason } : r));
      } else {
        const errorData = await res.json();
        alert(`Error al eliminar: ${errorData.details || errorData.error || ''}`);
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setDeletingId(null);
      setModalDelete(null);
      setDeleteReason('');
    }
  };

  return (
    <div className="animate-fade-in" style={{ fontSize: '0.8rem' }}>
      
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Bandeja de Ingresos Consulares
        </h2>
      </div>

      {/* Header Filters - Prototipo 2 */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            
            {/* Fechas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 500 }}>Del:</span>
                <input type="date" className="input-control" style={{ marginBottom: 0, padding: '0.3rem' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span style={{ fontWeight: 500 }}>Al:</span>
                <input type="date" className="input-control" style={{ marginBottom: 0, padding: '0.3rem' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.3rem 0.75rem', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                  <input type="radio" name="dateType" checked={dateFilterType === 'depositDate'} onChange={() => setDateFilterType('depositDate')} />
                  Fecha Depósito
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                  <input type="radio" name="dateType" checked={dateFilterType === 'concentrationDate'} onChange={() => setDateFilterType('concentrationDate')} />
                  Fecha Concentración
                </label>
              </div>
            </div>

            {/* Selectores */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 500 }}>Procedencia:</span>
                <input 
                  type="text"
                  list="procedencias-list"
                  placeholder="Escriba para buscar..."
                  className="input-control" 
                  style={{ marginBottom: 0, padding: '0.3rem', width: '220px' }} 
                  value={procedenciaFilter} 
                  onChange={e => setProcedenciaFilter(e.target.value)}
                />
                <datalist id="procedencias-list">
                  {procedencias.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 500 }}>Monto Depósito:</span>
                <input type="number" className="input-control" style={{ marginBottom: 0, padding: '0.3rem', width: '100px' }} value={montoDepositoFilter} onChange={e => setMontoDepositoFilter(e.target.value)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 500 }}>Estado:</span>
                <select className="input-control" style={{ marginBottom: 0, padding: '0.3rem' }} value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
                  <option value=""></option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <button className="btn btn-secondary" style={{ padding: '0.3rem 1rem' }} onClick={() => { setDateFrom(''); setDateTo(''); setProcedenciaFilter(''); setMontoDepositoFilter(''); setEstadoFilter(''); setColumnFilters({}); }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <RegistrarIngresoButton />
        <button 
          className="btn btn-secondary" 
          onClick={() => exportRecordsToExcel(sortedRecords, `ingresos_consulares_${format(new Date(), 'ddMMyyyy_HHmm')}`)}
          title="Descargar lista de ingresos actual a Excel"
        >
          <Download size={16} /> Descargar Lista (Excel)
        </button>
      </div>

      {/* Grid */}
      <div className="glass-panel" style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: 'max-content', borderCollapse: 'collapse', textAlign: 'left', minWidth: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', textTransform: 'none' }}>
              <th style={{ padding: '0.5rem', fontWeight: 600, width: '40px', minWidth: '40px', textAlign: 'center', borderRight: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('id')}>
                    ID
                    <SortIcon columnKey={'id'} sortConfig={sortConfig} />
                  </div>
                  <input 
                    type="text" 
                    className="input-control" 
                    style={{ padding: '0.2rem', marginBottom: 0, fontSize: '0.75rem', height: '24px' }} 
                    value={columnFilters['id'] || ''}
                    onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                  />
                </div>
              </th>
              
              {/* Columnas */}
              {[
                { key: 'fechaIngreso', label: 'Fecha Depósito', align: 'center', minWidth: '140px' },
                { key: 'fechaConcentracion', label: 'Fecha Concentración', align: 'center', minWidth: '180px' },
                { key: 'montoDeposito', label: 'Depósito', align: 'center', minWidth: '110px' },
                { key: 'diasConcentracion', label: 'Días', align: 'center', minWidth: '90px' },
                { key: 'procedencia', label: 'Embajada/Consulado', align: 'left', minWidth: '200px' },
                { key: 'totalIngresos', label: 'Ingreso', align: 'center', minWidth: '110px' },
                { key: 'pasaporte', label: 'Pasaporte', align: 'center', minWidth: '110px' },
                { key: 'dui', label: 'DUI', align: 'center', minWidth: '100px' },
                { key: 'consular', label: 'Consular', align: 'center', minWidth: '110px' },
                { key: 'comision', label: 'Comisión', align: 'center', minWidth: '110px' },
                { key: 'estado', label: 'Estado', align: 'left', minWidth: '150px' },
                { key: 'usuarioRegistra', label: 'Ingresado Por', align: 'left', minWidth: '150px' },
                { key: 'fechaRegistro', label: 'Fecha de ingreso', align: 'center', minWidth: '150px' },
              ].map(col => (
                <th key={col.key} style={{ padding: '0.5rem', fontWeight: 600, minWidth: col.minWidth, width: col.minWidth, borderRight: '1px solid var(--border-color)', textAlign: col.align as CSSProperties['textAlign'], whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start'), cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort(col.key)}>
                      {col.label}
                      <SortIcon columnKey={col.key} sortConfig={sortConfig} />
                    </div>
                    <input 
                      type="text" 
                      className="input-control" 
                      style={{ padding: '0.2rem', marginBottom: 0, fontSize: '0.75rem', height: '24px', textAlign: col.align as CSSProperties['textAlign'] }} 
                      value={columnFilters[col.key] || ''}
                      onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                    />
                  </div>
                </th>
              ))}
              
              <th style={{ padding: '0.5rem', fontWeight: 600, minWidth: '90px', textAlign: 'center', borderRight: '1px solid var(--border-color)', position: 'sticky', right: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10, boxShadow: '-2px 0 5px rgba(0,0,0,0.05)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron registros.
                </td>
              </tr>
            ) : (
              paginatedRecords.map(r => {
                const isLocked = r.informeCaja?.status === 'DEFINITIVO';
                return (
                  <tr 
                    key={r.id} 
                    className={r.deletedAt ? '' : 'table-row-hover'} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)', 
                      opacity: r.deletedAt ? 0.6 : 1,
                      backgroundColor: r.deletedAt ? 'rgba(239, 68, 68, 0.03)' : (isLocked ? 'rgba(234, 179, 8, 0.02)' : 'transparent'),
                    }}
                  >
                    {/* ID */}
                    <td style={{ padding: '0.5rem', width: '40px', color: 'var(--text-muted)', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                        {isLocked && (
                          <span title="Bloqueado por Informe Definitivo" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
                            <Lock size={12} color="#eab308" />
                          </span>
                        )}
                        {r.id}
                      </div>
                    </td>

                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>{formatDateOnly(r.depositDate)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>{formatDateOnly(r.concentrationDate)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>${r.depositAmount.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>{r.days ?? ''}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'left', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>{getProcedencia(r)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-primary)', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>${(r.passportValue + r.duiValue + r.consularValue + r.commissionValue).toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>${r.passportValue.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>{r.duiValue > 0 ? `$${r.duiValue.toFixed(2)}` : '$ -'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>{r.consularValue > 0 ? `$${r.consularValue.toFixed(2)}` : '$ -'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', borderRight: '1px solid var(--border-color)' }}>{r.commissionValue > 0 ? `$${r.commissionValue.toFixed(2)}` : '$ -'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>
                      {r.deletedAt ? (
                        <span style={{ color: 'var(--danger)' }}>ANULADO</span>
                      ) : (
                        <span>{statusLabel(r.status)}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'left', textDecoration: r.deletedAt ? 'line-through' : 'none', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>{r.createdBy?.name || ''}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textDecoration: r.deletedAt ? 'line-through' : 'none', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>{format(new Date(r.createdAt), 'dd/MM/yyyy')}</td>
                    
                    {/* Acciones */}
                    <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid var(--border-color)', position: 'sticky', right: 0, backgroundColor: r.deletedAt ? 'var(--bg-primary)' : 'var(--bg-primary)', zIndex: 5, boxShadow: '-2px 0 5px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem' }} title="Descargar Excel" onClick={() => exportSingleRecordToExcel(r, `ingreso_${String(r.id).padStart(2, '0')}_${format(new Date(), 'ddMMyyyy')}`)}>
                          <Download size={12} color="var(--accent-primary)" />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem' }} title="Ver" onClick={() => router.push(`/ingresos/${r.id}/ver`)}>
                          <Eye size={12} color="var(--text-secondary)" />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem' }} title={isLocked ? "Bloqueado" : "Editar"} disabled={!!r.deletedAt || isLocked} onClick={() => router.push(`/ingresos/${r.id}/editar`)}>
                          <Pencil size={12} color={r.deletedAt || isLocked ? "var(--text-muted)" : "var(--text-secondary)"} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem' }} title={isLocked ? "Bloqueado" : "Eliminar"} disabled={!!r.deletedAt || isLocked} onClick={() => setModalDelete({ dbId: r.id, displayId: String(r.id).padStart(2, '0') })}>
                          <Trash2 size={12} color={r.deletedAt || isLocked ? "var(--text-muted)" : "var(--danger)"} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Paginación real */}
        <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>
              Mostrando {sortedRecords.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, sortedRecords.length)} de {sortedRecords.length}
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Por página:</span>
              <select 
                value={pageSize} 
                onChange={e => setPageSize(Number(e.target.value))}
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.4rem', outline: 'none' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ padding: '0 0.5rem' }}>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {modalDelete !== null && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button 
              onClick={() => setModalDelete(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '50%' }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>¿Eliminar registro?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                ¿Está seguro de anular este registro? Ingrese el motivo.
              </p>
              
              <textarea
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', resize: 'none', minHeight: '80px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                placeholder="Motivo (Ej. Error de digitación, duplicado...)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
              
              <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                <button onClick={() => { setModalDelete(null); setDeleteReason(''); }} className="btn" style={{ flex: 1, backgroundColor: '#fee2e2', color: '#991b1b' }}>Cancelar</button>
                <button onClick={confirmDelete} className="btn btn-primary" style={{ flex: 1, backgroundColor: '#991b1b' }} disabled={deletingId === modalDelete.dbId || !deleteReason.trim()}>
                  {deletingId === modalDelete.dbId ? 'Eliminando...' : 'Anular Registro'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

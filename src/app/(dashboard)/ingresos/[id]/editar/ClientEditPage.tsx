'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Building2, Calendar, DollarSign, ArrowLeft, Clock, CheckCircle, Wallet } from 'lucide-react';
import Link from 'next/link';
import { calculateBusinessDays } from '@/lib/utils/dateUtils';

type Consulate = { id: number; type: string; region: string; country: string; location: string; address: string | null };

export default function ClientEditPage({ initialData, readOnly = false }: { initialData: any, readOnly?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const estados = [
    'No identificado',
    'Identificado no distribuido',
    'Identificado distribuido',
  ];

  const [consulates, setConsulates] = useState<Consulate[]>([]);
  const [procedenciaId, setProcedenciaId] = useState('');
  const [procedenciaRegion, setProcedenciaRegion] = useState('');
  const [procedenciaCountrySearch, setProcedenciaCountrySearch] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const [formData, setFormData] = useState({
    status: initialData.status || estados[0],
    depositDate: initialData.depositDate ? new Date(initialData.depositDate).toISOString().split('T')[0] : '',
    depositAmount: initialData.depositAmount ? initialData.depositAmount.toString() : '',
    concentrationDate: initialData.concentrationDate ? new Date(initialData.concentrationDate).toISOString().split('T')[0] : '',
    concentrationDays: initialData.days ? initialData.days.toString() : '',
    passportValue: initialData.passportValue ? initialData.passportValue.toString() : '',
    duiValue: initialData.duiValue ? initialData.duiValue.toString() : '',
    consularValue: initialData.consularValue ? initialData.consularValue.toString() : '',
    commissionValue: initialData.commissionValue ? initialData.commissionValue.toString() : '',
    totalIngresosValue: initialData.depositAmount && initialData.commissionValue !== undefined ? (initialData.depositAmount - initialData.commissionValue).toFixed(2).toString() : '',
  });

  useEffect(() => {
    fetch('/api/catalogos/procedencias')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setConsulates(data);
          
          if (initialData.region) setProcedenciaRegion(initialData.region);
          if (initialData.country) setProcedenciaCountrySearch(initialData.country);
          if (initialData.region && initialData.country) {
            const match = data.find((c: Consulate) => 
               c.region === initialData.region && 
               c.country === initialData.country && 
               c.location === initialData.location
            );
            if (match) {
              setProcedenciaId(match.id.toString());
            }
          }
        }
      })
      .catch(console.error);
  }, [initialData]);

  // Calculate days automatically
  useEffect(() => {
    if (formData.depositDate && formData.concentrationDate) {
      const diffDays = calculateBusinessDays(formData.depositDate, formData.concentrationDate);
      setFormData(prev => ({ ...prev, concentrationDays: diffDays.toString() }));
    } else {
      setFormData(prev => ({ ...prev, concentrationDays: '' }));
    }
  }, [formData.depositDate, formData.concentrationDate]);

  const formatCurrency = (value: string) => {
    const numericStr = value.replace(/[^0-9.]/g, '');
    if (!numericStr) return '';
    const parts = numericStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : '';
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInteger + decimalPart;
  };

  const handleChangeCurrency = (field: string, value: string) => {
    setFormData({ ...formData, [field]: formatCurrency(value) });
  };

  const calculateCommission = () => {
    const deposit = parseFloat(formData.depositAmount.replace(/,/g, '')) || 0;
    const totalIngreso = parseFloat(formData.totalIngresosValue.replace(/,/g, '')) || 0;
    return (deposit - totalIngreso).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.concentrationDate) {
      setError('El campo Fecha de Concentración es obligatorio.');
      setLoading(false);
      return;
    }
    if (!formData.depositAmount) {
      setError('El campo Valor Depósito es obligatorio.');
      setLoading(false);
      return;
    }
    if (formData.status !== 'No identificado' && !procedenciaId) {
      setError('El campo Procedencia es obligatorio para este estado.');
      setLoading(false);
      return;
    }

    const deposit = parseFloat(formData.depositAmount.replace(/,/g, '')) || 0;
    const passport = parseFloat(formData.passportValue.replace(/,/g, '')) || 0;
    const dui = parseFloat(formData.duiValue.replace(/,/g, '')) || 0;
    const consular = parseFloat(formData.consularValue.replace(/,/g, '')) || 0;
    const commission = parseFloat(calculateCommission()) || 0;
    const days = parseInt(formData.concentrationDays) || 0;

    let region = null, country = null, location = null;
    if (formData.status !== 'No identificado' && procedenciaId) {
      const selected = consulates.find(c => c.id === parseInt(procedenciaId));
      if (selected) {
        region = selected.region;
        country = selected.country;
        location = selected.location;
      }
    }

    try {
      const res = await fetch(`/api/ingresos/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          depositDate: formData.depositDate,
          depositAmount: deposit,
          concentrationDate: formData.concentrationDate,
          days: days,
          region,
          country,
          location,
          passportValue: formData.status === 'Identificado distribuido' ? passport : 0,
          duiValue: formData.status === 'Identificado distribuido' ? dui : 0,
          consularValue: formData.status === 'Identificado distribuido' ? consular : 0,
          diversosValue: 0,
          commissionValue: formData.status === 'Identificado distribuido' ? commission : 0,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar el ingreso');
      
      router.push('/ingresos');
      router.refresh();
    } catch (err) {
      setError('Ocurrió un error al intentar registrar el ingreso.');
      setLoading(false);
    }
  };

  const regions = useMemo(() => Array.from(new Set(consulates.map(c => c.region))), [consulates]);
  
  const filteredCountries = useMemo(() => {
    let list = consulates;
    if (procedenciaRegion) list = list.filter(c => c.region === procedenciaRegion);
    const countryNames = Array.from(new Set(list.map(c => c.country)));
    return countryNames.filter(c => c.toLowerCase().includes((procedenciaCountrySearch || '').toLowerCase()));
  }, [consulates, procedenciaRegion, procedenciaCountrySearch]);

  const availableLocations = useMemo(() => {
    let list = consulates;
    if (procedenciaRegion) list = list.filter(c => c.region === procedenciaRegion);
    if (procedenciaCountrySearch) list = list.filter(c => c.country === procedenciaCountrySearch);
    return list;
  }, [consulates, procedenciaRegion, procedenciaCountrySearch]);

  const Asterisk = () => <span style={{ color: 'red', cursor: 'help', marginLeft: '0.25rem' }} title="Campo obligatorio">*</span>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <Link href="/ingresos" className="btn btn-secondary" style={{ padding: '0.75rem', borderRadius: '50%' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Departamento de Ingresos, Colecturías de Aduanas - Ministerio de Hacienda
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {readOnly ? 'Detalles del abono bancario según el reporte de aduana' : 'Ingresa los detalles del abono bancario según el reporte de aduana'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {readOnly ? 'Detalle de Ingreso Consular' : 'Editar Ingreso Consular'} {String(initialData.id).padStart(2, '0')}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>ID:</legend>
                <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-muted)', padding: '0.25rem 0' }} value={String(initialData.id).padStart(2, '0')} readOnly disabled />
              </fieldset>
              
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Ingresado Por:</legend>
                <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} value={initialData.createdBy?.name || '-'} readOnly disabled />
              </fieldset>
            </div>

            <fieldset style={{ border: '2px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem 0.75rem', margin: 0, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
              <legend style={{ fontSize: '1rem', color: 'var(--accent-primary)', padding: '0 0.5rem', fontWeight: 600 }}>Estado:<Asterisk /></legend>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }}>
                  <CheckCircle size={22} />
                </div>
                <select 
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto', fontSize: '1.1rem', fontWeight: 500 }}
                  value={formData.status}
                  disabled={readOnly}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  {estados.map((e, idx) => (
                    <option key={idx} value={e} style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)' }}>{e}</option>
                  ))}
                </select>
              </div>
            </fieldset>
            
            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
              <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Cuenta Bancaria:</legend>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  <Building2 size={18} />
                </div>
                <select disabled style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-muted)', padding: '0.25rem 0', appearance: 'none' }}>
                  <option>00110052251 - INGRESOS CONSULARES</option>
                </select>
              </div>
            </fieldset>

            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
              <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Fecha Depósito:<Asterisk /></legend>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  <Calendar size={18} />
                </div>
                <input 
                  type="date" 
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} 
                  required
                  disabled={readOnly}
                  value={formData.depositDate}
                  onChange={(e) => setFormData({...formData, depositDate: e.target.value})}
                />
              </div>
            </fieldset>

            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
              <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor Depósito:<Asterisk /></legend>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  <DollarSign size={18} />
                </div>
                <input 
                  type="text"
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} 
                  placeholder="0.00"
                  required
                  disabled={readOnly}
                  value={formData.depositAmount}
                  onChange={(e) => handleChangeCurrency('depositAmount', e.target.value)}
                />
              </div>
            </fieldset>

            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
              <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Fecha Concentración BCR:<Asterisk /></legend>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  <Calendar size={18} />
                </div>
                <input 
                  type="date" 
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }}
                  required
                  disabled={readOnly}
                  value={formData.concentrationDate}
                  onChange={(e) => setFormData({...formData, concentrationDate: e.target.value})}
                />
              </div>
            </fieldset>

            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
              <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Días Concentración:</legend>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  <Clock size={18} />
                </div>
                <input 
                  type="text"
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} 
                  value={formData.concentrationDays}
                  readOnly
                  disabled
                />
              </div>
            </fieldset>

            {formData.status !== 'No identificado' && (
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Procedencia:<Asterisk /></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  
                  {/* Region */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Región</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                      <select 
                        disabled={readOnly}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }}
                        value={procedenciaRegion}
                        onChange={(e) => {
                          setProcedenciaRegion(e.target.value);
                          setProcedenciaCountrySearch('');
                          setProcedenciaId('');
                        }}
                      >
                        <option value="">Seleccione Región</option>
                        {regions.map((r, i) => <option key={i} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Pais */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>País</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                      <input 
                        disabled={readOnly}
                        type="text"
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }}
                        placeholder="Buscar País..."
                        value={procedenciaCountrySearch}
                        onFocus={() => { if(!readOnly) setIsCountryOpen(true); }}
                        onBlur={() => setTimeout(() => setIsCountryOpen(false), 200)}
                        onChange={(e) => {
                          setProcedenciaCountrySearch(e.target.value);
                          setProcedenciaId('');
                          setIsCountryOpen(true);
                        }}
                      />
                    </div>
                    {isCountryOpen && !readOnly && (
                      <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, 
                        maxHeight: '200px', overflowY: 'auto', 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                        zIndex: 50, marginTop: '0.25rem' 
                      }}>
                        {filteredCountries.length > 0 ? filteredCountries.map((c, i) => (
                          <div 
                            key={i} 
                            style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            onMouseDown={() => {
                              setProcedenciaCountrySearch(c);
                              setProcedenciaId('');
                              setIsCountryOpen(false);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {c}
                          </div>
                        )) : (
                          <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>No se encontraron resultados</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Embajada/Consulado */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Embajada/Consulado</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                      <select 
                        disabled={readOnly}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }}
                        value={procedenciaId}
                        onChange={(e) => setProcedenciaId(e.target.value)}
                      >
                        <option value="">Seleccione Sede</option>
                        {availableLocations.map(c => (
                          <option key={c.id} value={c.id.toString()}>{c.type === 'Sede Central' ? c.type : `${c.type} - ${c.location}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>
              </fieldset>
            )}

            {formData.status === 'Identificado distribuido' && (
              <>
                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Total Ingresos:</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <Wallet size={18} />
                    </div>
                    <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', fontWeight: 'bold' }} placeholder="0.00" value={formData.totalIngresosValue} onChange={(e) => handleChangeCurrency('totalIngresosValue', e.target.value)} />
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor Pasaporte:</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <DollarSign size={18} />
                    </div>
                    <input disabled={readOnly} type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} placeholder="0.00" value={formData.passportValue} onChange={(e) => handleChangeCurrency('passportValue', e.target.value)} />
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor DUI:</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <DollarSign size={18} />
                    </div>
                    <input disabled={readOnly} type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} placeholder="0.00" value={formData.duiValue} onChange={(e) => handleChangeCurrency('duiValue', e.target.value)} />
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor Consular:</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <DollarSign size={18} />
                    </div>
                    <input disabled={readOnly} type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} placeholder="0.00" value={formData.consularValue} onChange={(e) => handleChangeCurrency('consularValue', e.target.value)} />
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor Comisión (Calculado):</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <DollarSign size={18} />
                    </div>
                    <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', fontWeight: 'bold' }} value={`$${formatCurrency(calculateCommission())}`} readOnly disabled />
                  </div>
                </fieldset>
              </>
            )}

          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <Link href="/ingresos" className="btn btn-secondary">
              <X size={16} />
              {readOnly ? 'Volver' : 'Cerrar'}
            </Link>
            {!readOnly && (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={16} />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Building2, Calendar, DollarSign, ArrowLeft, Clock, CheckCircle, Wallet } from 'lucide-react';
import Link from 'next/link';
import { calculateBusinessDays, todayLocalISO } from '@/lib/utils/dateUtils';
import { RECORD_STATUSES, STATUS_LABELS } from '@/lib/utils/status';
import { apiFetch } from '@/lib/client/api';

type Consulate = { id: number; type: string; region: string; country: string; location: string; address: string | null };

type ProfileUser = {
  id?: number;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

const Asterisk = () => <span style={{ color: 'red', cursor: 'help', marginLeft: '0.25rem' }} title="Campo obligatorio">*</span>;

export default function NuevoIngresoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const estados = RECORD_STATUSES;

  const [formData, setFormData] = useState({
    status: RECORD_STATUSES[0] as string,
    depositDate: todayLocalISO(),
    depositAmount: '',
    concentrationDate: '',
    concentrationDays: '',
    procedenciaId: '',
    procedenciaRegion: '',
    procedenciaCountrySearch: '',
    totalIngresosValue: '',
    passportValue: '',
    duiValue: '',
    consularValue: '',
    commissionValue: '',
  });

  const [consulates, setConsulates] = useState<Consulate[]>([]);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);

  useEffect(() => {
    apiFetch('/api/users/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(console.error);
    apiFetch('/api/catalogos/procedencias')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConsulates(data);
      })
      .catch(console.error);
  }, []);

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
    if (formData.status !== 'NO IDENTIFICADO' && !formData.procedenciaId) {
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
    if (formData.status !== 'NO IDENTIFICADO' && formData.procedenciaId) {
      const selected = consulates.find(c => c.id === parseInt(formData.procedenciaId));
      if (selected) {
        region = selected.region;
        country = selected.country;
        location = selected.location;
      }
    }

    try {
      const res = await apiFetch('/api/ingresos', {
        method: 'POST',
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
          passportValue: formData.status === 'IDENTIFICADO DISTRIBUIDO' ? passport : 0,
          duiValue: formData.status === 'IDENTIFICADO DISTRIBUIDO' ? dui : 0,
          consularValue: formData.status === 'IDENTIFICADO DISTRIBUIDO' ? consular : 0,
          diversosValue: 0,
          commissionValue: formData.status === 'IDENTIFICADO DISTRIBUIDO' ? commission : 0,
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
    if (formData.procedenciaRegion) list = list.filter(c => c.region === formData.procedenciaRegion);
    const countryNames = Array.from(new Set(list.map(c => c.country)));
    return countryNames.filter(c => c.toLowerCase().includes((formData.procedenciaCountrySearch || '').toLowerCase()));
  }, [consulates, formData.procedenciaRegion, formData.procedenciaCountrySearch]);

  const availableLocations = useMemo(() => {
    let list = consulates;
    if (formData.procedenciaRegion) list = list.filter(c => c.region === formData.procedenciaRegion);
    if (formData.procedenciaCountrySearch) list = list.filter(c => c.country === formData.procedenciaCountrySearch);
    return list;
  }, [consulates, formData.procedenciaRegion, formData.procedenciaCountrySearch]);

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
            Registrar Ingreso Consular
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
            Registrar Ingreso Consular
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>ID:</legend>
                <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-muted)', padding: '0.25rem 0' }} value="Automático" readOnly disabled />
              </fieldset>
              
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0, backgroundColor: 'var(--bg-tertiary)' }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Ingresado Por:</legend>
                <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} value={currentUser?.name || 'Cargando...'} readOnly disabled />
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
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  {estados.map((e, idx) => (
                    <option key={idx} value={e} style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)' }}>{STATUS_LABELS[e]}</option>
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

            {formData.status !== 'NO IDENTIFICADO' && (
              <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Procedencia:<Asterisk /></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  
                  {/* Region */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Región</label>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                      <select 
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }}
                        value={formData.procedenciaRegion}
                        onChange={(e) => {
                          setFormData({...formData, procedenciaRegion: e.target.value, procedenciaCountrySearch: '', procedenciaId: ''});
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
                        type="text"
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }}
                        placeholder="Buscar País..."
                        value={formData.procedenciaCountrySearch}
                        onFocus={() => setIsCountryOpen(true)}
                        onBlur={() => setTimeout(() => setIsCountryOpen(false), 200)}
                        onChange={(e) => {
                          setFormData({...formData, procedenciaCountrySearch: e.target.value, procedenciaId: ''});
                          setIsCountryOpen(true);
                        }}
                      />
                    </div>
                    {isCountryOpen && (
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
                              setFormData({...formData, procedenciaCountrySearch: c, procedenciaId: ''});
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
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0', appearance: 'auto' }}
                        value={formData.procedenciaId}
                        onChange={(e) => setFormData({...formData, procedenciaId: e.target.value})}
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

            {formData.status === 'IDENTIFICADO DISTRIBUIDO' && (
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
                    <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} placeholder="0.00" value={formData.passportValue} onChange={(e) => handleChangeCurrency('passportValue', e.target.value)} />
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor DUI:</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <DollarSign size={18} />
                    </div>
                    <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} placeholder="0.00" value={formData.duiValue} onChange={(e) => handleChangeCurrency('duiValue', e.target.value)} />
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem 0.75rem 0.5rem', margin: 0 }}>
                  <legend style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.25rem', fontWeight: 500 }}>Valor Consular:</legend>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                      <DollarSign size={18} />
                    </div>
                    <input type="text" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.25rem 0' }} placeholder="0.00" value={formData.consularValue} onChange={(e) => handleChangeCurrency('consularValue', e.target.value)} />
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
              Cerrar
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

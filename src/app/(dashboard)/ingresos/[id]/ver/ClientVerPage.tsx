'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, MapPin, Calendar, DollarSign, ArrowLeft, Building2, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClientVerPage({ initialData }: { initialData: any }) {
  const router = useRouter();

  const getProcedenciaText = () => {
    if (!initialData.location) return 'NO IDENTIFICADO';
    const parts = [];
    if (initialData.region) parts.push(initialData.region);
    if (initialData.country) parts.push(initialData.country);
    if (initialData.location) parts.push(initialData.location);
    return parts.join(', ');
  };

  const totalIngresos = (
    Number(initialData.passportValue || 0) +
    Number(initialData.duiValue || 0) +
    Number(initialData.consularValue || 0) +
    Number(initialData.commissionValue || 0) +
    Number(initialData.diversosValue || 0)
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => router.back()} 
          className="btn btn-secondary"
          style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Detalle de Ingreso Consular #{String(initialData.id).padStart(2, '0')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Información del abono bancario según el reporte de aduana
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Encabezado Principal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Estado del Registro</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '1.25rem' }}>
              <CheckCircle size={24} />
              {initialData.status}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Ingresos RR EE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ${totalIngresos.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Sección 1: Datos Bancarios y Fechas */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="var(--accent-primary)" />
            Datos Bancarios y Fechas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Depósito</div>
              <div style={{ fontWeight: 500 }}>{format(new Date(initialData.depositDate), 'dd/MM/yyyy')}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Depósito</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>${Number(initialData.depositAmount).toFixed(2)}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Concentración</div>
              <div style={{ fontWeight: 500 }}>{initialData.concentrationDate ? format(new Date(initialData.concentrationDate), 'dd/MM/yyyy') : '-'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Días Concentración</div>
              <div style={{ fontWeight: 500 }}>{initialData.days ?? '-'} días</div>
            </div>

          </div>
        </div>

        {/* Sección 2: Procedencia */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="var(--accent-primary)" />
            Procedencia (Consulado)
          </h3>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {getProcedenciaText()}
            </div>
          </div>
        </div>

        {/* Sección 3: Desglose de Ingresos */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={18} color="var(--accent-primary)" />
            Desglose de Ingresos
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Pasaporte</div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <DollarSign size={14} color="var(--text-muted)" />
                {Number(initialData.passportValue || 0).toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor DUI</div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <DollarSign size={14} color="var(--text-muted)" />
                {Number(initialData.duiValue || 0).toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Consular</div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <DollarSign size={14} color="var(--text-muted)" />
                {Number(initialData.consularValue || 0).toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingreso Diverso</div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <DollarSign size={14} color="var(--text-muted)" />
                {Number(initialData.diversosValue || 0).toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Comisión</div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <DollarSign size={14} color="var(--text-muted)" />
                {Number(initialData.commissionValue || 0).toFixed(2)}
              </div>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
          <Link href="/ingresos" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Volver a la Bandeja
          </Link>
        </div>
      </div>
    </div>
  );
}

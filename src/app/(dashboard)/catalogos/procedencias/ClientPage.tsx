'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Building2, MapPin, Globe, Printer, FileSpreadsheet, FileText, Eye, X, Download, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiFetch } from '@/lib/client/api';

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type Consulate = {
  id: number;
  type: string;
  region: string;
  country: string;
  location: string;
  address: string | null;
  status: string;
  createdBy?: { name: string } | null;
  createdAt?: string;
  updatedAt: string;
};

export default function ClientPage({ initialConsulates, currentUserName }: { initialConsulates: Consulate[], currentUserName: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [consulates, setConsulates] = useState(initialConsulates);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewConsulate, setViewConsulate] = useState<Consulate | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    id: 0,
    type: 'CONSULADO',
    region: '',
    country: '',
    location: '',
    address: '',
    status: 'ACTIVO',
    createdAt: format(new Date(), 'yyyy-MM-dd')
  });

  const filteredConsulates = consulates.filter(c => 
    c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortConfig !== null) {
    filteredConsulates.sort((a, b) => {
      let aValue = a[sortConfig.key as keyof Consulate] as string | number | { name: string };
      let bValue = b[sortConfig.key as keyof Consulate] as string | number | { name: string };
      
      // Casos especiales para objetos anidados
      if (sortConfig.key === 'createdBy') {
        aValue = a.createdBy?.name || 'Sistema';
        bValue = b.createdBy?.name || 'Sistema';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} style={{ marginLeft: '4px', opacity: 0.3 }} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} style={{ marginLeft: '4px', color: 'var(--primary-color)' }} />;
    }
    return <ArrowDown size={14} style={{ marginLeft: '4px', color: 'var(--primary-color)' }} />;
  };

  const openEditModal = (c: Consulate) => {
    setFormData({
      id: c.id,
      type: c.type,
      region: c.region,
      country: c.country,
      location: c.location,
      address: c.address || '',
      status: c.status,
      createdAt: c.createdAt ? format(new Date(c.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Preparar payload, asegurando que createdAt incluya la hora actual para no resetear a 00:00:00 UTC si es posible
    const submissionData = { ...formData };
    
    try {
      if (showEditModal) {
        // Edit Mode
        const res = await apiFetch(`/api/catalogos/procedencias/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        });

        if (!res.ok) throw new Error('Error al actualizar');
        const updated = await res.json();
        
        // Mantener createdBy del original
        const original = consulates.find(c => c.id === formData.id);
        if (original) {
          updated.createdBy = original.createdBy;
        }

        setConsulates(prev => prev.map(c => c.id === formData.id ? updated : c));
        setShowEditModal(false);
      } else {
        // Add Mode
        const res = await apiFetch('/api/catalogos/procedencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        });

        if (!res.ok) throw new Error('Error al guardar');
        const newConsulate = await res.json();
        
        setConsulates(prev => [...prev, newConsulate]);
        setShowAddModal(false);
      }
      
      setFormData({ id: 0, type: 'CONSULADO', region: '', country: '', location: '', address: '', status: 'ACTIVO', createdAt: format(new Date(), 'yyyy-MM-dd') });
      router.refresh();
    } catch (err) {
      setError(showEditModal ? 'Ocurrió un error al actualizar el registro.' : 'Ocurrió un error al guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const generateLogoBase64 = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(75, 75, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MH', 75, 75);
    }
    return canvas.toDataURL('image/png');
  };

  const svgToPng = async (svgUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 150, 150);
        }
        try {
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(generateLogoBase64());
        }
      };
      img.onerror = () => resolve(generateLogoBase64());
      img.src = svgUrl;
    });
  };

  const getMetadata = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `Descargado por: Administrador | Fecha: ${day}/${month}/${year} | Hora: ${formattedHours}:${minutes} ${ampm}`;
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Directorio Consular');
    
    // Obtener logo
    const logoBase64 = await svgToPng("https://upload.wikimedia.org/wikipedia/commons/e/e6/Coat_of_arms_of_El_Salvador.svg");
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 60, height: 60 }
    });

    // Títulos corporativos
    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
    worksheet.getCell('A1').font = { size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:I2');
    worksheet.getCell('A2').value = 'DIRECCIÓN GENERAL DE TESORERÍA';
    worksheet.getCell('A2').font = { size: 12, bold: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:I3');
    worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS COLECTURÍA DE ADUANAS';
    worksheet.getCell('A3').font = { size: 11, bold: true };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A4:I4');
    worksheet.getCell('A4').value = 'REGISTROS CONSULARES Y EMBAJADAS';
    worksheet.getCell('A4').font = { size: 11, bold: true };
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    // Metadata
    worksheet.mergeCells('A5:I5');
    worksheet.getCell('A5').value = getMetadata();
    worksheet.getCell('A5').font = { size: 9, italic: true };
    worksheet.getCell('A5').alignment = { horizontal: 'right' };
    
    // Espaciado
    worksheet.addRow([]);

    // Cabecera de la tabla
    const headerRow = worksheet.addRow(['ID', 'TIPO', 'REGIÓN', 'PAÍS', 'UBICACIÓN', 'DIRECCIÓN', 'ESTADO', 'INGRESADO POR', 'FECHA DE MODIFICACIÓN']);
    headerRow.height = 30; // Hacer la celda azul más alta y grande
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Azul oscuro
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }; // Letra un poco más grande
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
    });

    // Filas de datos
    filteredConsulates.forEach((c, index) => {
      const row = worksheet.addRow([
        String(index + 1).padStart(2, '0'),
        c.type,
        c.region,
        c.country,
        c.location,
        c.address || 'N/A',
        c.status,
        c.createdBy?.name || 'Sistema',
        c.updatedAt ? format(new Date(c.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'
      ]);
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        if(cell.col === '1') cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
      });
    });

    // Anchos de columna
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 25;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 25;
    worksheet.getColumn(6).width = 40;
    worksheet.getColumn(7).width = 12;
    worksheet.getColumn(8).width = 20;
    worksheet.getColumn(9).width = 25;

    // Guardar
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Directorio_Consular.xlsx');
  };

  const exportToPDF = async () => {
    const doc = new jsPDF('landscape');
    
    // Obtener logo
    const logoBase64 = await svgToPng("https://upload.wikimedia.org/wikipedia/commons/e/e6/Coat_of_arms_of_El_Salvador.svg");
    doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);

    // Títulos corporativos
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("MINISTERIO DE HACIENDA", 148, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.text("DIRECCIÓN GENERAL DE TESORERÍA", 148, 22, { align: "center" });
    
    doc.setFontSize(11);
    doc.text("DEPARTAMENTO DE INGRESOS COLECTURÍA DE ADUANAS", 148, 28, { align: "center" });
    doc.text("REGISTROS CONSULARES Y EMBAJADAS", 148, 34, { align: "center" });
    
    // Metadata
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(getMetadata(), 280, 42, { align: "right" });

    // Tabla
    const tableData = filteredConsulates.map((c, index) => [
      String(index + 1).padStart(2, '0'),
      c.type,
      c.region,
      c.country,
      c.location,
      c.address || 'N/A',
      c.status,
      c.createdBy?.name || 'Sistema',
      c.updatedAt ? format(new Date(c.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'
    ]);

    autoTable(doc, {
      head: [['ID', 'TIPO', 'REGIÓN', 'PAÍS', 'UBICACIÓN', 'DIRECCIÓN', 'ESTADO', 'INGRESADO POR', 'FECHA DE MODIFICACIÓN']],
      body: tableData,
      startY: 46,
      theme: 'grid',
      styles: { 
        fontSize: 7,
        lineColor: [100, 100, 100], 
        lineWidth: 0.1,
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: [255,255,255], 
        fontStyle: 'bold',
        minCellHeight: 12,
        halign: 'center'
      }
    });

    doc.save("Directorio_Consular.pdf");
  };

  const printTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Directorio Consular - Impresión</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 18px; margin: 0 0 5px 0; }
            .header h2 { font-size: 16px; margin: 0 0 5px 0; }
            .header h3 { font-size: 14px; margin: 0 0 5px 0; font-weight: normal; }
            .meta { text-align: right; font-size: 12px; font-style: italic; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MINISTERIO DE HACIENDA</h1>
            <h2>DIRECCIÓN GENERAL DE TESORERÍA</h2>
            <h3>DEPARTAMENTO DE INGRESOS COLECTURÍA DE ADUANAS</h3>
            <h3>REGISTROS CONSULARES Y EMBAJADAS</h3>
          </div>
          <div class="meta">${getMetadata()}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">ID</th>
                <th>TIPO</th>
                <th>REGIÓN</th>
                <th>PAÍS</th>
                <th>UBICACIÓN</th>
                <th>DIRECCIÓN</th>
                <th>ESTADO</th>
                <th>INGRESADO POR</th>
                <th>FECHA DE MODIFICACIÓN</th>
              </tr>
            </thead>
            <tbody>
              ${filteredConsulates.map((c, index) => `
                <tr>
                  <td>${String(index + 1).padStart(2, '0')}</td>
                  <td>${escapeHtml(c.type)}</td>
                  <td>${escapeHtml(c.region)}</td>
                  <td>${escapeHtml(c.country)}</td>
                  <td>${escapeHtml(c.location)}</td>
                  <td>${escapeHtml(c.address || 'N/A')}</td>
                  <td>${escapeHtml(c.status)}</td>
                  <td>${escapeHtml(c.createdBy?.name || 'Sistema')}</td>
                  <td>${escapeHtml(c.updatedAt ? format(new Date(c.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Directorio Consular
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Gestiona las embajadas y consulados habilitados para registrar ingresos
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={() => {
          setFormData({ id: 0, type: 'CONSULADO', region: '', country: '', location: '', address: '', status: 'ACTIVO', createdAt: format(new Date(), 'yyyy-MM-dd') });
          setShowAddModal(true);
        }}>
          <Plus size={16} />
          Nueva Procedencia
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Buscador */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0.75rem', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por país o ubicación..." 
              className="input-control" 
              style={{ paddingLeft: '2.5rem', marginBottom: 0, width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Botones de Exportación reubicados */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.75rem' }} 
              title="Imprimir" 
              onClick={printTable}
            >
              <Printer size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Imprimir</span>
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.75rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }} 
              title="Descargar Excel" 
              onClick={exportToExcel}
            >
              <FileSpreadsheet size={16} color="#10b981" />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Excel</span>
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }} 
              title="Descargar PDF" 
              onClick={exportToPDF}
            >
              <FileText size={16} color="#ef4444" />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>PDF</span>
            </button>
          </div>

        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', minWidth: '1100px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('id')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    ID {renderSortIcon('id')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('type')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    TIPO {renderSortIcon('type')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('region')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    REGIÓN {renderSortIcon('region')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('country')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    PAÍS {renderSortIcon('country')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('location')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    UBICACIÓN {renderSortIcon('location')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('address')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    DIRECCIÓN {renderSortIcon('address')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    ESTADO {renderSortIcon('status')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('createdBy')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    INGRESADO POR {renderSortIcon('createdBy')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, borderRight: '1px solid var(--border-color)', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('updatedAt')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    FECHA DE MODIFICACIÓN {renderSortIcon('updatedAt')}
                  </div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsulates.map((c, idx) => (
                <tr key={c.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>{String(c.id).padStart(2, '0')}</td>
                  <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-color)' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: c.type === 'EMBAJADA' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                      color: c.type === 'EMBAJADA' ? 'var(--primary-color)' : 'var(--accent-primary)'
                    }}>
                      {c.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>{c.region}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)', borderRight: '1px solid var(--border-color)' }}>{c.country}</td>
                  <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-color)' }}>{c.location}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderRight: '1px solid var(--border-color)' }} title={c.address || ''}>
                    {c.address || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-color)' }}>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: c.status === 'ACTIVO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: c.status === 'ACTIVO' ? '#10b981' : '#ef4444'
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.875rem', borderRight: '1px solid var(--border-color)' }}>
                    {c.createdBy?.name || 'Sistema'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', borderRight: '1px solid var(--border-color)' }}>
                    {c.updatedAt ? format(new Date(c.updatedAt), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Ver Detalles Completos"
                        onClick={() => setViewConsulate(c)}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(139, 92, 246, 0.2)', backgroundColor: 'rgba(139, 92, 246, 0.05)' }}
                        title="Editar Procedencia"
                        onClick={() => openEditModal(c)}
                      >
                        <Pencil size={16} color="var(--accent-primary)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredConsulates.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar / Editar Procedencia */}
      {mounted && (showAddModal || showEditModal) && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 1rem' }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{showEditModal ? 'Editar Procedencia' : 'Agregar Procedencia'}</h2>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

              <form id="add-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label>{showEditModal ? 'Fecha de Modificación' : 'Fecha de Ingreso'} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="date" 
                    className="input-control" 
                    required
                    value={formData.createdAt}
                    onChange={e => setFormData({...formData, createdAt: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Ingresado por</label>
                  <div style={{ 
                    padding: '0.625rem 0.75rem', 
                    backgroundColor: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    {showEditModal ? (consulates.find(c => c.id === formData.id)?.createdBy?.name || currentUserName) : currentUserName}
                  </div>
                </div>

                <div className="input-group">
                  <label>Tipo <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="input-control" 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="CONSULADO">Consulado</option>
                    <option value="EMBAJADA">Embajada</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Región <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="Ej: Europa, América del Norte..."
                    required
                    value={formData.region}
                    onChange={e => setFormData({...formData, region: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>País <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="Ej: España, Estados Unidos..."
                    required
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Ubicación <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="Ej: Madrid, Boston, Sede Central..."
                    required
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Dirección (Opcional)</label>
                  <textarea 
                    className="input-control" 
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  ></textarea>
                </div>
                
                <div className="input-group">
                  <label>Estado <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="input-control" 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    required
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>
              </form>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end', backgroundColor: 'var(--bg-tertiary)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Cancelar</button>
              <button type="submit" form="add-form" className="btn btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Ver Detalles (Ojito) */}
      {mounted && viewConsulate && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 1rem' }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="var(--accent-primary)" />
                Detalles de Procedencia
              </h2>
              <button onClick={() => setViewConsulate(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Tipo</p>
                  <p style={{ fontWeight: 500 }}>{viewConsulate.type}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Estado</p>
                  <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: viewConsulate.status === 'ACTIVO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: viewConsulate.status === 'ACTIVO' ? '#10b981' : '#ef4444'
                    }}>
                      {viewConsulate.status}
                    </span>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Ingresado Por</p>
                  <p style={{ fontWeight: 500 }}>{viewConsulate.createdBy?.name || 'Sistema'}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Región</p>
                  <p style={{ fontWeight: 500 }}>{viewConsulate.region}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>País</p>
                  <p style={{ fontWeight: 500 }}>{viewConsulate.country}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Ubicación</p>
                  <p style={{ fontWeight: 500 }}>{viewConsulate.location}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Fecha de Modificación</p>
                  <p style={{ fontWeight: 500 }}>{viewConsulate.updatedAt ? format(new Date(viewConsulate.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}</p>
                </div>
              </div>

              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Dirección Completa</p>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  {viewConsulate.address || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin dirección registrada</span>}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

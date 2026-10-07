/** Interpreta un valor como fecha-solo en UTC (depositDate se guarda como medianoche UTC). */
function parseDateOnly(value: string | Date): Date {
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return new Date(NaN);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Fecha local actual en formato yyyy-MM-dd (para inputs type="date"). */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Formatea una fecha-solo (guardada como medianoche UTC) como dd/MM/yyyy. */
export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** Fecha-solo (guardada como medianoche UTC) en formato yyyy-MM-dd. */
export function formatDateOnlyISO(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Fecha-solo en formato M/d/yyyy (Reportes de Pendientes/Transferencias). */
export function formatDateOnlyMD(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '-';
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

export function calculateBusinessDays(startDate: string | Date, endDate: string | Date): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;

  // Feriados fijos de El Salvador (Día-Mes)
  const fixedHolidays = [
    '01-01', // Año nuevo
    '01-05', // Día del Trabajo
    '10-05', // Día de la Madre
    '17-06', // Día del Padre
    '06-08', // Fiestas patronales
    '15-09', // Independencia
    '02-11', // Día de los difuntos
    '25-12', // Navidad
  ];

  let businessDays = 0;
  const current = new Date(start);

  while (current < end) {
    current.setUTCDate(current.getUTCDate() + 1);

    const dayOfWeek = current.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado

    const dateStr = `${String(current.getUTCDate()).padStart(2, '0')}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
    const isHoliday = fixedHolidays.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      businessDays++;
    }
  }

  return businessDays;
}

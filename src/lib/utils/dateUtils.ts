export function calculateBusinessDays(startDate: string | Date, endDate: string | Date): number {
  let start = new Date(startDate);
  let end = new Date(endDate);
  
  // Normalizar las fechas a medianoche considerando la zona horaria local
  start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  end = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (start >= end) return 0; // Si es el mismo día o fecha anterior

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
  let current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
    
    const dateStr = `${String(current.getDate()).padStart(2, '0')}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const isHoliday = fixedHolidays.includes(dateStr);
    
    if (!isWeekend && !isHoliday) {
      businessDays++;
    }
  }

  return businessDays;
}

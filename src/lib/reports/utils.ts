export function getMonthNameEnglish(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}

export function getMonthNameSpanish(month: number): string {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[month - 1] || '';
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Simple Spanish number to words for currency
export function numeroALetras(monto: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const decenas2 = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function getLetras(n: number): string {
    if (n === 0) return 'CERO';
    if (n === 100) return 'CIEN';
    let str = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    if (c > 0) str += centenas[c] + ' ';
    
    if (d === 1) {
      str += decenas[u] + ' ';
    } else if (d === 2 && u === 0) {
      str += 'VEINTE ';
    } else if (d === 2) {
      str += 'VEINTI' + unidades[u] + ' ';
    } else {
      if (d > 2) {
        str += decenas2[d] + (u > 0 ? ' Y ' : ' ');
      }
      if (d !== 1 && d !== 2 && u > 0) str += unidades[u] + ' ';
    }
    return str.trim();
  }

  const enteros = Math.floor(monto);
  const centavos = Math.round((monto - enteros) * 100);
  
  let letras = '';
  if (enteros >= 1000) {
    const miles = Math.floor(enteros / 1000);
    if (miles === 1) letras += 'MIL ';
    else letras += getLetras(miles) + ' MIL ';
  }
  
  const resto = enteros % 1000;
  if (resto > 0 || enteros === 0) {
    letras += getLetras(resto);
  }

  const centStr = centavos.toString().padStart(2, '0');
  return `${letras.trim()} ${centStr}/100 DOLARES`;
}

export function numberToWords(num: number): string {
  if (num === 0) return 'CERO';
  
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenasSuperiores = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertGroup(n: number): string {
    let text = '';
    if (n === 100) return 'CIEN';
    
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    if (c > 0) text += centenas[c] + ' ';
    
    if (d === 1) {
      text += decenas[u] + ' ';
      return text.trim();
    } else if (d === 2) {
      if (u === 0) text += 'VEINTE ';
      else text += 'VEINTI' + unidades[u] + ' ';
    } else if (d > 2) {
      text += decenasSuperiores[d] + ' ';
      if (u > 0) text += 'Y ' + unidades[u] + ' ';
    } else if (u > 0) {
      text += unidades[u] + ' ';
    }
    
    return text.trim();
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let text = '';
  
  const millones = Math.floor(integerPart / 1000000);
  const miles = Math.floor((integerPart % 1000000) / 1000);
  const unidadesResto = integerPart % 1000;
  
  if (millones > 0) {
    if (millones === 1) text += 'UN MILLON ';
    else text += convertGroup(millones) + ' MILLONES ';
  }
  
  if (miles > 0) {
    if (miles === 1) text += 'MIL ';
    else text += convertGroup(miles) + ' MIL ';
  }
  
  if (unidadesResto > 0) {
    text += convertGroup(unidadesResto) + ' ';
  }
  
  if (integerPart === 0) {
    text = 'CERO ';
  }
  
  text = text.trim();
  
  const decimalString = String(decimalPart).padStart(2, '0') + '/100';
  return text + ' ' + decimalString;
}

export function getMetadataString(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

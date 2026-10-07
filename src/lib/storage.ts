import path from 'path';

export const STORAGE_ROOT = path.join(process.cwd(), 'storage');

const EXT_CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv; charset=utf-8',
};

export function allowedExtension(fileName: string): string | null {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return EXT_CONTENT_TYPES[ext] ? ext : null;
}

export function contentTypeFor(fileName: string): string {
  return EXT_CONTENT_TYPES[path.extname(fileName).slice(1).toLowerCase()] ?? 'application/octet-stream';
}

// Construye la URL pública de un archivo guardado en storage/ (rel: "reports/x.pdf")
export function storagePublicUrl(relPath: string): string {
  return `/api/archivos/${relPath.replace(/\\/g, '/')}`;
}

// Resuelve una URL pública (nueva o legacy "/reports/...?y=") a una ruta absoluta
// dentro de storage/. Devuelve null si la ruta escapa del directorio.
export function resolveStoragePath(publicUrl: string): string | null {
  let rel = publicUrl.split('?')[0];
  if (rel.startsWith('/api/archivos/')) {
    rel = rel.slice('/api/archivos/'.length);
  } else if (rel.startsWith('/')) {
    rel = rel.slice(1);
  }
  if (!rel || rel.includes('\0')) return null;
  const abs = path.resolve(STORAGE_ROOT, rel);
  if (!abs.startsWith(STORAGE_ROOT + path.sep)) return null;
  return abs;
}

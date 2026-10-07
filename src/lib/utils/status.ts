export const RECORD_STATUSES = [
  'NO IDENTIFICADO',
  'IDENTIFICADO NO DISTRIBUIDO',
  'IDENTIFICADO DISTRIBUIDO',
] as const;

export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const STATUS_LABELS: Record<RecordStatus, string> = {
  'NO IDENTIFICADO': 'No Identificado',
  'IDENTIFICADO NO DISTRIBUIDO': 'Identificado No Distribuido',
  'IDENTIFICADO DISTRIBUIDO': 'Identificado Distribuido',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as RecordStatus] ?? status;
}

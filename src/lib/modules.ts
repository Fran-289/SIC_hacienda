export const PERMISSION_MODULES = ['ingresos', 'reportes', 'directorio'] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

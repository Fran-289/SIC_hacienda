import { prisma } from '@/lib/prisma';

export const NOTIFY_DEFAULTS = {
  rreeTo: 'jachavez@rree.gob.sv',
  rreeCc: 'hugo.martinez@mh.gob.sv;santiago.mendez@rree.gob.sv;aurbina@rree.gob.sv;ronal.aguilar@mh.gob.sv',
  bancoTo: 'Magdalena.galan@bancocuscatlan.com',
  bancoCc: 'hugo.martinez@mh.gob.sv;ronal.aguilar@mh.gob.sv',
};

export interface NotifyTargets {
  rree: { to: string[]; cc: string[] };
  banco: { to: string[]; cc: string[] };
}

function splitList(value: string | undefined, fallback: string): string[] {
  const raw = value && value.trim() ? value : fallback;
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

export async function getNotifyTargets(): Promise<NotifyTargets> {
  const keys = ['notif_rree_to', 'notif_rree_cc', 'notif_banco_to', 'notif_banco_cc'];
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
  const settings = rows.reduce<Record<string, string>>((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {});

  return {
    rree: {
      to: splitList(settings.notif_rree_to, NOTIFY_DEFAULTS.rreeTo),
      cc: splitList(settings.notif_rree_cc, NOTIFY_DEFAULTS.rreeCc),
    },
    banco: {
      to: splitList(settings.notif_banco_to, NOTIFY_DEFAULTS.bancoTo),
      cc: splitList(settings.notif_banco_cc, NOTIFY_DEFAULTS.bancoCc),
    },
  };
}

/** Convierte los destinatarios de un destino en strings para el formulario mailto/Gmail. */
export function mailtoRecipients(target: { to: string[]; cc: string[] }): { to: string; cc: string } {
  return { to: target.to.join(','), cc: target.cc.join(';') };
}

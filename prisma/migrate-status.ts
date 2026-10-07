import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

// Mapea valores legacy de status a los canónicos del sistema.
const MIGRATIONS: Array<{ from: string[]; to: string }> = [
  { from: ['No identificado'], to: 'NO IDENTIFICADO' },
  { from: ['Identificado no distribuido', 'IDENTIFICADO NO DISTRIB'], to: 'IDENTIFICADO NO DISTRIBUIDO' },
  { from: ['Identificado distribuido', 'IDENTIFICADO DISTRIB'], to: 'IDENTIFICADO DISTRIBUIDO' },
];

async function main() {
  console.log('Migrando status de registros a valores canónicos...');

  let total = 0;
  for (const { from, to } of MIGRATIONS) {
    const result = await prisma.record.updateMany({
      where: { status: { in: from } },
      data: { status: to },
    });
    if (result.count > 0) {
      console.log(`  "${from.join('", "')}" -> "${to}": ${result.count} registro(s)`);
      total += result.count;
    }
  }

  const restantes = await prisma.record.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  console.log('Estado final de la columna status:');
  for (const r of restantes) {
    console.log(`  "${r.status}": ${r._count._all}`);
  }
  console.log(`Migración completada: ${total} registro(s) actualizado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

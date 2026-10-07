import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import { CONSULATES } from './consulates-data';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function seedAdmin() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const existing = await prisma.user.findUnique({ where: { email: 'admin@hacienda.gob.sv' } });

  if (!adminPassword || adminPassword.length < 8) {
    if (existing) {
      console.warn(
        'AVISO: SEED_ADMIN_PASSWORD no definido; se conserva la contraseña actual de admin@hacienda.gob.sv.\n' +
        '        Para cambiarla ejecuta: npm run reset-admin'
      );
      return;
    }
    throw new Error(
      'SEED_ADMIN_PASSWORD no está definido (o tiene menos de 8 caracteres) y aún no existe el usuario admin.\n' +
      'Agrégalo a .env antes de ejecutar el seed.'
    );
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hacienda.gob.sv' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@hacienda.gob.sv',
      name: 'Administrador del Sistema',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Admin listo: ${admin.email}`);
}

async function seedConsulates() {
  const existing = await prisma.consulate.findMany({
    select: { country: true, location: true },
  });
  const key = (c: { country: string; location: string }) => `${c.country}|${c.location}`;
  const present = new Set(existing.map(key));

  const missing = CONSULATES.filter((c) => !present.has(key(c)));
  if (missing.length === 0) {
    console.log(`Directorio consular completo (${existing.length} registros).`);
    return;
  }

  for (const c of missing) {
    await prisma.consulate.create({ data: c });
  }
  const total = existing.length + missing.length;
  console.log(`Directorio consular: +${missing.length} inserciones, ${total} en total.`);
}

async function main() {
  console.log('Sembrando base de datos...');
  await seedAdmin();
  await seedConsulates();
  console.log('Base de datos lista.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

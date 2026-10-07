import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] || 'admin@hacienda.gob.sv';
  const newPassword = process.env.NEW_PASSWORD;

  if (!newPassword || newPassword.length < 8) {
    throw new Error(
      'Define NEW_PASSWORD (mínimo 8 caracteres) antes de ejecutar. Ejemplo:\n' +
      '  NEW_PASSWORD="MiContraseñaSegura1" npm run reset-admin -- admin@hacienda.gob.sv'
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Usuario no encontrado: ${email}`);
  }

  await prisma.user.update({
    where: { email },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });

  console.log(`Contraseña actualizada para ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

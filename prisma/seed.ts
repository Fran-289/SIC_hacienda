import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create an initial admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hacienda.gob.sv' },
    update: {},
    create: {
      email: 'admin@hacienda.gob.sv',
      name: 'Administrador del Sistema',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`User created: ${admin.email}`);

  // Create mock consulates based on the PDF
  const consulates = [
    { type: 'EMBAJADA', region: 'AMÉRICA DEL NORTE', country: 'ESTADOS UNIDOS', location: 'Washington, D.C.', address: '1400 Sixteenth Street, N.W., Suite 100, Washington, D.C. 20036' },
    { type: 'CONSULADO', region: 'AMÉRICA DEL NORTE', country: 'ESTADOS UNIDOS', location: 'Boston, Massachusetts', address: '46 Bennington Street East Boston, MA 02128' },
    { type: 'CONSULADO', region: 'AMÉRICA DEL NORTE', country: 'ESTADOS UNIDOS', location: 'Chicago, Illinois', address: '177 North State Street, 2do. Piso Mezzanine, Chicago, IL 60601' },
    { type: 'CONSULADO', region: 'AMÉRICA DEL NORTE', country: 'ESTADOS UNIDOS', location: 'Doral, Florida', address: '8550 NW 33rd Street, Suite 100, Doral, FL 33122' },
    { type: 'CONSULADO', region: 'AMÉRICA DEL NORTE', country: 'ESTADOS UNIDOS', location: 'Dallas, Texas', address: '7610 Stemmons Fwy. Suite 400, Dallas, Texas 75247' },
    { type: 'CONSULADO', region: 'AMÉRICA DEL NORTE', country: 'ESTADOS UNIDOS', location: 'Los Ángeles, California', address: '3250 Wilshire Blvd. Suite 550, Los Ángeles, CA, 90010' },
  ];

  for (const c of consulates) {
    const consulate = await prisma.consulate.create({
      data: c,
    });
    console.log(`Consulate created: ${consulate.location}`);
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

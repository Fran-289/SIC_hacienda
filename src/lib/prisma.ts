import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prismaRefactored5: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prismaRefactored5 ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' }),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaRefactored5 = prisma;

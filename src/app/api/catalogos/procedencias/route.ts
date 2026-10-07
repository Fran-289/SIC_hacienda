import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz, requireAdminAuthz } from '@/lib/authz';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const auth = await requireAuthz('directorio');
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const region = url.searchParams.get('region');
  const country = url.searchParams.get('country');

  const where: Prisma.ConsulateWhereInput = {};
  if (type) where.type = type;
  if (region) where.region = region;
  if (country) where.country = country;

  try {
    const consulates = await prisma.consulate.findMany({
      where,
      orderBy: [
        { region: 'asc' },
        { country: 'asc' },
        { location: 'asc' }
      ],
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });
    return NextResponse.json(consulates);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener procedencias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAuthz();
  if (!auth.ok) return auth.response;
  const session = auth.user;

  try {
    const body = await request.json();
    const { type, region, country, location, address, status, createdAt } = body;

    if (!type || !region || !country || !location) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const consulate = await prisma.$transaction(async (tx) => {
      const created = await tx.consulate.create({
        data: {
          type,
          region,
          country,
          location,
          address: address || null,
          status: status || 'ACTIVO',
          createdById: session.id,
          ...(createdAt && { createdAt: new Date(createdAt) })
        }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          action: 'CREATE_CONSULATE',
          details: `Agregó la procedencia: ${type} en ${location}, ${country}`,
        }
      });

      return created;
    });

    return NextResponse.json(consulate, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear la procedencia' }, { status: 500 });
  }
}

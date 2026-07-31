import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const region = url.searchParams.get('region');
  const country = url.searchParams.get('country');

  const where: any = {};
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
        createdBy: true
      }
    });
    return NextResponse.json(consulates);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener procedencias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, region, country, location, address, status, createdAt } = body;

    if (!type || !region || !country || !location) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const consulate = await prisma.consulate.create({
      data: {
        type,
        region,
        country,
        location,
        address: address || null,
        status: status || 'ACTIVO',
        createdById: session.id as number,
        ...(createdAt && { createdAt: new Date(createdAt) })
      }
    });

    // Registrar en logs
    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        action: 'CREATE_CONSULATE',
        details: `Agregó la procedencia: ${type} en ${location}, ${country}`,
      }
    });

    return NextResponse.json(consulate, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear la procedencia' }, { status: 500 });
  }
}

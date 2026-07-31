import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.id as number } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportType, periodMonth, periodYear, status, format, fileName, fileBase64 } = body;

    if (!reportType || !periodMonth || !periodYear || !status || !format || !fileName || !fileBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save file locally
    const reportsDir = path.join(process.cwd(), 'public', 'uploads', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(reportsDir, uniqueFileName);

    // Convert base64 back to buffer
    const base64Data = fileBase64.split(';base64,').pop();
    if (!base64Data) {
      return NextResponse.json({ error: 'Invalid file data' }, { status: 400 });
    }
    
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    // The public URL for the frontend to download
    const publicUrl = `/uploads/reports/${uniqueFileName}`;

    const reportHistory = await prisma.reportHistory.create({
      data: {
        userId: user.id,
        reportType,
        periodMonth,
        periodYear,
        status,
        format,
        fileName,
        filePath: publicUrl
      }
    });

    // Log action
    await prisma.systemLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: 'REPORTE_GENERADO',
        details: `Generó ${reportType} (${status}) para ${periodMonth}/${periodYear}`
      }
    });

    return NextResponse.json(reportHistory);
  } catch (error: any) {
    console.error('Error en POST /api/reportes/history:', error);
    return NextResponse.json({ error: error.message || error.toString(), stack: error.stack }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.id as number } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    let whereClause: any = {};
    if (type) whereClause.reportType = type;
    if (month) whereClause.periodMonth = parseInt(month);
    if (year) whereClause.periodYear = parseInt(year);
    if (status) whereClause.status = status;

    const history = await prisma.reportHistory.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

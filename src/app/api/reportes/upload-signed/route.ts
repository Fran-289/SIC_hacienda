import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentId = parseInt(formData.get('documentId') as string);

    if (!file || isNaN(documentId)) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const document = await prisma.reportDocument.findUnique({
      where: { id: documentId },
      include: { group: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const safeUserName = (session.name as string).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `${document.reportType}_${document.group.periodMonth}_${document.group.periodYear}_firmado_${safeUserName}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);
    const publicUrl = `/reports/${filename}`;

    fs.writeFileSync(filePath, buffer);

    await prisma.reportDocument.update({
      where: { id: documentId },
      data: { signedPdfUrl: publicUrl }
    });

    // Verify if all documents in the group are signed
    const groupDocuments = await prisma.reportDocument.findMany({
      where: { groupId: document.groupId }
    });

    const allSigned = groupDocuments.every(doc => doc.signedPdfUrl !== null);

    if (allSigned && document.group.processStatus !== 'Finalizado') {
      await prisma.reportGroup.update({
        where: { id: document.groupId },
        data: { processStatus: 'Finalizado' }
      });
    }

    return NextResponse.json({ success: true, publicUrl, allSigned });
  } catch (error) {
    console.error('Error subiendo archivo firmado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

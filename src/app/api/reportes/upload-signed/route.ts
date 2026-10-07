import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';
import { STORAGE_ROOT, storagePublicUrl } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const auth = await requireAuthz('reportes');
    if (!auth.ok) return auth.response;
    const session = auth.user;

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

    // Solo PDF: magic bytes %PDF- y tope de tamaño
    const isPdf = buffer.length >= 5 &&
      buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2d;
    const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
    if (!isPdf) {
      return NextResponse.json({ error: 'El archivo debe ser un PDF válido' }, { status: 400 });
    }
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Tamaño de archivo inválido (máx. 25 MB)' }, { status: 400 });
    }

    const reportsDir = path.join(STORAGE_ROOT, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const safeUserName = (session.name as string).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `${document.reportType}_${document.group.periodMonth}_${document.group.periodYear}_firmado_${safeUserName}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);
    const publicUrl = storagePublicUrl(`reports/${filename}`);

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

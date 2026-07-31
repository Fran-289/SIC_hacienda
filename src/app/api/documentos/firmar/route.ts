import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Falta el ID del documento' }, { status: 400 });
    }

    const doc = await prisma.reportDocument.findUnique({
      where: { id: documentId },
      include: { group: true }
    });

    if (!doc || !doc.pdfUrl) {
      return NextResponse.json({ error: 'Documento original no encontrado' }, { status: 404 });
    }

    // Get configuration for names
    const settingsRaw = await prisma.systemSetting.findMany();
    const config = settingsRaw.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);

    let isAprobador = false;
    let signerName = (session.name as string) || 'Usuario';
    let signerTitle = '';

    const elab = config.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
    const elabCargo = config.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
    const aprob = config.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
    const aprobCargo = config.firma_aprobo_cargo || 'JEFE DE DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANAS';

    if (doc.group.processStatus === 'Firma Jefatura') {
      signerName = aprob;
      signerTitle = aprobCargo;
      isAprobador = true;
    } else if (doc.group.processStatus === 'Firma Recaudacion' || doc.group.processStatus === 'Firma Recaudación') {
      signerName = elab;
      signerTitle = elabCargo;
      isAprobador = false;
    } else {
      signerName = elab; // Default fallback
      signerTitle = elabCargo;
    }

    // Extract Y coordinate if present
    const [pdfPathPart, queryPart] = doc.pdfUrl.split('?');
    // Default fallback if not found (near the bottom instead of the top). 
    let jsPdfSignatureY = 240; 
    
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      if (searchParams.has('y')) {
        jsPdfSignatureY = parseFloat(searchParams.get('y')!);
      }
    }

    // Resolve local path from URL
    const originalPdfPath = path.join(process.cwd(), 'public', pdfPathPart);
    
    if (!fs.existsSync(originalPdfPath)) {
      return NextResponse.json({ error: 'Archivo físico no encontrado' }, { status: 404 });
    }

    const pdfBuffer = fs.readFileSync(originalPdfPath);
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    
    const { width, height } = lastPage.getSize();
    
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const dateStr = format(new Date(), "dd-MM-yyyy HH:mm:ss");
    
    const margin = 14 * 2.83465;
    const stampWidth = 260; // Wider to ensure original long texts are completely covered
    const stampHeight = 105; 
    
    // Position stamp left (Elaborador) or right (Aprobador)
    const stampX = isAprobador ? (width / 2) - 10 : margin - 5;
    
    const jsPdfSignatureYPoints = jsPdfSignatureY * 2.83465;

    // We want the stamp to sit nicely over the ELABORO text.
    // We position the stamp so that its top covers the original "ELABORO:" text.
    // The top edge of the stamp from the bottom is `stampY + stampHeight`.
    const stampY = height - jsPdfSignatureYPoints - 85;

    // Draw white background box to cover original text completely (without borders)
    lastPage.drawRectangle({
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
      color: rgb(1, 1, 1) 
    });

    const sealGold = rgb(0.85, 0.75, 0.2);
    const sealDark = rgb(0.05, 0.1, 0.3);

    // Context label (Elaborado por / Aprobado por)
    const contextLabel = isAprobador ? 'APROBADO POR:' : 'ELABORADO POR:';
    lastPage.drawText(contextLabel, {
      x: stampX + 10,
      y: stampY + 90,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1)
    });

    // Ribbons
    lastPage.drawRectangle({
      x: stampX + 17,
      y: stampY + 30,
      width: 10,
      height: 25,
      color: sealDark,
    });
    lastPage.drawRectangle({
      x: stampX + 33,
      y: stampY + 30,
      width: 10,
      height: 25,
      color: sealDark,
    });

    // Gold circle
    lastPage.drawCircle({
      x: stampX + 30,
      y: stampY + 60,
      size: 16,
      color: sealGold,
    });
    lastPage.drawCircle({
      x: stampX + 30,
      y: stampY + 60,
      size: 13,
      borderColor: rgb(1, 0.9, 0.5),
      borderWidth: 1,
    });

    // Texts
    lastPage.drawText('Firma digital', {
      x: stampX + 55,
      y: stampY + 70,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Signer name
    lastPage.drawText(signerName.toUpperCase(), {
      x: stampX + 55,
      y: stampY + 55,
      size: 7,
      font: fontNormal,
      color: rgb(0.2, 0.4, 0.6)
    });

    // Cargo text
    const cargoParts = signerTitle.toUpperCase().match(/.{1,45}(?:\s|$)/g) || [signerTitle.toUpperCase()];
    cargoParts.forEach((part, idx) => {
      lastPage.drawText(part.trim(), {
        x: stampX + 55,
        y: stampY + 40 - (idx * 8),
        size: 6,
        font: fontNormal,
        color: rgb(0.3, 0.3, 0.3)
      });
    });

    lastPage.drawText(dateStr, {
      x: stampX + 55,
      y: stampY + 15,
      size: 7,
      font: fontNormal,
      color: rgb(0.4, 0.4, 0.4)
    });

    // Save PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedBuffer = Buffer.from(signedPdfBytes);

    const originalFilename = path.basename(originalPdfPath);
    const signedFilename = `signed_${originalFilename}`;
    const signedPdfPath = path.join(process.cwd(), 'public', 'reports', signedFilename);
    const signedPublicUrl = `/reports/${signedFilename}`;

    fs.writeFileSync(signedPdfPath, signedBuffer);

    // Update DB
    await prisma.reportDocument.update({
      where: { id: documentId },
      data: {
        signedPdfUrl: signedPublicUrl
      }
    });

    return NextResponse.json({ success: true, signedPdfUrl: signedPublicUrl });

  } catch (error) {
    console.error('Error al firmar documento:', error);
    return NextResponse.json({ error: 'Error interno del servidor al firmar' }, { status: 500 });
  }
}

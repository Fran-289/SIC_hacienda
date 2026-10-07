import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';
import { sendMail, SmtpNotConfiguredError } from '@/lib/mailer';
import { getNotifyTargets } from '@/lib/notify';
import { resolveStoragePath } from '@/lib/storage';
import fs from 'fs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

async function findAttachment(mes: number, anio: number) {
  const group = await prisma.reportGroup.findFirst({
    where: { groupType: 'No Identificados / No Distribuidos', periodMonth: mes, periodYear: anio },
    orderBy: { id: 'desc' },
    include: { documents: true },
  });
  if (!group) return null;

  const doc =
    group.documents.find((d) => d.signedPdfUrl) ||
    group.documents.find((d) => d.pdfUrl);
  const url = doc?.signedPdfUrl || doc?.pdfUrl;
  if (!url) return null;

  const abs = resolveStoragePath(url);
  if (!abs || !fs.existsSync(abs)) return null;
  return { filename: `ReporteNoIdentificados_${mes}_${anio}.pdf`, path: abs };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthz('reportes');
    if (!auth.ok) return auth.response;

    const { tipoReporte, mes, anio } = await request.json();

    if (!Number.isInteger(mes) || !Number.isInteger(anio) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const reportName = tipoReporte === 'noidentificados' ? 'No Identificados' : 'No Identificados / No Distribuidos';
    const targets = await getNotifyTargets();
    const periodo = format(new Date(anio, mes - 1, 1), "MMMM 'de' yyyy", { locale: es }).toUpperCase();

    const attachment = await findAttachment(mes, anio);
    const attachments = attachment ? [attachment] : [];

    const subject = `VALORES PENDIENTES DEL PERÍODO ${periodo} - INGRESOS ${reportName.toUpperCase()}`;

    const bodyRree = [
      'Buenas Tardes',
      'Licenciado Chávez',
      '',
      `Por medio de la presente remito archivo adjunto del reporte de ${reportName} correspondiente al período ${periodo},`,
      'solicitando de favor nos pueda identificar la procedencia y distribución de los montos',
      'de conformidad a sus controles.',
      '',
      'Agradeciéndole de antemano por su apoyo',
      'Cordialmente',
      '',
      `${auth.user.name}`,
    ].join('\n');

    const bodyBanco = [
      'Buenas Tardes',
      'Licenciada Magdalena Galán',
      '',
      `Por medio de la presente remito archivo adjunto del reporte de ${reportName} correspondiente al período ${periodo},`,
      'solicitando de favor nos pueda mandar los Swift de los montos de conformidad a sus controles.',
      '',
      'Agradeciéndole de antemano por su apoyo',
      'Cordialmente',
      '',
      `${auth.user.name}`,
    ].join('\n');

    const enviados: string[] = [];

    await sendMail({
      to: targets.rree.to,
      cc: targets.rree.cc,
      subject,
      text: bodyRree,
      attachments,
    });
    enviados.push(...targets.rree.to);

    await sendMail({
      to: targets.banco.to,
      cc: targets.banco.cc,
      subject,
      text: bodyBanco,
      attachments,
    });
    enviados.push(...targets.banco.to);

    return NextResponse.json({
      success: true,
      message: `Correo enviado a ${enviados.join(', ')}${attachment ? '' : ' (sin adjunto: aún no existe el PDF del período)'}`,
      attached: Boolean(attachment),
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      return NextResponse.json(
        { error: 'El envío de correos no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS en .env.' },
        { status: 503 }
      );
    }
    console.error('Error en POST /api/notificaciones/reporte:', error);
    return NextResponse.json({ error: 'No se pudo enviar el correo. Revisa la configuración SMTP.' }, { status: 502 });
  }
}

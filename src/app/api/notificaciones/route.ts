import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz';
import { sendMail, SmtpNotConfiguredError } from '@/lib/mailer';
import { getNotifyTargets } from '@/lib/notify';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(request: Request) {
  try {
    const auth = await requireAuthz('ingresos');
    if (!auth.ok) return auth.response;

    const { recordId } = await request.json();

    if (typeof recordId !== 'number' || !Number.isInteger(recordId)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const record = await prisma.record.findUnique({ where: { id: recordId } });
    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const targets = await getNotifyTargets();
    const fecha = format(record.depositDate, "d 'de' MMMM 'de' yyyy", { locale: es });
    const procedencia = [record.country, record.location].filter(Boolean).join(' - ') || 'No identificada';

    const subject = 'VALORES PENDIENTES DEL PERÍODO - INGRESOS NO IDENTIFICADOS';
    const body = [
      'Buenas Tardes',
      '',
      'Por medio de la presente remito notificación del siguiente depósito no identificado,',
      'solicitando de favor nos pueda identificar la procedencia y distribución de los montos',
      'de conformidad a sus controles.',
      '',
      `Fecha de depósito: ${fecha}`,
      `Monto: $${record.depositAmount.toFixed(2)}`,
      `Procedencia: ${procedencia}`,
      `Estado: ${record.status}`,
      '',
      'Agradeciéndole de antemano por su apoyo',
      'Cordialmente',
      '',
      `${auth.user.name}`,
    ].join('\n');

    await sendMail({
      to: targets.rree.to,
      cc: targets.rree.cc,
      subject,
      text: body,
    });

    return NextResponse.json({
      success: true,
      message: `Notificación enviada a ${targets.rree.to.join(', ')}`,
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      return NextResponse.json(
        { error: 'El envío de correos no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS en .env.' },
        { status: 503 }
      );
    }
    console.error('Error en POST /api/notificaciones:', error);
    return NextResponse.json({ error: 'No se pudo enviar el correo. Revisa la configuración SMTP.' }, { status: 502 });
  }
}

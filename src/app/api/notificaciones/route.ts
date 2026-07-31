import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { recordId } = await request.json();

    const record = await prisma.record.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    // Aquí iría la lógica de nodemailer. 
    // Como es simulación "Plug & Play", por ahora solo lo registramos en consola (o base de datos si hubiera tabla de auditoría).
    console.log('--- INICIO SIMULACIÓN SMTP ---');
    console.log(`Enviando correo a: Ministerio de Relaciones Exteriores y Banco Cuscatlán`);
    console.log(`Asunto: VALORES PENDIENTES DEL PERÍODO - INGRESOS NO IDENTIFICADOS`);
    console.log(`Mensaje: Por medio de la presente remito archivo adjunto, solicitando de favor nos pueda identificar la procedencia y distribución de los montos de conformidad a sus controles.`);
    console.log(`Datos del depósito no identificado:`);
    console.log(`Enviando notificación DGF... Depósito: ${record.depositAmount}, Procedencia: ${record.location}`);
    console.log('--- FIN SIMULACIÓN SMTP ---');

    return NextResponse.json({ success: true, message: 'Correo simulado con éxito.' });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

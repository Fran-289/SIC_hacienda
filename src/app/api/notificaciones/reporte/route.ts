import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tipoReporte, mes, anio } = await request.json();

    const reportName = tipoReporte === 'noidentificados' ? 'No Identificados' : 'No Identificados / No Distribuidos';

    console.log('--- INICIO SIMULACIÓN SMTP ---');
    console.log(`Enviando correo a: Ministerio de Relaciones Exteriores y Banco Cuscatlán`);
    console.log(`Asunto: VALORES PENDIENTES DEL PERÍODO - INGRESOS ${reportName.toUpperCase()}`);
    console.log(`Mensaje: Por medio de la presente remito archivo adjunto del reporte correspondiente al periodo ${mes}/${anio}, solicitando de favor nos pueda identificar la procedencia y distribución de los montos de conformidad a sus controles.`);
    console.log(`Archivo adjunto simulado: ReporteSinIdentificar_${mes}_${anio}.pdf`);
    console.log('--- FIN SIMULACIÓN SMTP ---');

    return NextResponse.json({ success: true, message: 'Correo enviado con éxito a RREE y Banco Cuscatlán.' });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

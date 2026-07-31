import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const currentUser = await prisma.user.findUnique({ where: { id: session.id as number } });
    if (!currentUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    return NextResponse.json({ success: true, user: { id: currentUser.id, name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar } });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, avatar } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 });
    }

    // Consultar usuario actual para comparar qué cambió exactamente
    const currentUser = await prisma.user.findUnique({ where: { id: session.id as number } });
    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const changes: string[] = [];
    if (currentUser.name !== name) {
      changes.push(`cambió su nombre de '${currentUser.name}' a '${name}'`);
    }
    if (currentUser.email !== email) {
      changes.push(`cambió su correo de '${currentUser.email}' a '${email}'`);
    }
    if (avatar !== undefined && currentUser.avatar !== avatar) {
      if (avatar === null) {
        changes.push(`eliminó su foto de perfil`);
      } else if (avatar.startsWith('data:image')) {
        changes.push(`subió una nueva foto de perfil personalizada`);
      } else {
        changes.push(`cambió su avatar por '${avatar}'`);
      }
    }

    // Si no hubo ningún cambio, no registramos nada y retornamos éxito
    if (changes.length === 0) {
      return NextResponse.json({ success: true, user: { name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar } });
    }

    // Construir el mensaje exacto con buena gramática
    let detailsStr = '';
    if (changes.length === 1) {
      detailsStr = changes[0];
    } else {
      const lastChange = changes.pop();
      detailsStr = `${changes.join(', ')} y ${lastChange}`;
    }
    
    // Capitalizar la primera letra
    detailsStr = detailsStr.charAt(0).toUpperCase() + detailsStr.slice(1) + '.';

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: session.id as number },
      data: { name, email, ...(avatar !== undefined && { avatar }) },
    });
    
    // Registrar la acción exacta
    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        action: 'UPDATE_PROFILE',
        details: detailsStr,
      }
    });

    return NextResponse.json({ success: true, user: { name: updatedUser.name, email: updatedUser.email, avatar: updatedUser.avatar } });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return NextResponse.json({ error: 'Error al actualizar el perfil' }, { status: 500 });
  }
}

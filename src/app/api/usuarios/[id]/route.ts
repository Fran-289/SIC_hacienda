import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PUT: Actualizar un usuario
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { email, password, name, role, jobTitle, permissions } = body;

    const dataToUpdate: any = {};

    if (email) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
      }
      // Check if another user has this email
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== Number(id)) {
        return NextResponse.json({ error: 'Ya existe otro usuario con este correo' }, { status: 400 });
      }
      dataToUpdate.email = email;
    }

    if (password) {
      if (password.length < 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json({ 
          error: 'La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número' 
        }, { status: 400 });
      }
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    if (name && name.trim().length > 0) dataToUpdate.name = name;
    if (role) dataToUpdate.role = role;
    if (jobTitle !== undefined) dataToUpdate.jobTitle = jobTitle;
    if (permissions !== undefined) dataToUpdate.permissions = permissions ? JSON.stringify(permissions) : null;

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: dataToUpdate
    });

    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        userName: session.name as string,
        action: 'UPDATE_USER',
        details: `Usuario actualizado: ${updatedUser.email}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: 'Error al actualizar usuario', details: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un usuario
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    if (Number(id) === session.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id: Number(id) } });
    
    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // El cascade en prisma asegurará que los logs de este usuario también se eliminen
    await prisma.user.delete({
      where: { id: Number(id) }
    });

    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        userName: session.name as string,
        action: 'DELETE_USER',
        details: `Usuario eliminado: ${userToDelete.email}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: 'Error al eliminar usuario', details: error.message }, { status: 500 });
  }
}

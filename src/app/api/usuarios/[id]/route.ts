import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuthz } from '@/lib/authz';
import { PERMISSION_MODULES, type PermissionModule } from '@/lib/modules';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

// PUT: Actualizar un usuario
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminAuthz();
    if (!auth.ok) return auth.response;
    const session = auth.user;

    const { id } = await params;
    const body = await request.json();
    const { email, password, name, role, jobTitle, permissions } = body;

    const dataToUpdate: Prisma.UserUpdateInput = {};

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

    if (role !== undefined && role !== null && role !== '' && !['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (permissions !== undefined && permissions !== null &&
        (!Array.isArray(permissions) || permissions.some((p: unknown) => !PERMISSION_MODULES.includes(p as PermissionModule)))) {
      return NextResponse.json({ error: 'Permisos inválidos' }, { status: 400 });
    }

    if (name && name.trim().length > 0) dataToUpdate.name = name;
    if (role) dataToUpdate.role = role;
    if (jobTitle !== undefined) dataToUpdate.jobTitle = jobTitle;
    if (permissions !== undefined) dataToUpdate.permissions = permissions ? JSON.stringify(permissions) : null;

    await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: Number(id) },
        data: dataToUpdate
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          userName: session.name,
          action: 'UPDATE_USER',
          details: `Usuario actualizado: ${updatedUser.email}`
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: 'Error al actualizar usuario', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

// DELETE: Eliminar un usuario
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminAuthz();
    if (!auth.ok) return auth.response;
    const session = auth.user;

    const { id } = await params;

    if (Number(id) === session.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id: Number(id) } });
    
    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id: Number(id) }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          userName: session.name,
          action: 'DELETE_USER',
          details: `Usuario eliminado: ${userToDelete.email}`
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: 'Error al eliminar usuario', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

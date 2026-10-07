import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuthz } from '@/lib/authz';
import { PERMISSION_MODULES, type PermissionModule } from '@/lib/modules';
import bcrypt from 'bcryptjs';

// GET: Listar todos los usuarios
export async function GET(request: Request) {
  try {
    const auth = await requireAdminAuthz();
    if (!auth.ok) return auth.response;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        jobTitle: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: 'Error al obtener usuarios', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario
export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuthz();
    if (!auth.ok) return auth.response;
    const session = auth.user;

    const body = await request.json();
    const { email, password, name, role, jobTitle, permissions } = body;

    // Validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }
    if (!password || password.length < 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número' 
      }, { status: 400 });
    }
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (role !== undefined && role !== null && !['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (permissions !== undefined && permissions !== null) {
      if (!Array.isArray(permissions) || permissions.some((p: unknown) => !PERMISSION_MODULES.includes(p as PermissionModule))) {
        return NextResponse.json({ error: 'Permisos inválidos' }, { status: 400 });
      }
    }

    // Comprobar que no exista el correo
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo' }, { status: 400 });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encontrar el primer ID faltante (reutilizar IDs eliminados)
    const allUsers = await prisma.user.findMany({
      select: { id: true },
      orderBy: { id: 'asc' }
    });
    
    let targetId = 1;
    for (const u of allUsers) {
      if (u.id === targetId) {
        targetId++;
      } else {
        break;
      }
    }

    // Crear usuario + bitácora de forma atómica
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          id: targetId,
          email,
          password: hashedPassword,
          name,
          role: role || 'USER',
          jobTitle: jobTitle || null,
          permissions: permissions ? JSON.stringify(permissions) : null
        }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          userName: session.name,
          action: 'CREATE_USER',
          details: `Usuario creado: ${email}`
        }
      });

      return created;
    });

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: 'Error al crear usuario', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}

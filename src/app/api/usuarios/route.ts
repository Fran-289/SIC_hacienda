import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Listar todos los usuarios
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: 'Error al obtener usuarios', details: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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

    // Crear usuario
    const newUser = await prisma.user.create({
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

    // Guardar en bitácora
    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        userName: session.name as string,
        action: 'CREATE_USER',
        details: `Usuario creado: ${email}`
      }
    });

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: 'Error al crear usuario', details: error.message }, { status: 500 });
  }
}

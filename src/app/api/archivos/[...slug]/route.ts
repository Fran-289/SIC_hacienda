import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/auth';
import { STORAGE_ROOT, allowedExtension, contentTypeFor } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string[] }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { slug } = await ctx.params;
    if (!Array.isArray(slug) || slug.length === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const isReports = slug[0] === 'reports' && slug.length >= 2;
    const isUploads = slug[0] === 'uploads' && slug[1] === 'reports' && slug.length >= 3;
    if (!isReports && !isUploads) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const rel = slug.join('/');
    const abs = path.resolve(STORAGE_ROOT, rel);
    if (!abs.startsWith(STORAGE_ROOT + path.sep)) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const fileName = path.basename(abs);
    if (!allowedExtension(fileName)) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    let data: Buffer;
    try {
      const stat = fs.statSync(abs);
      if (!stat.isFile()) throw new Error('not a file');
      data = fs.readFileSync(abs);
    } catch {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentTypeFor(fileName),
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

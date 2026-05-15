import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function toComment(row: any) {
  return {
    objectId: row.object_id,
    nick: row.nick,
    mail: row.mail || '',
    link: row.link || '',
    comment: row.comment,
    ua: row.ua || '',
    url: row.url,
    pid: row.pid || null,
    rid: row.rid || null,
    at: row.at || null,
    status: row.status,
    insertedAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    avatar: row.avatar || '',
    addr: row.addr || '',
    like: row.like_count || 0,
    level: row.level || 0,
    label: row.label || '',
    sticky: !!row.sticky,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const r: any = await prisma.client.$queryRawUnsafe(
      'SELECT * FROM wl_comment WHERE object_id = $1', id
    );
    if (r.length === 0) {
      return NextResponse.json({ errno: 1, errmsg: 'Comment not found' }, { status: 404 });
    }
    return NextResponse.json({ errno: 0, errmsg: '', data: toComment(r[0]) });
  } catch (e: any) {
    return NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.status) {
      await prisma.client.$executeRawUnsafe(
        'UPDATE wl_comment SET status = $1, updated_at = NOW() WHERE object_id = $2',
        body.status, id
      );
    }
    if (body.comment) {
      await prisma.client.$executeRawUnsafe(
        'UPDATE wl_comment SET comment = $1, updated_at = NOW() WHERE object_id = $2',
        body.comment.trim(), id
      );
    }
    const r: any = await prisma.client.$queryRawUnsafe(
      'SELECT * FROM wl_comment WHERE object_id = $1', id
    );
    if (r.length === 0) {
      return NextResponse.json({ errno: 1, errmsg: 'Comment not found' }, { status: 404 });
    }
    return NextResponse.json({ errno: 0, errmsg: '', data: toComment(r[0]) });
  } catch (e: any) {
    return NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.client.$executeRawUnsafe('DELETE FROM wl_comment WHERE pid = $1', id);
    await prisma.client.$executeRawUnsafe('DELETE FROM wl_comment WHERE object_id = $1', id);
    return NextResponse.json({ errno: 0, errmsg: '' });
  } catch (e: any) {
    return NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 });
  }
}

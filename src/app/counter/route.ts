import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cors, OPTIONS as corsOptions } from '@/lib/waline-cors';

export { corsOptions as OPTIONS };

async function ensureTable() {
  await prisma.client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS wl_counter (
      id SERIAL PRIMARY KEY,
      url VARCHAR(500) NOT NULL,
      type VARCHAR(100) DEFAULT '',
      time INTEGER DEFAULT 1,
      UNIQUE(url, type)
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const url = req.nextUrl.searchParams.get('path') || '/';
    const type = req.nextUrl.searchParams.get('type') || '';

    const r: any = await prisma.client.$queryRawUnsafe(
      'SELECT time FROM wl_counter WHERE url = $1 AND type = $2',
      url, type
    );
    const time = r.length > 0 ? r[0].time : 0;

    return cors(req, NextResponse.json({ errno: 0, errmsg: '', data: time }));
  } catch (e: any) {
    return cors(req, NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const url = body.url || '/';
    const type = body.type || '';

    const existing: any = await prisma.client.$queryRawUnsafe(
      'SELECT id, time FROM wl_counter WHERE url = $1 AND type = $2',
      url, type
    );

    if (existing.length > 0) {
      const newTime = existing[0].time + 1;
      await prisma.client.$executeRawUnsafe(
        'UPDATE wl_counter SET time = $1 WHERE id = $2',
        newTime, existing[0].id
      );
      return cors(req, NextResponse.json({ errno: 0, errmsg: '', data: newTime }));
    }

    await prisma.client.$executeRawUnsafe(
      'INSERT INTO wl_counter (url, type, time) VALUES ($1, $2, 1)',
      url, type
    );
    return cors(req, NextResponse.json({ errno: 0, errmsg: '', data: 1 }));
  } catch (e: any) {
    return cors(req, NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 }));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { cors, OPTIONS as corsOptions } from '@/lib/waline-cors';

export { corsOptions as OPTIONS };

function genId() {
  return crypto.randomUUID();
}

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

let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  await prisma.client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS wl_comment (
      id SERIAL PRIMARY KEY,
      object_id VARCHAR(36) UNIQUE NOT NULL,
      nick VARCHAR(255) NOT NULL,
      mail VARCHAR(255) DEFAULT '',
      link VARCHAR(500) DEFAULT '',
      comment TEXT NOT NULL,
      ua TEXT DEFAULT '',
      url VARCHAR(500) NOT NULL,
      pid VARCHAR(36) DEFAULT NULL,
      rid VARCHAR(36) DEFAULT NULL,
      at VARCHAR(255) DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'approved',
      ip VARCHAR(100) DEFAULT '',
      addr VARCHAR(255) DEFAULT '',
      avatar VARCHAR(500) DEFAULT '',
      like_count INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      label VARCHAR(255) DEFAULT '',
      sticky BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await prisma.client.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_wl_comment_url ON wl_comment(url, status, created_at DESC)');
  await prisma.client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS wl_counter (
      id SERIAL PRIMARY KEY,
      url VARCHAR(500) NOT NULL,
      type VARCHAR(100) DEFAULT '',
      time INTEGER DEFAULT 1,
      UNIQUE(url, type)
    )
  `);
  tablesReady = true;
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const url = req.nextUrl.searchParams.get('path') || '/';
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(req.nextUrl.searchParams.get('pageSize') || '10'), 100);
    const sort = req.nextUrl.searchParams.get('sort') || 'latest';
    const type = req.nextUrl.searchParams.get('type') || '';
    const offset = (page - 1) * pageSize;

    if (type === 'count') {
      const r: any = await prisma.client.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM wl_comment WHERE url = $1 AND status = $2',
        url, 'approved'
      );
      return cors(req, NextResponse.json({ errno: 0, errmsg: '', data: r[0].count }));
    }

    if (type === 'recent') {
      const count = Math.min(parseInt(req.nextUrl.searchParams.get('count') || '5'), 100);
      const r: any = await prisma.client.$queryRawUnsafe(
        'SELECT * FROM wl_comment WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
        'approved', count
      );
      return cors(req, NextResponse.json({ errno: 0, errmsg: '', data: r.map(toComment) }));
    }

    const countResult: any = await prisma.client.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS total FROM wl_comment WHERE url = $1 AND status = $2',
      url, 'approved'
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    const orderCol = sort === 'oldest' ? 'created_at ASC' : 'sticky DESC, created_at DESC';
    const rows: any = await prisma.client.$queryRawUnsafe(
      `SELECT * FROM wl_comment
       WHERE url = $1 AND status = $2 AND pid IS NULL
       ORDER BY ${sort === 'oldest' ? 'created_at ASC' : 'sticky DESC, created_at DESC'}
       LIMIT $3 OFFSET $4`,
      url, 'approved', pageSize, offset
    );

    const rootComments = rows.map(toComment);

    if (rootComments.length > 0) {
      const rootIds = rootComments.map((c: any) => c.objectId);
      const placeholders = rootIds.map((_: any, i: number) => `$${i + 1}`).join(',');
      const children: any = await prisma.client.$queryRawUnsafe(
        `SELECT * FROM wl_comment WHERE pid IN (${placeholders}) AND status = $${rootIds.length + 1} ORDER BY created_at ASC`,
        ...rootIds, 'approved'
      );
      const childComments = children.map(toComment);
      const childMap: Record<string, any> = {};
      for (const child of childComments) {
        child.children = [];
        childMap[child.objectId] = child;
      }
      for (const child of childComments) {
        if (child.rid && childMap[child.rid]) {
          childMap[child.rid].children.push(child);
        } else {
          const parent = rootComments.find((c: any) => c.objectId === child.pid);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(child);
          }
        }
      }
    }

    return cors(req, NextResponse.json({
      errno: 0,
      errmsg: '',
      data: { page, totalPages, pageSize, count: total, data: rootComments }
    }));
  } catch (e: any) {
    return cors(req, NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const objectId = genId();
    let nick = (body.nick && body.nick.trim()) || ('zhanfan' + Math.floor(Math.random() * 100000));

    const existing: any = await prisma.client.$queryRawUnsafe(
      'SELECT object_id FROM wl_comment WHERE nick = $1 LIMIT 1', nick
    );
    if (existing.length > 0) {
      const suffix = Math.floor(Math.random() * 100000);
      if (/_\d{5}$/.test(nick)) {
        nick = nick.replace(/_\d{5}$/, '_' + suffix);
      } else {
        nick = nick + '_' + suffix;
      }
    }
    if (!body.comment || !body.comment.trim()) {
      return cors(req, NextResponse.json({ errno: 1, errmsg: 'Comment content is required' }, { status: 400 }));
    }

    const url = body.url || '/';
    const ip = req.headers.get('x-forwarded-for') || '';
    const ua = body.ua || req.headers.get('user-agent') || '';

    await prisma.client.$executeRawUnsafe(
      `INSERT INTO wl_comment (object_id, nick, mail, link, comment, ua, url, pid, rid, at, status, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      objectId, nick, (body.mail || '').trim(), (body.link || '').trim(),
      body.comment.trim(), ua, url, body.pid || null, body.rid || null,
      body.at || null, 'approved', ip
    );

    const r: any = await prisma.client.$queryRawUnsafe(
      'SELECT * FROM wl_comment WHERE object_id = $1', objectId
    );
    return cors(req, NextResponse.json({ errno: 0, errmsg: '', data: toComment(r[0]) }));
  } catch (e: any) {
    return cors(req, NextResponse.json({ errno: 500, errmsg: e.message }, { status: 500 }));
  }
}

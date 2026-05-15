import { NextRequest, NextResponse } from 'next/server';

const WALINE_BACKEND = 'https://waline-two-sandy.vercel.app';

async function proxy(req: NextRequest, path: string) {
  const url = `${WALINE_BACKEND}${path}`;
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  try {
    const resp = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });
    const data = await resp.text();
    return new NextResponse(data, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ errno: 500, errmsg: 'Backend unreachable' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/comment/${id}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/comment/${id}`);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(req, `/comment/${id}`);
}

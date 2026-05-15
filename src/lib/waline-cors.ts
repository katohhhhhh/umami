import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN = 'https://hio42.asia';

export function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin');

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };

  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  }

  return headers;
}

export function cors(request: NextRequest, response: NextResponse) {
  const h = corsHeaders(request);
  for (const [key, value] of Object.entries(h)) {
    response.headers.set(key, value);
  }
  return response;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

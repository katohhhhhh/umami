import { NextRequest, NextResponse } from 'next/server';
import { cors, OPTIONS as corsOptions } from '@/lib/waline-cors';

export { corsOptions as OPTIONS };

export async function GET(req: NextRequest) {
  return cors(req, NextResponse.json({ errno: 0, data: null }));
}

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ errno: 0, data: null });
}

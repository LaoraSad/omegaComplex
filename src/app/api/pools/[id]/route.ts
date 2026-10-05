import { NextResponse } from 'next/server';
import { pools } from '@/lib/piscinas/pools-data';

// GET /api/pools/[id]  → piscina individual
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pool = pools.find((p) => p.id === id);

  if (!pool) {
    return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
  }

  return NextResponse.json({ data: pool });
}

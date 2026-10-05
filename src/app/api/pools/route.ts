import { NextResponse } from 'next/server';
import { pools } from '@/lib/piscinas/pools-data';

// GET /api/pools  → lista todas las piscinas
export async function GET() {
  return NextResponse.json({ data: pools, total: pools.length });
}

import { NextResponse } from "next/server";

// Liveness: responde aunque la base de datos esté lenta o caída. El chequeo
// de readiness (que sí toca la BD) queda en la página principal.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

import type { Metadata } from "next";
import ValidarView from "./ValidarView";

export const metadata: Metadata = { title: "Validar QR" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ValidarPage() {
  return <ValidarView />;
}
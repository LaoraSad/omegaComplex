import type { Metadata } from "next";
import ValidarView from "./ValidarView";

export const metadata: Metadata = { title: "Validar QR" };

export default function ValidarPage() {
  return <ValidarView />;
}
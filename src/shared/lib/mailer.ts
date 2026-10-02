// Mailer transaccional.
// TODO: definir provider (Resend/Nodemailer) y plantillas.
export async function sendMail(_opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  throw new Error("Mailer no implementado");
}

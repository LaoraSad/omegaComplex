import "server-only";

import QRCode from "qrcode";
import { Resend } from "resend";

let resendClient: Resend | undefined;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada");
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@omegacomplex.coderhivex.com";
  if (!from.toLowerCase().endsWith("@omegacomplex.coderhivex.com")) {
    throw new Error("RESEND_FROM_EMAIL debe utilizar el dominio verificado en Resend");
  }
  return `Omega Complex <${from}>`;
}

function getAppUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL debe estar configurada en producción");
  }

  const url = new URL(configuredUrl ?? "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL debe utilizar HTTPS en producción");
  }
  return url.origin;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function emailLayout(content: string): string {
  const appUrl = getAppUrl();
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f1f1;color:#242124;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f1;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-top:7px solid #7a1f3d">
        <tr><td align="center" style="padding:30px 24px 20px;background:#7a1f3d">
          <img src="${appUrl}/Logo-blanco.png" width="168" alt="Omega Complex" style="display:block;width:168px;max-width:70%;height:auto">
        </td></tr>
        <tr><td style="padding:30px 28px 34px">${content}</td></tr>
        <tr><td style="border-top:1px solid #e6e3e4;padding:18px 24px;text-align:center;color:#777;font-size:12px;line-height:1.6">
          Omega Complex · Deporte, bienestar y recreación<br>Este mensaje fue enviado automáticamente. No respondas a este correo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await getClient().emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend rechazó el correo: ${error.message}`);
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const safeCode = escapeHtml(code);
  await send(
    to,
    "Tu código de verificación - Omega Complex",
    emailLayout(`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Verifica tu correo electrónico</h1>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.6">Tu código de verificación es:</p>
      <div style="margin:0 0 20px;padding:17px 12px;border:1px solid #eadde1;background:#fbf7f8;color:#7a1f3d;text-align:center;font-size:34px;font-weight:800;letter-spacing:8px">${safeCode}</div>
      <p style="margin:0 0 9px;color:#555;font-size:14px;line-height:1.6">Este código expirará en unos minutos.</p>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.6">No compartas este código con nadie.</p>`),
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    to,
    "Restablece tu contraseña - Omega Complex",
    emailLayout(`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Restablece tu contraseña</h1>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.65">Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa el botón para elegir una nueva.</p>
      <p style="margin:0 0 26px;text-align:center"><a href="${resetUrl}" style="display:inline-block;padding:14px 23px;background:#7a1f3d;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">Restablecer contraseña</a></p>
      <p style="margin:0 0 9px;color:#555;font-size:13px;line-height:1.6">El enlace expirará en 30 minutos y solo puede utilizarse una vez.</p>
      <p style="margin:0;color:#777;font-size:13px;line-height:1.6">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña no cambiará.</p>`),
  );
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  await send(
    to,
    "¡Bienvenido a Omega Complex!",
    emailLayout(`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">¡Bienvenido a Omega Complex!</h1>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.65">Hola ${escapeHtml(firstName)}, tu correo fue verificado correctamente y tu cuenta ya está lista.</p>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.65">Nos alegra tenerte en nuestra comunidad. Te esperamos para disfrutar de nuestras instalaciones y actividades.</p>`),
  );
}

export type QrParaCorreo = {
  /** Etiqueta legible: Z1-P01 (zona 1, persona 1). */
  etiqueta: string;
  servicio: string;
  zona: string;
  nombre: string;
  /** Token crudo: es lo que el empleado escanea. Solo existe en este momento. */
  token: string;
};

/**
 * Envía los QR de una reserva confirmada. Cada código se genera aquí como
 * imagen PNG embebida (data URL): el token crudo solo se guarda hasheado en
 * la base, así que este correo es la única entrega del código escaneable.
 */
export async function sendQrEmail(
  to: string,
  input: { nombre: string; fecha: string; codigos: QrParaCorreo[] },
): Promise<void> {
  const tarjetas = await Promise.all(
    input.codigos.map(async (qr) => {
      const imagen = await QRCode.toDataURL(qr.token, {
        width: 220,
        margin: 1,
        color: { dark: "#211a1d", light: "#ffffff" },
      });
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;border:1px solid #eadde1;border-radius:10px;overflow:hidden">
        <tr><td align="center" style="padding:16px 12px 8px">
          <img src="${imagen}" width="200" alt="QR ${escapeHtml(qr.etiqueta)}" style="display:block;width:200px;max-width:100%;height:auto">
        </td></tr>
        <tr><td align="center" style="padding:0 12px 4px;color:#7a1f3d;font-size:15px;font-weight:800;letter-spacing:1px">${escapeHtml(qr.etiqueta)} · ${escapeHtml(qr.nombre)}</td></tr>
        <tr><td align="center" style="padding:0 12px 14px;color:#555;font-size:13px">${escapeHtml(qr.servicio)} — ${escapeHtml(qr.zona)}</td></tr>
      </table>`;
    }),
  );

  await send(
    to,
    "Tus códigos QR - Omega Complex",
    emailLayout(`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Reserva confirmada</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Hola ${escapeHtml(input.nombre)}, estos son tus QR</h1>
      <p style="margin:0 0 18px;color:#555;font-size:15px;line-height:1.65">Reserva para el <strong>${escapeHtml(input.fecha)}</strong>. Presenta cada código en la puerta de su zona. Cada QR es de un solo uso y solo sirve el día de la reserva.</p>
      ${tarjetas.join("")}
      <p style="margin:0;color:#777;font-size:13px;line-height:1.6">Si no ves las imágenes, pide ayuda en recepción con tu documento.</p>`),
  );
}
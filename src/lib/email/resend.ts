import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import QRCode from "qrcode";
import { Resend } from "resend";

import { formatShortCode } from "@/features/access/short-code";

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

/**
 * Imagen embebida por CID.
 *
 * Las imágenes NO van como `data:` URL ni como URL pública: Gmail y casi todos
 * los clientes bloquean ambos esquemas (las remotas por privacy y las `data:`
 * por completo) y muestran el texto `alt` en su lugar. La forma estándar es
 * adjuntar el binario como parte MIME con su Content-ID y referenciarlo en el
 * HTML con `cid:...`.
 */
type AdjuntoCid = {
  nombre: string;
  contenido: Buffer;
  contentId: string;
  /**
   * El tipo MIME es obligatorio: sin `content_type` la parte MIME llega como
   * un adjunto genérico y el cliente no la renderiza, mostrando el `alt` en vez
   * de la imagen. Con esto el QR y el logo se ven EN LINEA en el cuerpo del
   * correo y no figuran como archivos adjuntos sueltos.
   */
  tipo: "image/png" | "image/jpeg" | "application/pdf";
};

const CID_LOGO = "logo";

/**
 * Adjunta el logo desde `public/`. Antes se referenciaba como
 * `${appUrl}/Logo-blanco.png`, y eso nunca se veía: en desarrollo la URL es
 * localhost, que el servidor de correo no alcanza, y en producción el cliente
 * bloquea la imagen remota hasta que el usuario la habilita.
 */
async function adjuntarLogo(adjuntos: AdjuntoCid[]): Promise<AdjuntoCid[]> {
  try {
    const contenido = await readFile(join(process.cwd(), "public", "Logo-blanco.png"));
    return [{ nombre: "logo.png", contenido, contentId: CID_LOGO, tipo: "image/png" }, ...adjuntos];
  } catch {
    // Sin logo el correo igual se ve: cae la banda de color y sigue el texto.
    return adjuntos;
  }
}

function emailLayout(contenido: string, hayLogo: boolean): string {
  const logo = hayLogo
    ? `<img src="cid:${CID_LOGO}" width="168" alt="Omega Complex" style="display:block;width:168px;max-width:70%;height:auto;border:0">`
    : `<span style="color:#fff;font-size:20px;font-weight:bold;letter-spacing:1px">Omega Complex</span>`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f1f1;color:#242124;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f1;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-top:7px solid #7a1f3d">
        <tr><td align="center" style="padding:30px 24px 20px;background:#7a1f3d">
          ${logo}
        </td></tr>
        <tr><td style="padding:30px 28px 34px">${contenido}</td></tr>
        <tr><td style="border-top:1px solid #e6e3e4;padding:18px 24px;text-align:center;color:#777;font-size:12px;line-height:1.6">
          Omega Complex · Deporte, bienestar y recreación<br>Este mensaje fue enviado automáticamente. No respondas a este correo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function send(
  to: string,
  subject: string,
  contenido: string,
  adjuntos: AdjuntoCid[] = [],
): Promise<void> {
  const todos = await adjuntarLogo(adjuntos);
  const hayLogo = todos.length > adjuntos.length;

  const { error } = await getClient().emails.send({
    from: getFromEmail(),
    to,
    subject,
    html: emailLayout(contenido, hayLogo),
    ...(todos.length
      ? {
          attachments: todos.map((a) => ({
            filename: a.nombre,
            content: a.contenido,
            content_id: a.contentId,
            content_type: a.tipo,
          })),
        }
      : {}),
  });
  if (error) throw new Error(`Resend rechazó el correo: ${error.message}`);
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const safeCode = escapeHtml(code);
  await send(
    to,
    "Tu código de verificación - Omega Complex",
`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Verifica tu correo electrónico</h1>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.6">Tu código de verificación es:</p>
      <div style="margin:0 0 20px;padding:17px 12px;border:1px solid #eadde1;background:#fbf7f8;color:#7a1f3d;text-align:center;font-size:34px;font-weight:800;letter-spacing:8px">${safeCode}</div>
      <p style="margin:0 0 9px;color:#555;font-size:14px;line-height:1.6">Este código expirará en unos minutos.</p>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.6">No compartas este código con nadie.</p>`,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    to,
    "Restablece tu contraseña - Omega Complex",
`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Restablece tu contraseña</h1>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.65">Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa el botón para elegir una nueva.</p>
      <p style="margin:0 0 26px;text-align:center"><a href="${resetUrl}" style="display:inline-block;padding:14px 23px;background:#7a1f3d;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">Restablecer contraseña</a></p>
      <p style="margin:0 0 9px;color:#555;font-size:13px;line-height:1.6">El enlace expirará en 30 minutos y solo puede utilizarse una vez.</p>
      <p style="margin:0;color:#777;font-size:13px;line-height:1.6">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña no cambiará.</p>`,
  );
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  await send(
    to,
    "¡Bienvenido a Omega Complex!",
`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">¡Bienvenido a Omega Complex!</h1>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.65">Hola ${escapeHtml(firstName)}, tu correo fue verificado correctamente y tu cuenta ya está lista.</p>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.65">Nos alegra tenerte en nuestra comunidad. Te esperamos para disfrutar de nuestras instalaciones y actividades.</p>`,
  );
}

/**
 * Aviso de pago rechazado. Sin adjuntos: lo único que necesita el
 * cliente es saber que el cobro no entró y que puede intentarlo de nuevo.
 */
export async function sendPagoRechazadoEmail(
  to: string,
  input: { nombre: string; fecha: string; servicio: string; montoCop: number; motivo?: string | null },
): Promise<void> {
  const monto = `$${input.montoCop.toLocaleString("es-CO")} COP`;
  await send(
    to,
    "Tu pago no pudo completarse - Omega Complex",
`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Tu pago no pudo completarse</h1>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.65">Hola ${escapeHtml(input.nombre)}, el cobro de tu reserva no fue aprobado y no se descontó ningún valor.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fbf7f8;border-left:4px solid #7a1f3d">
        <tr>
          <td style="padding:14px 16px">
            <p style="margin:0 0 4px;color:#9a9a9a;font-size:11px;font-weight:bold;letter-spacing:1.3px;text-transform:uppercase">Reserva</p>
            <p style="margin:0 0 10px;color:#242124;font-size:16px;font-weight:bold">${escapeHtml(input.servicio)} · ${escapeHtml(input.fecha)}</p>
            <p style="margin:0 0 4px;color:#9a9a9a;font-size:11px;font-weight:bold;letter-spacing:1.3px;text-transform:uppercase">Monto no cobrado</p>
            <p style="margin:0;color:#242124;font-size:14px">${escapeHtml(monto)}</p>
          </td>
        </tr>
      </table>
      ${input.motivo ? `<p style="margin:0 0 14px;color:#555;font-size:13px;line-height:1.6">Motivo reportado: ${escapeHtml(input.motivo)}</p>` : ""}
      <p style="margin:0;color:#555;font-size:14px;line-height:1.65">Puedes volver a crear tu reserva e intentarlo con otro medio de pago. Si el problema persiste, escríbenos a recepción.</p>`,
  );
}

/**
 * Aviso de hold expirado. El bloqueo de 10 minutos se venció sin
 * pago y los cupos volvieron al inventario: la reserva hay que crearla de nuevo.
 */
export async function sendHoldExpiradoEmail(
  to: string,
  input: { nombre: string; fecha: string; servicio: string },
): Promise<void> {
  await send(
    to,
    "Tu reserva expiró por falta de pago - Omega Complex",
`<p style="margin:0 0 8px;color:#7a1f3d;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">Omega Complex</p>
      <h1 style="margin:0 0 18px;color:#242124;font-size:25px;line-height:1.25">Tu reserva expiró</h1>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.65">Hola ${escapeHtml(input.nombre)}, el bloqueo de 10 minutos para pagar tu reserva se venció y los cupos volvieron a estar disponibles.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fbf7f8;border-left:4px solid #7a1f3d">
        <tr>
          <td style="padding:14px 16px">
            <p style="margin:0 0 4px;color:#9a9a9a;font-size:11px;font-weight:bold;letter-spacing:1.3px;text-transform:uppercase">Reserva vencida</p>
            <p style="margin:0;color:#242124;font-size:16px;font-weight:bold">${escapeHtml(input.servicio)} · ${escapeHtml(input.fecha)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.65">Si aún quieres asistir, crea la reserva de nuevo y completa el pago dentro de los 10 minutos.</p>`,
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
  /**
   * Código corto transcribible. Es el mismo acceso que el token: si a la
   * puerta la cámara falla, el cliente dicta este código y el empleado lo
   * teclea en lugar de quedarse sin poder entrar.
   */
  codigoCorto?: string;
};

/**
 * Envía los QR de una reserva confirmada. Cada código se genera aquí como
 * imagen PNG embebida (data URL): el token crudo solo se guarda hasheado en
 * la base, así que este correo es la única entrega del código escaneable.
 */
export async function sendQrEmail(
  to: string,
  input: { nombre: string; fecha: string; codigos: QrParaCorreo[]; documento?: string | null },
): Promise<void> {
  // El PDF vuelve como adjunto a propósito: es la versión imprimible que el
  // empleado usa en la puerta. Va con el logo y el QR escaneable.
  const adjuntos: AdjuntoCid[] = [];

  try {
    const { generarPdfQr } = await import("@/shared/pdf/qr-pdf");
    const pdf = await generarPdfQr({
      nombre: input.nombre,
      fecha: input.fecha,
      codigos: input.codigos,
      documento: input.documento ?? null,
    });
    adjuntos.push({
      nombre: "codigos-qr.pdf",
      contenido: Buffer.from(pdf),
      contentId: "qr-pdf",
      tipo: "application/pdf",
    });
  } catch {
    // Si el PDF falla, los QR del cuerpo siguen sirviendo.
  }
  // Tarjeta de cada persona. El borde es solido y no una sombra: `box-shadow`
  // casi no se representa en clientes de correo y `border-radius` tampoco en
  // Outlook, así que el diseño se apoya en bordes y espacios, que sí aguantan.
  const tarjetas = await Promise.all(
    input.codigos.map(async (qr, indice) => {
      const png = await QRCode.toBuffer(qr.token, {
        width: 220,
        margin: 1,
        color: { dark: "#211a1d", light: "#ffffff" },
      });

      // El content_id no admite acentos ni caracteres especiales.
      const cid = `qr-${indice + 1}`;
      adjuntos.push({ nombre: `${cid}.png`, contenido: png, contentId: cid, tipo: "image/png" });

      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#ffffff;border:2px solid #eadde1">
          <tr>
            <td align="center" style="padding:14px 14px 10px">
              <img src="cid:${cid}" width="196" alt="Código QR ${escapeHtml(qr.etiqueta)}" style="display:block;width:196px;max-width:100%;height:auto;border:0">
            </td>
          </tr>
          <tr><td align="center" style="padding:0 16px 2px;border-top:1px solid #f0e8ea">
              <span style="display:inline-block;padding:3px 10px;background:#7a1f3d;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1.5px">${escapeHtml(qr.etiqueta)}</span>
            </td></tr>
          <tr><td align="center" style="padding:8px 16px 0;color:#242124;font-size:16px;font-weight:bold">${escapeHtml(qr.nombre)}</td></tr>
          <tr><td align="center" style="padding:3px 16px 14px;color:#6b6b6b;font-size:13px">${escapeHtml(qr.servicio)} &middot; ${escapeHtml(qr.zona)}</td></tr>
          ${
            qr.codigoCorto
              ? `<tr><td align="center" style="padding:0 16px 14px">
                  <span style="display:inline-block;padding:5px 10px;border:1px dashed #b9a6ac;border-radius:6px;color:#4b4447;font-family:Menlo,Consolas,monospace;font-size:14px;font-weight:bold;letter-spacing:2px">${escapeHtml(formatShortCode(qr.codigoCorto))}</span>
                  <p style="margin:6px 0 0;color:#8a8085;font-size:11px">Si la cámara del empleado falla, dicta este código.</p>
                </td></tr>`
              : ""
          }
        </table>`;
    }),
  );

  // Solo van los QR en línea. Ni el PDF ni el logo se adjuntan: el cliente los
  // ve Listedos como archivos sueltos en el correo y eso distrae de lo único
  // que importa, que es el código.
  await send(
    to,
    "Tus códigos QR - Omega Complex",
    `<h1 style="margin:0 0 10px;color:#242124;font-size:24px;line-height:1.3">Listo, ${escapeHtml(input.nombre.split(" ")[0])}</h1>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.65">Su reserva está confirmada. A continuación encontrará los códigos de acceso.</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fbf7f8;border-left:4px solid #7a1f3d">
        <tr>
          <td style="padding:14px 16px">
            <p style="margin:0 0 4px;color:#9a9a9a;font-size:11px;font-weight:bold;letter-spacing:1.3px;text-transform:uppercase">Cuándo</p>
            <p style="margin:0 0 10px;color:#242124;font-size:16px;font-weight:bold">${escapeHtml(input.fecha)}</p>
            <p style="margin:0 0 4px;color:#9a9a9a;font-size:11px;font-weight:bold;letter-spacing:1.3px;text-transform:uppercase">Dónde</p>
            <p style="margin:0;color:#242124;font-size:14px">Recepción de Omega Complex</p>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px"><tr>
        <td style="padding:0">
          <p style="margin:0;color:#242124;font-size:15px;font-weight:bold">Cómo entrar</p>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px">
        <tr><td style="padding:0 0 8px;color:#555;font-size:14px;line-height:1.7">1. Muestre el código en recepción y, a partir de ahí, úselo en la <strong>puerta de su zona</strong>.</td></tr>
        <tr><td style="padding:0 0 8px;color:#555;font-size:14px;line-height:1.7">2. Cada persona y cada zona tiene su propio código.</td></tr>
        <tr><td style="padding:0;color:#555;font-size:14px;line-height:1.7">3. El código es válido únicamente ese día y puede utilizarse una sola vez.</td></tr>
      </table>

      ${tarjetas.join("")}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;background:#f6f6f6">
        <tr><td style="padding:14px 16px;color:#6b6b6b;font-size:13px;line-height:1.65">
          <strong style="color:#242124">¿No se le carga alguna imagen?</strong><br>
          Abra el PDF adjunto a este correo. Si tampoco funciona, acuda a recepción con su documento y le ayudaremos.
        </td></tr>
      </table>`,
    adjuntos,
  );
}

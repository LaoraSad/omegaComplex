import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";

let resendClient: Resend | undefined;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada");
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@omegacomplex.coderhivex.com";
  if (!from.toLowerCase().endsWith("@omegacomplex.coderhivex.com")) {
    throw new Error("RESEND_FROM_EMAIL debe utilizar el dominio verificado en Resend");
  }
  return `Omega Complex <${from}>`;
}

export function getAppUrl(): string {
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

export function escapeHtml(value: string): string {
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

const LOGO_CID = "omega-logo";

function getLogoBuffer(): Buffer {
  const logoPath = join(process.cwd(), "public", "logo-blanco.png");
  return readFileSync(logoPath);
}

function getLogoAttachments() {
  return [
    {
      filename: "logo-blanco.png",
      content: getLogoBuffer(),
      contentType: "image/png",
      contentId: LOGO_CID,
      contentDisposition: "inline" as const,
    },
  ];
}

function emailLayout(content: string): string {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Omega Complex</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .button-full { width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3f0;font-family:Georgia,'Times New Roman',Times,serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f3f0;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- HEADER VINOTINTO CON LOGO -->
          <tr>
            <td style="background-color:#6b1d3f;padding:40px 40px 36px;text-align:center;">
              <img src="cid:${LOGO_CID}" alt="Omega Complex" width="200" style="display:block;width:200px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">
              <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',Times,serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#e8d5b7;">Deporte &middot; Bienestar &middot; Comunidad</p>
            </td>
          </tr>

          <!-- CONTENIDO PRINCIPAL -->
          <tr>
            <td class="content-padding" style="padding:48px 48px 40px;">

              ${content}

            </td>
          </tr>

          <!-- DIVISOR DECORATIVO -->
          <tr>
            <td style="padding:0 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top:1px solid #e8e2d9;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 48px 36px;text-align:center;background-color:#faf8f5;">
              <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;color:#8a7e74;">Omega Complex &middot; Complejo Deportivo</p>
              <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:12px;color:#a89e94;">Deporte, bienestar y recreaci&oacute;n</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:11px;color:#c4bab0;">Este mensaje fue enviado autom&aacute;ticamente. No respondas a este correo.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function verificationContent(code: string): string {
  const safeCode = escapeHtml(code);
  return `
  <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:700;color:#1a1a1a;line-height:1.3;">Verifica tu correo electr&oacute;nico</h1>
  <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;color:#4a4a4a;line-height:1.6;">Para completar tu registro en Omega Complex, utiliza el siguiente c&oacute;digo de verificaci&oacute;n:</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
    <tr>
      <td align="center" style="background-color:#faf6f2;border:1px solid #e8d5c8;border-radius:8px;padding:24px 20px;">
        <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9a8474;">Tu c&oacute;digo de verificaci&oacute;n</p>
        <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:6px;color:#6b1d3f;">${safeCode}</p>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;color:#7a6e64;">Este c&oacute;digo expirar&aacute; en <strong>10 minutos</strong>.</p>
  <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;color:#9a8e84;">No compartas este c&oacute;digo con nadie.</p>
`;
}

function passwordResetContent(token: string): string {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return `
  <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:700;color:#1a1a1a;line-height:1.3;">Restablece tu contrase&ntilde;a</h1>
  <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;color:#4a4a4a;line-height:1.6;">Recibimos una solicitud para cambiar la contrase&ntilde;a de tu cuenta. Usa el siguiente bot&oacute;n para elegir una nueva:</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
    <tr>
      <td align="center">
        <a href="${resetUrl}" class="button-full" style="display:inline-block;padding:16px 40px;background-color:#6b1d3f;color:#ffffff;text-decoration:none;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;font-weight:700;letter-spacing:0.5px;border-radius:6px;border:0;cursor:pointer;">Restablecer contrase&ntilde;a</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;color:#7a6e64;">El enlace expirar&aacute; en <strong>30 minutos</strong> y solo puede utilizarse una vez.</p>
  <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;color:#9a8e84;">Si no solicitaste este cambio, ignora este mensaje. Tu contrase&ntilde;a no cambiar&aacute;.</p>
`;
}

function welcomeContent(firstName: string): string {
  const safeFirstName = escapeHtml(firstName);
  const visitUrl = `${getAppUrl()}/servicios`;
  return `
  <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:700;color:#1a1a1a;line-height:1.3;">&iexcl;Bienvenido a Omega Complex!</h1>
  <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;color:#4a4a4a;line-height:1.6;">Hola <strong>${safeFirstName}</strong>, tu correo fue verificado correctamente y tu cuenta ya est&aacute; lista.</p>
  <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;color:#4a4a4a;line-height:1.6;">Nos alegra tenerte en nuestra comunidad. Te esperamos para disfrutar de nuestras instalaciones y actividades.</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
    <tr>
      <td align="center">
        <a href="${visitUrl}" class="button-full" style="display:inline-block;padding:16px 40px;background-color:#6b1d3f;color:#ffffff;text-decoration:none;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;font-weight:700;letter-spacing:0.5px;border-radius:6px;border:0;cursor:pointer;">Visitar Omega Complex</a>
      </td>
    </tr>
  </table>
  <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;color:#6b6e64;line-height:1.6;">&iexcl;Vive el deporte!</p>
`;
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const { error } = await getClient().emails.send({
    from: getFromEmail(),
    to,
    subject: "Tu c&oacute;digo de verificaci&oacute;n - Omega Complex",
    html: emailLayout(verificationContent(code)),
    attachments: getLogoAttachments(),
  });
  if (error) throw new Error(`Resend rechaz&oacute; el correo: ${error.message}`);
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const { error } = await getClient().emails.send({
    from: getFromEmail(),
    to,
    subject: "Restablece tu contrase&ntilde;a - Omega Complex",
    html: emailLayout(passwordResetContent(token)),
    attachments: getLogoAttachments(),
  });
  if (error) throw new Error(`Resend rechaz&oacute; el correo: ${error.message}`);
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const { error } = await getClient().emails.send({
    from: getFromEmail(),
    to,
    subject: "&iexcl;Bienvenido a Omega Complex!",
    html: emailLayout(welcomeContent(firstName)),
    attachments: getLogoAttachments(),
  });
  if (error) throw new Error(`Resend rechaz&oacute; el correo: ${error.message}`);
}

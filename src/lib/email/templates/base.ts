import "server-only";

import { getAppUrl, escapeHtml } from "../resend";

export function emailHeader(logoAlt = "Omega Complex"): string {
  const appUrl = getAppUrl();
  return `<tr>
    <td align="center" style="padding:30px 24px 20px;background:#7a1f3d">
      <img src="${appUrl}/Logo-blanco.png" width="168" alt="${logoAlt}" style="display:block;width:168px;max-width:70%;height:auto">
    </td>
  </tr>`;
}

export function emailFooter(): string {
  return `<tr>
    <td style="border-top:1px solid #e6e3e4;padding:18px 24px;text-align:center;color:#777;font-size:12px;line-height:1.6">
      Omega Complex · Deporte, bienestar y recreación<br>
      Este mensaje fue enviado automáticamente. No respondas a este correo.
    </td>
  </tr>`;
}

export function emailMainContent(
  title: string,
  titleColor: string,
  subtitle: string,
  subtitleColor: string,
  code?: string,
  codeColor?: string,
  codeBackground?: string,
  buttonUrl?: string,
  buttonText?: string,
  buttonColor?: string,
  buttonHoverColor?: string,
  secondaryText?: string,
  secondaryColor?: string
): string {
  let codeHtml = "";
  if (code) {
    codeHtml = `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Tu código de verificación es:</p>
      <div style="margin:0 0 20px;padding:17px 12px;border:1px solid ${codeBackground || '#eadde1'};background:${codeBackground || '#fbf7f8'};color:${codeColor || '#7a1f3d'};text-align:center;font-size:34px;font-weight:800;letter-spacing:8px">${escapeHtml(code)}</div>`;
  }

  let buttonHtml = "";
  if (buttonUrl) {
    buttonHtml = `<p style="text-align:center"><a href="${buttonUrl}" style="display:inline-block;padding:14px 23px;background:${buttonColor || '#7a1f3d'};color:${buttonHoverColor || '#fff'};text-decoration:none;font-size:14px;font-weight:bold">${escapeHtml(buttonText || 'Acción')}</a></p>`;
  }

  let secondaryHtml = "";
  if (secondaryText) {
    secondaryHtml = `<p style="margin:0;color:${secondaryColor || '#555'};font-size:14px;line-height:1.6">${secondaryText}</p>`;
  }

  return `<tr>
    <td style="padding:30px 28px 34px">
      <h1 style="margin:0 0 18px;color:${titleColor || '#242124'};font-size:25px;line-height:1.25">${escapeHtml(title)}</h1>
      <p style="margin:0 0 14px;color:${subtitleColor || '#555'};font-size:15px;line-height:1.6">${escapeHtml(subtitle)}</p>
      ${codeHtml}
      ${buttonHtml}
      ${secondaryHtml}
    </td>
  </tr>`;
}
/**
 * Reconversión de fotos 360 a formatos modernos (Fase 2 del plan de imágenes).
 *
 * Por cada JPG en public/360 genera en public/360/opt:
 *   - <nombre>.avif  (calidad 55, effort 4)
 *   - <nombre>.webp  (calidad 78)
 *   - <nombre>.viewer.avif (calidad 75: tier de alta fidelidad para texturas WebGL)
 * Y escribe src/lib/storefront/optimized-360.ts con el manifiesto:
 *   { "<ruta-original>": { avif, webp, viewer, jpg, blur } }
 *
 * Uso:
 *   npm run optimize:360
 *   # Fase 3: suelta las fotos nuevas en public/360-originals/ y re-corre.
 *   # Si un JPG de public/360 cambia, re-corre para regenerar sus derivados.
 *
 * Idempotente: solo regenera cuando el origen es más nuevo que los derivados.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const SRC_DIR = path.join(root, 'public', '360');
const ORIGINALS_DIR = path.join(root, 'public', '360-originals');
const OUT_DIR = path.join(SRC_DIR, 'opt');
const MANIFEST_PATH = path.join(root, 'src', 'lib', 'storefront', 'optimized-360.ts');

const AVIF_OPTS = { quality: 55, effort: 4 };
const VIEWER_AVIF_OPTS = { quality: 75, effort: 5 };
const WEBP_OPTS = { quality: 78, effort: 4 };

async function listSources() {
  const inputs = [SRC_DIR, ORIGINALS_DIR];
  const found = [];
  for (const dir of inputs) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue; // Fase 3 aún sin carpeta: no es error.
    }
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!/\.(jpe?g|png)$/i.test(e.name)) continue;
      found.push(path.join(dir, e.name));
    }
  }
  return found;
}

async function newerThan(source, targets) {
  const { mtimeMs } = await fs.stat(source);
  for (const t of targets) {
    try {
      const st = await fs.stat(t);
      if (st.mtimeMs < mtimeMs) return true;
    } catch {
      return true; // no existe: hay que generar.
    }
  }
  return false;
}

function publicPath(abs) {
  return `/360/opt/${path.basename(abs, path.extname(abs))}`;
}

async function main() {
  const sources = await listSources();
  if (sources.length === 0) {
    console.log('[optimize:360] sin fuentes en public/360 ni public/360-originals.');
    return;
  }
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Lee el manifiesto previo para no perder el blur de fotos ya procesadas.
  let manifest = {};
  try {
    const prev = await fs.readFile(MANIFEST_PATH, 'utf8');
    const m = prev.match(/export const OPTIMIZED_360 = (\{[\s\S]*?\}) as const;/);
    if (m) manifest = JSON.parse(m[1]);
  } catch {
    /* primera corrida */
  }

  let done = 0;
  let skipped = 0;
  for (const src of sources) {
    const base = path.basename(src, path.extname(src));
    const avifAbs = path.join(OUT_DIR, `${base}.avif`);
    const webpAbs = path.join(OUT_DIR, `${base}.webp`);
    const viewerAbs = path.join(OUT_DIR, `${base}.viewer.avif`);
    const originalPublic =
      path.dirname(src) === ORIGINALS_DIR
        ? `/360-originals/${path.basename(src)}`
        : `/360/${path.basename(src)}`;

    if (!(await newerThan(src, [avifAbs, webpAbs, viewerAbs]))) {
      skipped += 1;
      continue;
    }

    const pipeline = sharp(src, { failOn: 'none' }).rotate();
    await pipeline.clone().avif(AVIF_OPTS).toFile(avifAbs);
    await pipeline.clone().avif(VIEWER_AVIF_OPTS).toFile(viewerAbs);
    await pipeline.clone().webp(WEBP_OPTS).toFile(webpAbs);

    // Placeholder blur de 20px para next/image (placeholder="blur").
    const blurBuf = await sharp(src, { failOn: 'none' })
      .rotate()
      .resize(20, 20, { fit: 'inside' })
      .jpeg({ quality: 40 })
      .toBuffer();
    const blur = `data:image/jpeg;base64,${blurBuf.toString('base64')}`;

    manifest[originalPublic] = {
      avif: `${publicPath(src)}.avif`,
      webp: `${publicPath(src)}.webp`,
      viewer: `${publicPath(src)}.viewer.avif`,
      jpg: originalPublic,
      blur,
    };
    done += 1;
    console.log(`[optimize:360] ${path.basename(src)} → avif+webp+blur`);
  }

  const body =
    `/** Generado por \`npm run optimize:360\`. No editar a mano. */\n` +
    `export const OPTIMIZED_360 = ${JSON.stringify(manifest, null, 2)} as const;\n\n` +
    `export type Optimized360Key = keyof typeof OPTIMIZED_360;\n\n` +
    `/** Devuelve los derivados optimizados de una foto /360 (o null si no existen). */\n` +
    `export function optimized360(src: string) {\n` +
    `  return (OPTIMIZED_360 as Record<string, (typeof OPTIMIZED_360)[Optimized360Key] | undefined>)[src] ?? null;\n` +
    `}\n`;
  await fs.writeFile(MANIFEST_PATH, body);

  // Reporte de pesos.
  let origBytes = 0;
  let avifBytes = 0;
  let viewerBytes = 0;
  for (const key of Object.keys(manifest)) {
    try {
      const rel = key.startsWith('/360-originals/')
        ? path.join(root, 'public', key)
        : path.join(root, 'public', key);
      origBytes += (await fs.stat(rel)).size;
    } catch { /* origen movido en Fase 3 */ }
    try {
      avifBytes += (await fs.stat(path.join(root, 'public', manifest[key].avif))).size;
    } catch { /* noop */ }
    try {
      if (manifest[key].viewer) {
        viewerBytes += (await fs.stat(path.join(root, 'public', manifest[key].viewer))).size;
      }
    } catch { /* manifiesto viejo sin tier viewer */ }
  }
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`[optimize:360] generadas=${done} omitidas=${skipped} | originales=${kb(origBytes)} avif=${kb(avifBytes)} viewer=${kb(viewerBytes)}`);
}

main().catch((err) => {
  console.error('[optimize:360] falló:', err);
  process.exit(1);
});

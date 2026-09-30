/**
 * Renders the fallback share card to public/og-default.jpg at 1200x630.
 *
 * Run with `node scripts/build-og-image.mjs` after changing the masthead. The
 * output is committed, so nothing renders images at request time.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "og-default.jpg");

const WASHI = "#f2ede1";
const SUMI = "#1c1b18";
const SEAL = "#c1272d";
const RULE = "#d8d0be";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${WASHI}"/>
  <text x="72" y="92" font-family="Helvetica, Arial, sans-serif" font-size="22"
        letter-spacing="7" fill="${SUMI}" opacity="0.55">FROM MY PEN, TO YOUR MIND</text>
  <rect x="72" y="126" width="1056" height="1" fill="${RULE}"/>

  <text x="600" y="316" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="112" font-weight="bold" fill="${SUMI}">The سلفية mindset</text>

  <text x="600" y="378" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="26" letter-spacing="6" fill="${SUMI}" opacity="0.6">YOUR DAILY DOSE OF SALAFIYYAH</text>

  <rect x="72" y="452" width="1056" height="3" fill="${SUMI}"/>
  <rect x="72" y="461" width="1056" height="1" fill="${SUMI}"/>

  <text x="72" y="524" font-family="Helvetica, Arial, sans-serif" font-size="22"
        letter-spacing="5" fill="${SEAL}">PRINTED DIGITALLY, READ SLOWLY</text>
  <text x="1128" y="524" text-anchor="end" font-family="Helvetica, Arial, sans-serif"
        font-size="22" letter-spacing="5" fill="${SUMI}" opacity="0.5">MAKTABAHRUHAYN.COM</text>
</svg>`;

const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
writeFileSync(OUT, buffer);
console.log(`og-default.jpg — ${(buffer.byteLength / 1024).toFixed(1)} KB (budget 300 KB)`);

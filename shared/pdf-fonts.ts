import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type PdfFontFiles = {
  display: Uint8Array;
  body: Uint8Array;
  bodyBold: Uint8Array;
  nums: Uint8Array;
};

const FILES = {
  display: "fraunces-600.ttf",
  body: "inter-400.ttf",
  bodyBold: "inter-600.ttf",
  nums: "plex-500.ttf",
} as const;

function fromDisk(file: string): Uint8Array | null {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const paths = [
      join(here, "fonts", file),
      join(process.cwd(), "shared/fonts", file),
      join(process.cwd(), "fonts", file),
    ];
    for (const path of paths) {
      if (existsSync(path)) return new Uint8Array(readFileSync(path));
    }
  } catch {
    /* Workers resolve fonts via fetch(import.meta.url) below. */
  }
  return null;
}

async function loadOne(file: string): Promise<Uint8Array> {
  const disk = fromDisk(file);
  if (disk) return disk;
  const url = new URL(`./fonts/${file}`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Missing PDF font ${file}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function loadPdfFonts(): Promise<PdfFontFiles> {
  const [display, body, bodyBold, nums] = await Promise.all([
    loadOne(FILES.display),
    loadOne(FILES.body),
    loadOne(FILES.bodyBold),
    loadOne(FILES.nums),
  ]);
  return { display, body, bodyBold, nums };
}

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

function candidates(file: string): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(here, "fonts", file),
    join(here, "shared/fonts", file),
    join(process.cwd(), "shared/fonts", file),
    join(process.cwd(), "fonts", file),
  ];
}

function readFont(file: string): Uint8Array {
  for (const path of candidates(file)) {
    if (existsSync(path)) return new Uint8Array(readFileSync(path));
  }
  throw new Error(`Missing PDF font ${file}`);
}

export function loadPdfFonts(): PdfFontFiles {
  return {
    display: readFont(FILES.display),
    body: readFont(FILES.body),
    bodyBold: readFont(FILES.bodyBold),
    nums: readFont(FILES.nums),
  };
}

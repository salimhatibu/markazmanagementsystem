import { fontById, type BlogFont } from "../../shared/blog-fonts";

export { BLOG_FONTS, fontById, type BlogFont } from "../../shared/blog-fonts";

const loaded = new Set<string>();

/** Injects the Google Fonts stylesheet for this font the first time it is needed. */
export function ensureFontLoaded(id: string | null | undefined): void {
  const font = fontById(id);
  if (!font.google || loaded.has(font.id)) return;
  loaded.add(font.id);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

export function fontStack(font: BlogFont): string | undefined {
  return font.stack || undefined;
}

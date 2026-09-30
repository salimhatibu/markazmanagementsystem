const ALLOWED_IFRAME =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)[A-Za-z0-9_-]{6,20}(?:\?[^"']*)?$/;
const ALLOWED_MEDIA = /^\/api\/blog-media\/blog\/[A-Za-z0-9._-]+$/;
const ALLOWED_LINK = /^(?:https?:\/\/(?!\/)|mailto:|\/(?!\/))/i;

function attrValue(attrs: string, name: string): string {
  const double = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs);
  if (double) return double[1];
  const single = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i").exec(attrs);
  return single?.[1] ?? "";
}

/**
 * Attribute values are re-emitted inside double quotes, so a raw `"` in the
 * value would end the attribute early and let the rest be parsed as new
 * attributes — that is how `href='/x"onfocus="alert(1)"'` used to become a
 * live event handler.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizePostHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "<p></p>";
  return trimmed
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    // An opener with no closer survives the pair rules above.
    .replace(/<\/?(?:script|style)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/iframe\s*>/gi, "")
    .replace(/<iframe\b([^>]*)>/gi, (_match, attrs: string) => {
      const src = attrValue(attrs, "src");
      if (!ALLOWED_IFRAME.test(src)) return "";
      return `<iframe src="${escapeAttr(src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    })
    .replace(/<(img|video|source)\b([^>]*)>/gi, (_match, tag: string, attrs: string) => {
      const src = attrValue(attrs, "src");
      if (!ALLOWED_MEDIA.test(src)) return "";
      const safeSrc = escapeAttr(src);
      if (tag === "video") return `<video src="${safeSrc}" controls></video>`;
      if (tag === "img") {
        const cls = attrValue(attrs, "class");
        const shape = /\bis-square\b/.test(cls) ? "is-square" : /\bis-rect\b/.test(cls) ? "is-rect" : "";
        return `<img src="${safeSrc}" alt=""${shape ? ` class="${shape}"` : ""}>`;
      }
      return `<source src="${safeSrc}">`;
    })
    .replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
      const href = attrValue(attrs, "href");
      if (!href || !ALLOWED_LINK.test(href)) return "<a>";
      const external = /^(?:https?:)?\/\//i.test(href);
      const rel = external ? ` target="_blank" rel="noopener noreferrer nofollow"` : "";
      return `<a href="${escapeAttr(href)}"${rel}>`;
    });
}

export function excerptFromHtml(html: string, max = 220): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

const SKIP = new Set(["blog-read-cover", "blog-cover-preview"]);

export function shapeFromSize(width: number, height: number): "is-square" | "is-rect" {
  if (!width || !height) return "is-rect";
  const ratio = width / height;
  return ratio > 0.88 && ratio < 1.12 ? "is-square" : "is-rect";
}

export function classifyBlogImages(root: ParentNode | null) {
  if (!root) return;
  root.querySelectorAll("img").forEach((img) => {
    if ([...img.classList].some((name) => SKIP.has(name))) return;
    if (img.classList.contains("ProseMirror-separator")) return;
    if (img.closest(".blog-issue")) return;
    const apply = () => {
      img.classList.remove("is-square", "is-rect");
      img.classList.add(shapeFromSize(img.naturalWidth, img.naturalHeight));
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener("load", apply, { once: true });
  });
}

export function stampImageShapes(html: string, root: ParentNode): string {
  const shapes = [...root.querySelectorAll("img")].map((img) => {
    if (img.classList.contains("is-square")) return "is-square";
    if (img.classList.contains("is-rect")) return "is-rect";
    return "";
  });
  let index = 0;
  return html.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    const src = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(` ${attrs}`)?.[2] ?? "";
    const shape = shapes[index++] ?? "";
    if (!src) return `<img${attrs}>`;
    return `<img src="${src}" alt=""${shape ? ` class="${shape}"` : ""}>`;
  });
}

export function imageFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromList = [...data.files].filter((file) => file.type.startsWith("image/"));
  if (fromList.length) return fromList;
  const fromItems: File[] = [];
  for (const item of [...data.items]) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) fromItems.push(file);
    }
  }
  return fromItems;
}

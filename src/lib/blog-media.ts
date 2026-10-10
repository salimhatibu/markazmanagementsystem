const MAX_BYTES = 8_000_000;

/** Long-edge cap for uploaded pictures. Big phone photos land well past this. */
const MAX_DIMENSION = 1920;
const RESIZE_QUALITY = 0.82;

/**
 * Downscales and re-encodes large photos before upload. The full picture is
 * always kept — only its resolution and compression change, so nothing is
 * cropped out. Animated GIFs and videos are left untouched (a canvas redraw
 * would freeze a GIF on its first frame).
 */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const alreadySmall = scale >= 1 && file.size <= MAX_BYTES / 4;
    if (alreadySmall) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", RESIZE_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^./\\]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    // Any failure (unsupported format, decode error) just falls back to the original file.
    return file;
  }
}

export async function uploadBlogMedia(file: File): Promise<{ key: string; url: string }> {
  const upload = await shrinkImage(file);
  if (upload.size > MAX_BYTES) throw new Error("That file is too large. Keep it under 8 MB.");
  const bytes = new Uint8Array(await upload.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const response = await fetch("/api/blog-media", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: upload.name,
      type: upload.type,
      data: btoa(binary),
    }),
  });
  const payload = (await response.json()) as { key?: string; url?: string; error?: string };
  if (!response.ok || !payload.key || !payload.url) {
    throw new Error(payload.error || "The file could not be saved.");
  }
  return { key: payload.key, url: payload.url };
}

const MAX_BYTES = 8_000_000;

export async function uploadBlogMedia(file: File): Promise<{ key: string; url: string }> {
  if (file.size > MAX_BYTES) throw new Error("That file is too large. Keep it under 8 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const response = await fetch("/api/blog-media", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      type: file.type,
      data: btoa(binary),
    }),
  });
  const payload = (await response.json()) as { key?: string; url?: string; error?: string };
  if (!response.ok || !payload.key || !payload.url) {
    throw new Error(payload.error || "The file could not be saved.");
  }
  return { key: payload.key, url: payload.url };
}

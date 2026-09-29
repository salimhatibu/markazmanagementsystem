import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, readBody, SECURITY_HEADERS, ValidationError } from "./_shared/http";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

const MAX_BYTES = 8_000_000;
const KEY = /^blog\/[a-z0-9-]+\.(jpe?g|png|gif|webp|mp4|webm)$/i;

function blogStore() {
  return getStore("markaz-blog");
}

function extFor(type: string, name: string): string | null {
  const fromName = name.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && TYPES[fromName]) return fromName === "jpeg" ? "jpg" : fromName;
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  return null;
}

function decodeBase64(data: string): Uint8Array {
  try {
    return Uint8Array.from(Buffer.from(data, "base64"));
  } catch {
    throw new ValidationError("The file could not be read.");
  }
}

async function readUpload(req: Request): Promise<{ name: string; type: string; bytes: Uint8Array }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.toLowerCase().includes("application/json")) {
    const body = await readBody(req, 12_000_000);
    if (!body) throw new ValidationError("Attach a picture or video.");
    const name = String(body.filename ?? "file");
    const mime = String(body.type ?? "");
    const bytes = decodeBase64(String(body.data ?? ""));
    return { name, type: mime, bytes };
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a picture or video.");
  return { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export default async (req: Request, context: Context) => {
  try {
    if (req.method === "GET") {
      const key = context.params.key ? `blog/${context.params.key}` : "";
      if (!KEY.test(key)) return fail("File not found.", 404);
      const stored = await blogStore().getWithMetadata(key, { type: "arrayBuffer" });
      if (!stored?.data) return fail("File not found.", 404);
      const ext = key.split(".").pop()?.toLowerCase() ?? "bin";
      const contentType =
        (stored.metadata?.contentType as string | undefined) || TYPES[ext] || "application/octet-stream";
      return new Response(stored.data, {
        headers: {
          ...SECURITY_HEADERS,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    if (req.method === "POST") {
      const denied = await requireAdmin();
      if (denied) return denied;
      const upload = await readUpload(req);
      if (upload.bytes.byteLength > MAX_BYTES) {
        throw new ValidationError("That file is too large. Keep it under 8 MB.");
      }
      const ext = extFor(upload.type, upload.name);
      if (!ext) throw new ValidationError("Use a picture (jpg, png, gif, webp) or a video (mp4, webm).");
      const key = `blog/${crypto.randomUUID()}.${ext}`;
      await blogStore().set(key, Uint8Array.from(upload.bytes).buffer, {
        metadata: { contentType: TYPES[ext] },
      });
      return new Response(JSON.stringify({ key, url: `/api/blog-media/${key}` }), {
        status: 201,
        headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
      });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/api/blog-media", "/api/blog-media/blog/:key"],
  method: ["GET", "POST"],
};

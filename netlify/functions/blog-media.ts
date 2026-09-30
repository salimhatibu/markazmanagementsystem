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
/** base64 inflates by 4/3, plus room for padding and the rest of the envelope. */
const MAX_JSON_BYTES = Math.ceil(MAX_BYTES * 1.37);
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
  // Buffer is already a Uint8Array view; copying it again doubled peak memory.
  try {
    return Buffer.from(data, "base64");
  } catch {
    throw new ValidationError("The file could not be read.");
  }
}

const tooBig = () => new ValidationError("That file is too large. Keep it under 8 MB.");

/** Hands the blob store its ArrayBuffer without re-copying the megabytes. */
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = view;
  if (byteOffset === 0 && byteLength === buffer.byteLength) return buffer as ArrayBuffer;
  return buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer;
}

async function readUpload(req: Request): Promise<{ name: string; type: string; bytes: Uint8Array }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.toLowerCase().includes("application/json")) {
    const body = await readBody(req, MAX_JSON_BYTES);
    if (!body) throw new ValidationError("Attach a picture or video.");
    const data = String(body.data ?? "");
    // Reject on the encoded length so an oversized upload never gets decoded.
    if (data.length > MAX_JSON_BYTES) throw tooBig();
    return { name: String(body.filename ?? "file"), type: String(body.type ?? ""), bytes: decodeBase64(data) };
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a picture or video.");
  if (file.size > MAX_BYTES) throw tooBig();
  return { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export default async (req: Request, context: Context) => {
  try {
    if (req.method === "GET") {
      const key = context.params.key ? `blog/${context.params.key}` : "";
      if (!KEY.test(key)) return fail("File not found.", 404);
      // Streamed, so an 8 MB video is never held whole in function memory.
      const stored = await blogStore().getWithMetadata(key, { type: "stream" });
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
      if (upload.bytes.byteLength > MAX_BYTES) throw tooBig();
      const ext = extFor(upload.type, upload.name);
      if (!ext) throw new ValidationError("Use a picture (jpg, png, gif, webp) or a video (mp4, webm).");
      const key = `blog/${crypto.randomUUID()}.${ext}`;
      await blogStore().set(key, toArrayBuffer(upload.bytes), { metadata: { contentType: TYPES[ext] } });
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

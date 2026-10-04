import { extractText, getDocumentProxy } from "unpdf";
import { getEnv } from "../env";
import { ValidationError } from "./http";

export type OcrKind = "student" | "teacher" | "expense" | "book";

const KINDS = new Set<OcrKind>(["student", "teacher", "expense", "book"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6_000_000;

const SCHEMAS: Record<OcrKind, string> = {
  student: `{
  "admissionNumber": string,
  "name": string,
  "dateOfBirth": "YYYY-MM-DD" or "",
  "admittedOn": "YYYY-MM-DD" or "",
  "gender": "male" | "female" | "",
  "section": "morning" | "evening" | "",
  "expectedFees": string number or "",
  "admissionFeeCollected": boolean,
  "admissionFeeAmount": string number or "",
  "guardianName": string,
  "guardianPhone": string,
  "guardianEmail": string,
  "secondContactName": string,
  "secondContactPhone": string,
  "secondContactEmail": string
}`,
  teacher: `{
  "name": string,
  "dateOfBirth": "YYYY-MM-DD" or "",
  "gender": "male" | "female" | "",
  "section": "morning" | "evening" | "both" | "",
  "phone": string,
  "nationalId": string,
  "mpesaName": string,
  "mpesaNumber": string,
  "expectedSalary": string number or "",
  "expectedReleaseDate": "YYYY-MM-DD" or "",
  "paidInAdvance": boolean
}`,
  expense: `{
  "reason": string (e.g. Maintenance, Books, Food, Transport, Utilities, Other),
  "amount": string number,
  "details": string,
  "spentOn": "YYYY-MM-DD" or ""
}`,
  book: `{
  "title": string (class or list name),
  "purchasedOn": "YYYY-MM-DD" or "",
  "items": [{ "name": string, "price": string number }],
  "stationeriesNote": string,
  "stationeriesCost": string number or ""
}`,
};

function promptFor(kind: OcrKind): string {
  return `You are reading a markaz office document (Kenya). Extract fields for a ${kind} record.
Return ONLY valid JSON matching this shape (use empty string or false when unknown; never invent emails or IDs):
${SCHEMAS[kind]}
Use KES amounts as plain numbers without currency symbols. Prefer ISO dates YYYY-MM-DD.`;
}

export function parseOcrKind(value: unknown): OcrKind {
  if (typeof value !== "string" || !KINDS.has(value as OcrKind)) {
    throw new ValidationError("Choose student, teacher, expense, or book.");
  }
  return value as OcrKind;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new ValidationError("Could not read structured details from that file.");
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ValidationError("Could not read structured details from that file.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new ValidationError("Could not read structured details from that file.");
  }
}

function modelText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const row = result as { response?: unknown; result?: unknown };
    if (typeof row.response === "string") return row.response;
    if (typeof row.result === "string") return row.result;
  }
  return JSON.stringify(result ?? "");
}

async function runVision(kind: OcrKind, mime: string, bytes: Uint8Array): Promise<Record<string, unknown>> {
  const env = getEnv();
  const image = bytesToBase64(bytes);
  const result = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
    messages: [
      { role: "system", content: promptFor(kind) },
      { role: "user", content: "Read this document image and return the JSON fields only." },
    ],
    image: [`data:${mime};base64,${image}`],
    max_tokens: 1200,
  });
  return extractJson(modelText(result));
}

async function runText(kind: OcrKind, documentText: string): Promise<Record<string, unknown>> {
  const env = getEnv();
  const clipped = documentText.slice(0, 12_000);
  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: promptFor(kind) },
      {
        role: "user",
        content: `Document text:\n---\n${clipped}\n---\nReturn the JSON fields only.`,
      },
    ],
    max_tokens: 1200,
  });
  return extractJson(modelText(result));
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const document = await getDocumentProxy(bytes);
  const { text } = await extractText(document, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : String(text ?? "");
}

export async function readOcrUpload(req: Request): Promise<{ kind: OcrKind; name: string; type: string; bytes: Uint8Array }> {
  const typeHeader = req.headers.get("content-type") ?? "";
  if (!typeHeader.toLowerCase().includes("multipart/form-data")) {
    throw new ValidationError("Upload a picture or PDF as a form file.");
  }
  const form = await req.formData();
  const kind = parseOcrKind(form.get("kind"));
  const file = form.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a picture or PDF.");
  if (file.size <= 0) throw new ValidationError("That file is empty.");
  if (file.size > MAX_BYTES) throw new ValidationError("Keep the file under 6 MB.");
  const type = file.type || guessType(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { kind, name: file.name, type, bytes };
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "";
}

export async function ocrDocument(kind: OcrKind, type: string, bytes: Uint8Array): Promise<Record<string, unknown>> {
  if (IMAGE_TYPES.has(type) || /^image\//.test(type)) {
    return runVision(kind, type || "image/jpeg", bytes);
  }
  if (type === "application/pdf" || type === "") {
    // Prefer text extraction for PDFs; fall back message if scanned/empty.
    try {
      if (type === "application/pdf" || bytes[0] === 0x25) {
        const text = (await pdfText(bytes)).trim();
        if (text.length >= 40) return runText(kind, text);
        throw new ValidationError(
          "That PDF has little readable text. Photograph the page and upload the picture instead.",
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
    }
  }
  throw new ValidationError("Upload a JPG, PNG, WebP, or PDF.");
}

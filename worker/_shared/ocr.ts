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
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("Could not read structured details from that file.");
  }
}

function modelText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const row = result as {
      description?: unknown;
      response?: unknown;
      result?: unknown;
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    if (typeof row.description === "string") return row.description;
    const choice = row.choices?.[0]?.message?.content;
    if (typeof choice === "string") return choice;
    if (typeof row.response === "string") return row.response;
    if (row.response && typeof row.response === "object") return JSON.stringify(row.response);
    if (typeof row.result === "string") return row.result;
    if (row.result && typeof row.result === "object") return JSON.stringify(row.result);
  }
  return JSON.stringify(result ?? "");
}

function aiFailure(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/too many redirects/i.test(message)) {
    throw new ValidationError("The scanner could not reach Workers AI. Try again in a moment.");
  }
  if (/3030|3043|8001|AiError/i.test(message)) {
    throw new ValidationError("That picture could not be read. Try a clearer JPG or PNG under 6 MB.");
  }
  throw new ValidationError("The scanner could not read that file. Try another picture or PDF.");
}

async function runModel(model: string, input: Record<string, unknown>): Promise<unknown> {
  const env = getEnv();
  const ai = env.AI as { run: (name: string, values: Record<string, unknown>) => Promise<unknown> };
  const secret = env.MARKAZ_AI_SECRET?.trim();
  if (env.MARKAZ_AI && secret) {
    try {
      const response = await env.MARKAZ_AI.fetch("http://markaz-ai/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-markaz-ai-secret": secret,
        },
        body: JSON.stringify({ model, input }),
      });
      const payload = (await response.json()) as { ok?: boolean; result?: unknown; error?: string };
      if (response.ok && payload.ok) return payload.result;
      console.error("markaz-ai sidecar error", response.status, payload.error);
    } catch (error) {
      console.error("markaz-ai sidecar fetch failed", error);
    }
  }
  // Fallback: AI binding on this Worker (local dev, or if sidecar is unavailable).
  return ai.run(model, input);
}

async function pictureToText(bytes: Uint8Array): Promise<string> {
  // LLaVA is image-to-text: binary image bytes + prompt → { description }.
  const result = await runModel("@cf/llava-hf/llava-1.5-7b-hf", {
    image: Array.from(bytes),
    prompt:
      "This is a markaz office form or handwritten list from Kenya. Transcribe every readable word, number, name, date, and amount exactly. Do not invent missing values. Keep line breaks where helpful.",
    max_tokens: 1024,
  });
  const text = modelText(result).trim();
  if (text.length < 8) {
    throw new ValidationError("That picture had little readable text. Try a clearer photo.");
  }
  return text;
}

async function runVision(kind: OcrKind, _mime: string, bytes: Uint8Array): Promise<Record<string, unknown>> {
  try {
    const transcript = await pictureToText(bytes);
    return runText(kind, transcript);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    aiFailure(error);
  }
}

async function runText(kind: OcrKind, documentText: string): Promise<Record<string, unknown>> {
  const clipped = documentText.slice(0, 12_000);
  const input = {
    messages: [
      { role: "system", content: promptFor(kind) },
      {
        role: "user",
        content: `Document text:\n---\n${clipped}\n---\nReturn the JSON fields only.`,
      },
    ],
    max_tokens: 1200,
  };
  try {
    const result = await runModel("@cf/meta/llama-3.2-3b-instruct", input);
    return extractJson(modelText(result));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    aiFailure(error);
  }
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const document = await getDocumentProxy(bytes);
  const { text } = await extractText(document, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : String(text ?? "");
}

export async function readOcrUpload(req: Request): Promise<{ kind: OcrKind; name: string; type: string; bytes: Uint8Array }> {
  const typeHeader = req.headers.get("content-type") ?? "";
  if (!typeHeader.toLowerCase().includes("multipart/form-data")) {
    throw new ValidationError("Upload a picture or PDF as a form file.");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ValidationError("That upload could not be read. Try a smaller JPG or PNG.");
  }
  const kind = parseOcrKind(form.get("kind"));
  const file = form.get("file");
  if (!(file instanceof Blob)) throw new ValidationError("Attach a picture or PDF.");
  if (file.size <= 0) throw new ValidationError("That file is empty.");
  if (file.size > MAX_BYTES) throw new ValidationError("Keep the file under 6 MB.");
  const name = file instanceof File && file.name ? file.name : "upload";
  const type = (file.type || guessType(name)).toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { kind, name, type, bytes };
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
    return runVision(kind, type.startsWith("image/") ? type : "image/jpeg", bytes);
  }
  if (type === "application/pdf" || bytes[0] === 0x25) {
    try {
      const text = (await pdfText(bytes)).trim();
      if (text.length >= 40) return runText(kind, text);
      throw new ValidationError(
        "That PDF has little readable text. Photograph the page and upload the picture instead.",
      );
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(
        "That PDF could not be read. Photograph the page and upload the picture instead.",
      );
    }
  }
  throw new ValidationError("Upload a JPG, PNG, WebP, or PDF.");
}

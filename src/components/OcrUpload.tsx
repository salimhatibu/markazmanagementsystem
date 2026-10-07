import { useRef, useState } from "react";
import { ApiError } from "../lib/api";

export type OcrKind = "student" | "teacher" | "expense" | "book";

// LLaVA is slow on large photos — keep scans modest for reliable OCR.
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.82;

async function prepareUpload(file: File): Promise<File> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return file;
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return file;
  }
  // Re-encode most photos so LLaVA gets a compact image.
  if (file.size < 120_000 && file.type === "image/jpeg") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size <= 0) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "scan";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export function OcrUpload({
  kind,
  disabled,
  onFields,
  onError,
}: {
  kind: OcrKind;
  disabled?: boolean;
  onFields: (fields: Record<string, unknown>) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function scan(file: File) {
    setBusy(true);
    onError("");
    try {
      const prepared = await prepareUpload(file);
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", prepared);
      const response = await fetch("/api/ocr", {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!response.ok) {
        let message = "That file could not be read.";
        if (response.status === 401) message = "Sign in again, then try the scan.";
        if (response.status === 413) message = "That file is too large. Try a smaller photo.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* keep default */
        }
        throw new ApiError(response.status, message);
      }
      const payload = (await response.json()) as { fields?: Record<string, unknown> };
      if (!payload.fields || typeof payload.fields !== "object") {
        throw new Error("No details were found in that file.");
      }
      onFields(payload.fields);
    } catch (caught) {
      if (caught instanceof TypeError) {
        onError("The scan could not reach the markaz. Check your connection and try again.");
      } else {
        onError(caught instanceof Error ? caught.message : "That file could not be read.");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="ocr-upload">
      <div className="ocr-upload-copy">
        <p className="ocr-upload-title">Scan a form</p>
        <p className="ocr-upload-hint">
          Upload a photo or PDF. Pictures are read with LLaVA, then filled into the form — check before saving.
        </p>
      </div>
      <div className="ocr-upload-actions">
        <input
          ref={inputRef}
          id={`ocr-file-${kind}`}
          className="ocr-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
          disabled={disabled || busy}
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) void scan(next);
          }}
        />
        <label htmlFor={`ocr-file-${kind}`} className={`ghost ocr-upload-button${busy ? " is-busy" : ""}`}>
          {busy ? "Reading with LLaVA…" : "Upload picture or PDF"}
        </label>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { ApiError } from "../lib/api";

export type OcrKind = "student" | "teacher" | "expense" | "book";

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
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/ocr", {
        method: "POST",
        body,
        credentials: "include",
      });
      if (!response.ok) {
        let message = "That file could not be read.";
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
      onError(caught instanceof Error ? caught.message : "That file could not be read.");
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
          Upload a photo or PDF. The markaz will read it and fill what it can — check before saving.
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
            const file = event.target.files?.[0];
            if (file) void scan(file);
          }}
        />
        <label htmlFor={`ocr-file-${kind}`} className={`ghost ocr-upload-button${busy ? " is-busy" : ""}`}>
          {busy ? "Reading…" : "Upload picture or PDF"}
        </label>
      </div>
    </div>
  );
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    let message = response.statusText || "Request failed.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

async function downloadBlob(path: string, filename: string, fallback: string) {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    let message = fallback;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = fallback;
    }
    throw new ApiError(response.status, message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadReport(id: number, filename: string) {
  await downloadBlob(`/api/reports/${id}/file`, filename, "Could not download the report.");
}

export async function downloadPersonRecord(kind: "students" | "teachers", id: number, filename: string) {
  await downloadBlob(`/api/${kind}/${id}/file`, filename, "Could not download the record.");
}

export async function downloadRoster(kind: "students" | "teachers", filename: string) {
  await downloadBlob(`/api/${kind}/file`, filename, "Could not download the list.");
}

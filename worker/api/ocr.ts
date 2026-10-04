import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json } from "../_shared/http";
import { ocrDocument, readOcrUpload } from "../_shared/ocr";

export default async (req: Request) => {
  if (req.method !== "POST") return fail("Method not allowed.", 405);
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const upload = await readOcrUpload(req);
    const fields = await ocrDocument(upload.kind, upload.type, upload.bytes);
    return json({
      kind: upload.kind,
      filename: upload.name,
      fields,
    });
  } catch (error) {
    return handleError(error);
  }
};

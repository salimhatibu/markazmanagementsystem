import { requireAdmin } from "../_shared/auth";
import { fail, handleError, SECURITY_HEADERS } from "../_shared/http";
import { studentsRosterPdf } from "../_shared/person-record";

export default async (req: Request) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const record = await studentsRosterPdf();
    return new Response(Uint8Array.from(record.bytes), {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${record.filename}"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

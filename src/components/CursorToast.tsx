import { createPortal } from "react-dom";
import type { CursorToastState } from "../lib/use-cursor-toast";

export function CursorToast({ toast }: { toast: CursorToastState | null }) {
  if (!toast) return null;
  return createPortal(
    <div
      key={toast.id}
      className="cursor-toast"
      style={{ left: toast.x, top: toast.y }}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>,
    document.body,
  );
}

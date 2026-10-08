import { api } from "./api";

export type PresenceKeeper = {
  email: string;
  label: string;
  lastSeenAt: string;
  online: boolean;
};

export const PRESENCE_POLL_MS = 60 * 1000;

export async function beatPresence(): Promise<void> {
  await api<{ ok: boolean }>("/api/presence", { method: "POST" });
}

export async function loadPresence(): Promise<PresenceKeeper[]> {
  const body = await api<{ keepers: PresenceKeeper[] }>("/api/presence");
  return body.keepers;
}

/** Sync heartbeat then return the latest list. */
export async function refreshPresence(): Promise<PresenceKeeper[]> {
  await beatPresence();
  return loadPresence();
}

export function formatLastSeen(iso: string, now = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "unknown";

  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();

  const time = at
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s/g, "")
    .toLowerCase();

  if (sameDay) return time;
  const day = at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} ${time}`;
}

export function presenceLine(keeper: PresenceKeeper): string {
  if (keeper.online) return `${keeper.label} is online`;
  return `${keeper.label} last seen at ${formatLastSeen(keeper.lastSeenAt)}`;
}

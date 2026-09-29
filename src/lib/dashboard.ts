import { api } from "./api";
import type { DashboardTotals } from "../types";

const STORAGE_KEY = "markaz_dashboard";

function readStored(): DashboardTotals | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DashboardTotals) : null;
  } catch {
    return null;
  }
}

let cached: DashboardTotals | null = readStored();
let inflight: Promise<DashboardTotals> | null = null;

export function peekDashboard(): DashboardTotals | null {
  return cached;
}

export function loadDashboard(): Promise<DashboardTotals> {
  if (inflight) return inflight;
  inflight = api<DashboardTotals>("/api/dashboard")
    .then((data) => {
      cached = data;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* ignore quota */
      }
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

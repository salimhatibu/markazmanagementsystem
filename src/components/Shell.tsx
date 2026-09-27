import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CURRENCY, displayName, MARKAZ_NAME } from "../../shared/format";
import { api } from "../lib/api";
import { applyTheme, readTheme, type Theme } from "../lib/theme";
import type { Settings } from "../types";
import { BookIcon, CrescentIcon, Ornament, SunIcon } from "./Motifs";

export type WorkspaceContext = {
  settings: Settings;
  refreshSettings: () => Promise<void>;
  unread: number;
  refreshAlerts: () => Promise<void>;
};

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/students", label: "Students", end: false },
  { to: "/teachers", label: "Teachers", end: false },
  { to: "/reports", label: "Reports", end: false },
  { to: "/settings", label: "Settings", end: false },
];

export function Shell() {
  const location = useLocation();
  const [settings, setSettings] = useState<Settings>({ markazName: MARKAZ_NAME, currencySymbol: CURRENCY });
  const [unread, setUnread] = useState(0);
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const refreshSettings = useCallback(async () => {
    const body = await api<{ settings: Settings }>("/api/settings");
    setSettings(body.settings);
  }, []);

  const refreshAlerts = useCallback(async () => {
    const body = await api<{ unread: number }>("/api/notifications");
    setUnread(body.unread);
  }, []);

  useEffect(() => {
    let cancel = false;
    refreshSettings()
      .catch(() => {
        if (!cancel) setSettings({ markazName: MARKAZ_NAME, currencySymbol: CURRENCY });
      });
    refreshAlerts().catch(() => {
      if (!cancel) setUnread(0);
    });
    return () => {
      cancel = true;
    };
  }, [location.pathname]);

  const context: WorkspaceContext = { settings, refreshSettings, unread, refreshAlerts };
  const brand = displayName(settings.markazName);

  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          {brand}
        </NavLink>
        <Ornament />
        <nav aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      <div className="top-actions">
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={theme === "light"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <CrescentIcon /> : <SunIcon />}
          {theme === "light" ? "Dark" : "Light"}
        </button>
        {unread > 0 ? (
            <NavLink to="/reports" className="alert-pill">
              &gt; Report ready{unread > 1 ? ` ${unread}` : ""}
            </NavLink>
          ) : null}
        </div>
      </header>
      <main id="content" className="content">
        <Outlet context={context} />
      </main>
      <div className="watermark">
        <BookIcon />
      </div>
    </div>
  );
}

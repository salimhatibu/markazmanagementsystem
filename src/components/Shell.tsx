import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CURRENCY, displayName, MARKAZ_NAME } from "../../shared/format";
import { ACCOUNT_NAME, ACCOUNT_NUMBER, BANK_NAME, OFFICIAL_ADDRESS, PAYBILL } from "../../shared/letterhead";
import { api } from "../lib/api";
import { claimFirstVisit, loadDailyHadith, type DailyHadith } from "../lib/hadith";
import { shouldPlaySalam } from "../lib/sand-salam";
import { applyTheme, readTheme, type Theme } from "../lib/theme";
import type { Settings } from "../types";
import { Footer } from "./Footer";
import { HadithDialog } from "./HadithDialog";
import { BookIcon, CrescentIcon, Ornament, SunIcon } from "./Motifs";
import { PageSlide } from "./PageSlide";
import { SalamSplash } from "./SalamSplash";

export type WorkspaceContext = {
  settings: Settings;
  refreshSettings: () => Promise<void>;
  unread: number;
  refreshAlerts: () => Promise<void>;
  daily: DailyHadith | null;
};

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/students", label: "Students", end: false },
  { to: "/teachers", label: "Teachers", end: false },
  { to: "/expenses", label: "Expenses", end: false },
  { to: "/reports", label: "Reports", end: false },
  { to: "/settings", label: "Settings", end: false },
];

export function Shell() {
  const location = useLocation();
  const fallbackSettings = (): Settings => ({
    markazName: MARKAZ_NAME,
    currencySymbol: CURRENCY,
    address: OFFICIAL_ADDRESS,
    accountName: ACCOUNT_NAME,
    bankName: BANK_NAME,
    paybill: PAYBILL,
    accountNumber: ACCOUNT_NUMBER,
  });
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [unread, setUnread] = useState(0);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [daily, setDaily] = useState<DailyHadith | null>(null);
  const [showHadith, setShowHadith] = useState(false);
  const [showSalam, setShowSalam] = useState(shouldPlaySalam);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancel = false;
    loadDailyHadith()
      .then((today) => {
        if (cancel) return;
        setDaily(today);
      })
      .catch(() => {
        if (!cancel) setDaily(null);
      });
    return () => {
      cancel = true;
    };
  }, []);

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
        if (!cancel) setSettings(fallbackSettings());
      });
    refreshAlerts().catch(() => {
      if (!cancel) setUnread(0);
    });
    return () => {
      cancel = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (showSalam || !daily) return;
    setShowHadith(claimFirstVisit(daily.date));
  }, [showSalam, daily]);

  const context: WorkspaceContext = { settings, refreshSettings, unread, refreshAlerts, daily };
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
          aria-label={theme === "light" ? "Switch to dark page" : "Switch to light page"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <CrescentIcon /> : <SunIcon />}
          <span className="theme-toggle-label">{theme === "light" ? "Dark page" : "Light page"}</span>
        </button>
        {unread > 0 ? (
            <NavLink to="/reports" className="alert-pill">
              Report ready{unread > 1 ? ` · ${unread}` : ""}
            </NavLink>
          ) : null}
        </div>
      </header>
      <main id="content" className="content">
        <PageSlide>
          <Outlet context={context} />
        </PageSlide>
      </main>
      <Footer />
      <div className="watermark">
        <BookIcon />
      </div>
      {showSalam ? <SalamSplash onDone={() => setShowSalam(false)} /> : null}
      {showHadith && daily && !showSalam ? (
        <HadithDialog daily={daily} onClose={() => setShowHadith(false)} />
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CURRENCY, displayName, MARKAZ_NAME } from "../../shared/format";
import { ACCOUNT_NAME, ACCOUNT_NUMBER, BANK_NAME, OFFICIAL_ADDRESS, PAYBILL } from "../../shared/letterhead";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { loadDashboard } from "../lib/dashboard";
import { GUIDE_START, hasFinishedGuide } from "../lib/guide";
import { claimFirstVisit, loadDailyHadith, type DailyHadith } from "../lib/hadith";
import { applyTheme, readTheme, type Theme } from "../lib/theme";
import type { Settings } from "../types";
import { Footer } from "./Footer";
import { GuideTour } from "./GuideTour";
import { HadithDialog } from "./HadithDialog";
import {
  BooksStackIcon,
  CloseIcon,
  CrescentIcon,
  HelpIcon,
  MenuIcon,
  NavBlogIcon,
  NavChartIcon,
  NavFileIcon,
  NavGearIcon,
  NavHomeIcon,
  NavLedgerIcon,
  NavPeopleIcon,
  SunIcon,
} from "./Motifs";
import { PageSlide } from "./PageSlide";

export type WorkspaceContext = {
  settings: Settings;
  refreshSettings: () => Promise<void>;
  unread: number;
  refreshAlerts: () => Promise<void>;
  daily: DailyHadith | null;
};

const sections = [
  { label: "Desk", links: [{ to: "/", label: "Home", end: true, icon: NavHomeIcon }] },
  {
    label: "People",
    links: [
      { to: "/students", label: "Students", end: false, icon: NavPeopleIcon },
      { to: "/teachers", label: "Teachers", end: false, icon: NavLedgerIcon },
    ],
  },
  {
    label: "Books",
    links: [
      { to: "/expenses", label: "Expenses", end: false, icon: NavChartIcon },
      { to: "/reports", label: "Reports", end: false, icon: NavFileIcon },
    ],
  },
  { label: "Papers", links: [{ to: "/blog", label: "Blog", end: false, icon: NavBlogIcon }] },
  { label: "Office", links: [{ to: "/settings", label: "Settings", end: false, icon: NavGearIcon }] },
];

export function Shell() {
  const location = useLocation();
  const auth = useAuth();
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
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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
    loadDashboard()
      .catch(() => undefined)
      .then(() => {
        if (cancel) return;
        refreshSettings().catch(() => {
          if (!cancel) setSettings(fallbackSettings());
        });
        refreshAlerts().catch(() => {
          if (!cancel) setUnread(0);
        });
      });
    return () => {
      cancel = true;
    };
  }, [refreshSettings, refreshAlerts]);

  useEffect(() => {
    if (!daily) return;
    setShowHadith(claimFirstVisit(daily.date));
  }, [daily]);

  useEffect(() => {
    if (showHadith) return;
    if (!hasFinishedGuide()) setGuideOpen(true);
  }, [showHadith]);

  useEffect(() => {
    function open() {
      setGuideStep(0);
      setGuideOpen(true);
    }
    window.addEventListener(GUIDE_START, open);
    return () => window.removeEventListener(GUIDE_START, open);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const context: WorkspaceContext = { settings, refreshSettings, unread, refreshAlerts, daily };
  const brand = displayName(settings.markazName);

  return (
    <div className={`app${guideOpen ? " is-guided" : ""}`}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="bg-wash" aria-hidden="true">
        <div className="wave-glow" />
        <div className="wave-glow b" />
        <svg className="bg-text" viewBox="0 0 360 80" preserveAspectRatio="xMidYMid meet">
          <text x="180" y="62" textAnchor="middle">
            MARKAZ
          </text>
        </svg>
      </div>
      {menuOpen ? (
        <button type="button" className="side-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      ) : null}
      <aside className={`side${menuOpen ? " is-open" : ""}`} data-guide="nav">
        <NavLink to="/" className="brand" end data-guide="brand">
          <span className="logo-mark" aria-hidden="true">
            <BooksStackIcon />
          </span>
          <span className="logo-text">
            <span className="a">{brand}</span>
            <span className="b">Imam ash-Shafi&rsquo;i</span>
          </span>
        </NavLink>
        <nav id="primary-menu" className="side-nav" aria-label="Primary">
          {sections.map((section) => (
            <div key={section.label} className="side-group">
              <p className="side-label">{section.label}</p>
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => (isActive ? "nav-pill active" : "nav-pill")}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="nav-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <div className="top-actions">
            {unread > 0 ? (
              <NavLink to="/reports" className="alert-pill">
                Report ready{unread > 1 ? ` · ${unread}` : ""}
              </NavLink>
            ) : null}
            <button
              type="button"
              className="help-toggle"
              data-guide="help"
              aria-label="How to use this site"
              aria-pressed={guideOpen}
              onClick={() => {
                setGuideStep(0);
                setGuideOpen(true);
              }}
            >
              <HelpIcon />
            </button>
            <div className="theme-switch" role="group" aria-label="Page colour">
              <button
                type="button"
                aria-pressed={theme === "light"}
                aria-label="Light page"
                onClick={() => setTheme("light")}
              >
                <SunIcon />
              </button>
              <button
                type="button"
                aria-pressed={theme === "dark"}
                aria-label="Dark page"
                onClick={() => setTheme("dark")}
              >
                <CrescentIcon />
              </button>
            </div>
            {auth.identityOn ? (
              <button type="button" className="sign-out" onClick={() => void auth.signOut()}>
                Sign out
              </button>
            ) : null}
          </div>
        </header>
        <main id="content" className="content">
          <PageSlide>
            <Outlet context={context} />
          </PageSlide>
        </main>
        <Footer />
      </div>
      {showHadith && daily ? (
        <HadithDialog daily={daily} onClose={() => setShowHadith(false)} />
      ) : null}
      {guideOpen && !showHadith ? (
        <GuideTour step={guideStep} onStep={setGuideStep} onClose={() => setGuideOpen(false)} />
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CURRENCY, displayName, MARKAZ_NAME } from "../../shared/format";
import { ACCOUNT_NAME, ACCOUNT_NUMBER, BANK_NAME, OFFICIAL_ADDRESS, PAYBILL } from "../../shared/letterhead";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { loadDashboard } from "../lib/dashboard";
import { claimFirstVisit, loadDailyHadith, type DailyHadith } from "../lib/hadith";
import { PRESENCE_POLL_MS, refreshPresence, type PresenceKeeper } from "../lib/presence";
import { applyTheme } from "../lib/theme";
import type { Settings } from "../types";
import {
  claimFeelingAsk,
  ensureSessionStart,
  feelingCheckDue,
  pickFeelingPrompt,
  recordWork,
  wasFeelingAskedToday,
} from "../lib/feeling-check";
//import { FeedbackDesk } from "./FeedbackDesk";
import { FeelingCheckDialog } from "./FeelingCheckDialog";
import { Footer } from "./Footer";
import { HadithDialog } from "./HadithDialog";
import {
  CloseIcon,
  MenuIcon,
  NavBlogIcon,
  NavBooksIcon,
  NavChartIcon,
  NavFileIcon,
  NavGearIcon,
  NavHomeIcon,
  NavLedgerIcon,
  NavKharajahIcon,
  NavPeopleIcon,
  NavTripsIcon,
  PanicIcon,
} from "./Motifs";
import { NotificationBell } from "./NotificationBell";
import { PageSlide } from "./PageSlide";
import { PanicDialog } from "./PanicDialog";
import { PresenceIsland } from "./PresenceIsland";

export type WorkspaceContext = {
  settings: Settings;
  refreshSettings: () => Promise<void>;
  unread: number;
  refreshAlerts: () => Promise<void>;
  daily: DailyHadith | null;
  keepers: PresenceKeeper[];
};

/**
 * The presence island is parked, not retired. Flip this to true to bring it
 * back: the component, its styles, the polling in lib/presence and the
 * /api/presence route are all still in place and need no other change.
 * Typed as boolean so the hidden branch stays live code rather than being
 * narrowed away as unreachable.
 */
const SHOW_PRESENCE_ISLAND: boolean = true;

const WORK_TICK_MS = 30 * 1000;

const PANIC_TAPS = 3;
const PANIC_TAP_WINDOW_MS = 1600;

const sections = [
  { label: "Desk", links: [{ to: "/", label: "Home", end: true, icon: NavHomeIcon }] },
  {
    label: "People",
    links: [
      { to: "/students", label: "Students", end: false, icon: NavPeopleIcon },
      { to: "/classes", label: "Classes", end: false, icon: NavBooksIcon },
      { to: "/kharajah", label: "Kharajah", end: false, icon: NavKharajahIcon },
      { to: "/teachers", label: "Teachers", end: false, icon: NavLedgerIcon },
    ],
  },
  {
    label: "Miscellaneous",
    links: [
      { to: "/books", label: "Books", end: false, icon: NavBooksIcon },
      { to: "/trips", label: "Trips", end: false, icon: NavTripsIcon },
      { to: "/expenses", label: "Expenses", end: false, icon: NavChartIcon },
      { to: "/reports", label: "Reports", end: false, icon: NavFileIcon },
      { to: "/panic-alerts", label: "Panic Log", end: false, icon: PanicIcon },
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
  const [daily, setDaily] = useState<DailyHadith | null>(null);
  const [showHadith, setShowHadith] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feelingPrompt, setFeelingPrompt] = useState<string | null>(null);
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicTaps, setPanicTaps] = useState(0);
  const [panicLocked, setPanicLocked] = useState(false);
  const panicTapTimer = useRef<number>();
  const panicTapCount = useRef(0);
  const [keepers, setKeepers] = useState<PresenceKeeper[]>([]);

  useEffect(() => {
    applyTheme("light");
  }, []);

  useEffect(() => {
    if (!SHOW_PRESENCE_ISLAND) return;
    if (!auth.isAdmin) return;
    let cancel = false;
    let timer: number | undefined;

    const tick = async () => {
      try {
        const next = await refreshPresence();
        if (!cancel) setKeepers(next);
      } catch {
        /* desk still usable if presence fails */
      }
    };

    void tick();
    timer = window.setInterval(() => {
      void tick();
    }, PRESENCE_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancel = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth.isAdmin]);

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

  // The desk needs to know whether today's call has already been made, so the
  // button can read as spent before anyone taps it.
  useEffect(() => {
    if (!auth.isAdmin) return;
    let cancel = false;
    api<{ usedToday: boolean }>("/api/panic-alerts")
      .then((body) => {
        if (!cancel) setPanicLocked(body.usedToday);
      })
      .catch(() => {
        /* the server still refuses a second call if this check never lands */
      });
    return () => {
      cancel = true;
    };
  }, [auth.isAdmin]);

  useEffect(() => () => window.clearTimeout(panicTapTimer.current), []);

  /** Three deliberate taps, so the console never opens by accident. The count
      lives in a ref as well, since taps can land faster than React re-renders. */
  function tapPanic() {
    if (panicLocked) return;
    window.clearTimeout(panicTapTimer.current);
    const next = panicTapCount.current + 1;
    if (next >= PANIC_TAPS) {
      panicTapCount.current = 0;
      setPanicTaps(0);
      setMenuOpen(false);
      setPanicOpen(true);
      return;
    }
    panicTapCount.current = next;
    setPanicTaps(next);
    panicTapTimer.current = window.setTimeout(() => {
      panicTapCount.current = 0;
      setPanicTaps(0);
    }, PANIC_TAP_WINDOW_MS);
  }

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

  // The checkup is earned by time actually worked, so the clock only runs while
  // the desk is on screen and is polled rather than scheduled once.
  useEffect(() => {
    ensureSessionStart();
    if (wasFeelingAskedToday()) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      recordWork();
      if (showHadith || feelingPrompt) return;
      if (!feelingCheckDue() || wasFeelingAskedToday()) return;
      if (!claimFeelingAsk()) return;
      setFeelingPrompt(pickFeelingPrompt());
    };

    tick();
    const timer = window.setInterval(tick, WORK_TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [showHadith, feelingPrompt]);

  const context: WorkspaceContext = { settings, refreshSettings, unread, refreshAlerts, daily, keepers };
  const brand = displayName(settings.markazName);

  return (
    <div className={`app${panicOpen ? " is-panicked" : ""}`}>
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
      <aside className={`side${menuOpen ? " is-open" : ""}`}>
        <NavLink to="/" className="brand" end>
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
                    <span className="nav-motion">
                      {[...link.label].map((ch, index) => (
                        <span key={`${link.to}-${index}`} className="nav-ch" style={{ ["--i" as string]: index }}>
                          {ch === " " ? "\u00A0" : ch}
                        </span>
                      ))}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <button
          type="button"
          className={`panic-button${panicLocked ? " is-spent" : ""}${panicTaps > 0 ? " is-arming" : ""}`}
          data-taps={panicTaps}
          disabled={panicLocked}
          title={
            panicLocked
              ? "Already raised today. The button opens again tomorrow."
              : "Panic — tap three times to open"
          }
          onClick={tapPanic}
        >
          <PanicIcon />
          <span className="sr-only">
            {panicLocked
              ? "Panic button already used today"
              : `Panic. Tap three times to open. ${PANIC_TAPS - panicTaps} ${
                  PANIC_TAPS - panicTaps === 1 ? "tap" : "taps"
                } left.`}
          </span>
          {panicTaps > 0 ? (
            <span className="panic-tap-count" aria-hidden="true">
              {PANIC_TAPS - panicTaps}
            </span>
          ) : null}
        </button>
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
          {SHOW_PRESENCE_ISLAND ? <PresenceIsland keepers={keepers} /> : null}
          <div className="top-actions">
            <NotificationBell unread={unread} onRead={refreshAlerts} />
            {auth.accessOn ? (
              <button type="button" className="sign-out" onClick={() => auth.signOut()}>
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
      {feelingPrompt && !showHadith ? (
        <FeelingCheckDialog prompt={feelingPrompt} onClose={() => setFeelingPrompt(null)} />
      ) : null}
      {/*<FeedbackDesk/>*/}
      {panicOpen ? (
        <PanicDialog onClose={() => setPanicOpen(false)} onLogged={() => setPanicLocked(true)} />
      ) : null}
    </div>
  );
}

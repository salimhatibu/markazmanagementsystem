import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { formatMoney, formatShortDate } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { HadithBackdrop } from "../components/HadithBackdrop";
import { HadithNotes } from "../components/HadithNotes";
import { HijriDate } from "../components/HijriDate";
import { BookIcon, PenIcon, QuranIcon } from "../components/Motifs";
import { Notice } from "../components/ui";
import { loadDashboard, peekDashboard } from "../lib/dashboard";
import { useCountUp } from "../lib/use-count-up";
import type { DashboardTotals } from "../types";

export function DashboardPage() {
  const { settings, daily } = useOutletContext<WorkspaceContext>();
  const [totals, setTotals] = useState<DashboardTotals | null>(peekDashboard);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    loadDashboard()
      .then((body) => {
        if (!cancel) setTotals(body);
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "The dashboard could not be opened.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const symbol = settings.currencySymbol;
  const money = (amount: number) => formatMoney(amount, symbol);
  const books =
    totals?.booksStart && totals.booksEnd
      ? `${formatShortDate(totals.booksStart)} to ${formatShortDate(totals.booksEnd)}`
      : "this month";
  const ready = totals !== null;
  const inHand = useCountUp(totals?.inHand ?? 0, 1100, 2);
  const salariesPaid = useCountUp(totals?.salariesPaid ?? 0, 950, 2);
  const outstanding = useCountUp(totals?.outstanding ?? 0, 1050, 2);
  const morningStudents = useCountUp(totals?.morningStudents ?? 0, 800);
  const eveningStudents = useCountUp(totals?.eveningStudents ?? 0, 900);
  const teachers = useCountUp(totals?.teachers ?? 0, 850);
  const feesCollected = useCountUp(totals?.feesCollected ?? 0, 1200, 2);
  const expenses = useCountUp(totals?.expenses ?? 0, 1000, 2);

  return (
    <>
      <section className="hero">
        <p className="eyebrow kicker-icon">
          <QuranIcon /> Today at a glance
        </p>
        <HijriDate />
        <blockquote className="page-lead hero-quote">
          <p className="hero-quote-attr">Ibn al-Qayyim رحمه الله</p>
          <p>
            Allāh does not forget the good you do, nor does He forget the good you did to others and the
            pain you relieved them from. Nor will He forget the eye which was about to cry but you made
            it laugh.
          </p>
          <cite>Timeless Seeds of Advice</cite>
        </blockquote>
      </section>
      {error ? <Notice>{error}</Notice> : null}
      <section className="desk-section" aria-labelledby="accounts-heading">
        <header className="desk-section-head">
          <h2 id="accounts-heading">Accounts</h2>
          <p>{books}</p>
        </header>
        <div className="board" aria-busy={!totals && !error} aria-live="polite">
          <article className="stat stat-lead" data-guide="figures">
            <p className="kicker kicker-icon">
              <PenIcon /> In the office
            </p>
            <p className="figure">{ready ? money(inHand) : "—"}</p>
            <p className="stat-note">Fees received, less salaries and expenses</p>
          </article>
          <article className="stat">
            <p className="kicker">Fees collected</p>
            <p className="figure">{ready ? money(feesCollected) : "—"}</p>
            <p className="stat-note">Money that entered the account</p>
          </article>
          <article className="stat">
            <p className="kicker">Salaries paid</p>
            <p className="figure">{ready ? money(salariesPaid) : "—"}</p>
            <p className="stat-note">Paid to teachers from the office</p>
          </article>
          <article className="stat">
            <p className="kicker">Expenses</p>
            <p className="figure">{ready ? money(expenses) : "—"}</p>
            <p className="stat-note">Spent from the office</p>
          </article>
          <article className="stat">
            <p className="kicker">Still owed</p>
            <p className="figure">{ready ? money(outstanding) : "—"}</p>
            <p className="stat-note">Unpaid fees across all years</p>
          </article>
        </div>
      </section>
      <section className="desk-section" aria-labelledby="roll-heading">
        <header className="desk-section-head">
          <h2 id="roll-heading">The roll</h2>
          <p>Morning and evening</p>
        </header>
        <div className="board board-roll">
          <article className="stat">
            <p className="kicker">Students</p>
            <div className="split">
              <div>
                <p className="kicker">Morning</p>
                <p className="figure">{ready ? morningStudents : "—"}</p>
              </div>
              <div>
                <p className="kicker">Evening</p>
                <p className="figure">{ready ? eveningStudents : "—"}</p>
              </div>
            </div>
            <p className="stat-note">Enrolled on the two sittings</p>
          </article>
          <article className="stat">
            <p className="kicker">Teachers</p>
            <p className="figure">{ready ? teachers : "—"}</p>
            <p className="stat-note">On the teaching roll</p>
          </article>
        </div>
      </section>
      <section className="panel panel-light hadith" data-guide="hadith" aria-labelledby="hadith-of-the-day">
        <HadithBackdrop />
        <div className="hadith-head">
          <p className="kicker kicker-icon">
            <BookIcon /> Hadith of the day
            {daily ? ` · ${daily.dayNumber} of ${daily.total}` : ""}
          </p>
          <HadithNotes />
        </div>
        {daily ? (
          <>
            <h2 id="hadith-of-the-day">{daily.hadith.chapter.replace(/^Chapter:\s*/, "")}</h2>
            <p className="arabic-line">{daily.hadith.chapterArabic}</p>
            <p className="narrator">{daily.hadith.narrator}</p>
            <p className="hadith-body">{daily.hadith.english}</p>
            <p className="arabic-line hadith-arabic">{daily.hadith.arabic}</p>
            <p className="hadith-ref">
              {daily.hadith.reference} · {daily.hadith.inBook} · Sahih al-Bukhari, Wedlock, Marriage (Nikaah)
            </p>
          </>
        ) : (
          <h2 id="hadith-of-the-day">Today&rsquo;s reading is on its way</h2>
        )}
      </section>
    </>
  );
}

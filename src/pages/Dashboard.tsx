import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { formatMoney } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { HijriDate } from "../components/HijriDate";
import { BookIcon, PenIcon, QuranIcon } from "../components/Motifs";
import { Notice } from "../components/ui";
import { api } from "../lib/api";
import type { DashboardTotals } from "../types";

export function DashboardPage() {
  const { settings, daily } = useOutletContext<WorkspaceContext>();
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    api<DashboardTotals>("/api/dashboard")
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

  return (
    <>
      <p className="kicker kicker-icon">
        <QuranIcon /> Today at a glance
      </p>
      <HijriDate />
      <p className="page-lead">A quiet view of what is in the office, what is still owed, and how many are enrolled.</p>
      {error ? <Notice>{error}</Notice> : null}
      <div className="board" aria-busy={!totals && !error}>
        <article className="stat stat-light">
          <p className="kicker kicker-icon">
            <PenIcon /> In the office
          </p>
          <p className="figure">{totals ? money(totals.inHand) : "—"}</p>
          <p className="stat-note">Fees collected minus salaries and expenses</p>
        </article>
        <article className="stat stat-dark">
          <p className="kicker">Salaries paid</p>
          <p className="figure figure-sm">{totals ? money(totals.salariesPaid) : "—"}</p>
        </article>
        <article className="stat stat-light">
          <p className="kicker">Still owed</p>
          <p className="figure figure-sm">{totals ? money(totals.outstanding) : "—"}</p>
        </article>
        <article className="stat stat-dark">
          <p className="kicker">Students</p>
          <div className="split">
            <div>
              <p className="kicker">Morning</p>
              <p className="figure figure-sm">{totals ? totals.morningStudents : "—"}</p>
            </div>
            <div>
              <p className="kicker">Evening</p>
              <p className="figure figure-sm">{totals ? totals.eveningStudents : "—"}</p>
            </div>
          </div>
        </article>
        <article className="stat stat-light">
          <p className="kicker">Teachers</p>
          <p className="figure figure-sm">{totals ? totals.teachers : "—"}</p>
        </article>
        <article className="stat stat-dark">
          <p className="kicker">Fees collected</p>
          <p className="figure figure-sm">{totals ? money(totals.feesCollected) : "—"}</p>
        </article>
        <article className="stat stat-light">
          <p className="kicker">Expenses</p>
          <p className="figure figure-sm">{totals ? money(totals.expenses) : "—"}</p>
          <p className="stat-note">Taken from the funds in the office</p>
        </article>
      </div>
      <section className="panel panel-light hadith" aria-labelledby="hadith-of-the-day">
        <p className="kicker kicker-icon">
          <BookIcon /> Hadith of the day
          {daily ? ` · ${daily.dayNumber} of ${daily.total}` : ""}
        </p>
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

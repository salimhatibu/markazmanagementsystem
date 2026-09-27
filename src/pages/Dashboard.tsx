import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { displayName, formatMoney } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
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
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load the dashboard.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const symbol = settings.currencySymbol;
  const money = (amount: number) => formatMoney(amount, symbol);

  return (
    <>
      <p className="micro micro-icon"><QuranIcon /> &gt; Overview</p>
      <h1>{displayName(settings.markazName)}</h1>
      {error ? <Notice>{error}</Notice> : null}
      <div className="board" aria-busy={!totals && !error}>
        <article className="stat stat-light">
          <p className="micro micro-icon"><PenIcon /> &gt; In hand</p>
          <p className="figure">{totals ? money(totals.inHand) : "—"}</p>
        </article>
        <article className="stat stat-dark">
          <p className="micro">&gt; Spent</p>
          <p className="figure figure-sm">{totals ? money(totals.spent) : "—"}</p>
        </article>
        <article className="stat stat-light">
          <p className="micro">&gt; Outstanding</p>
          <p className="figure figure-sm">{totals ? money(totals.outstanding) : "—"}</p>
        </article>
        <article className="stat stat-dark">
          <p className="micro">&gt; Students</p>
          <div className="split">
            <div>
              <p className="micro">&gt; Morning</p>
              <p className="figure figure-sm">{totals ? totals.morningStudents : "—"}</p>
            </div>
            <div>
              <p className="micro">&gt; Evening</p>
              <p className="figure figure-sm">{totals ? totals.eveningStudents : "—"}</p>
            </div>
          </div>
        </article>
        <article className="stat stat-light">
          <p className="micro">&gt; Teachers</p>
          <p className="figure figure-sm">{totals ? totals.teachers : "—"}</p>
        </article>
        <article className="stat stat-dark">
          <p className="micro">&gt; Collected</p>
          <p className="figure figure-sm">{totals ? money(totals.feesCollected) : "—"}</p>
        </article>
      </div>
      <section className="panel panel-light hadith" aria-labelledby="hadith-of-the-day">
        <p className="micro micro-icon">
          <BookIcon /> &gt; Hadith of the day{daily ? ` ${daily.dayNumber} of ${daily.total}` : ""}
        </p>
        {daily ? (
          <>
            <h2 id="hadith-of-the-day">{daily.hadith.chapter.replace(/^Chapter:\s*/, "")}</h2>
            <p className="arabic-line">{daily.hadith.chapterArabic}</p>
            <p className="narrator">{daily.hadith.narrator}</p>
            <p className="hadith-body">{daily.hadith.english}</p>
            <p className="arabic-line hadith-arabic">{daily.hadith.arabic}</p>
            <p className="micro">
              &gt; {daily.hadith.reference} &middot; {daily.hadith.inBook} &middot; Sahih al-Bukhari, Wedlock,
              Marriage (Nikaah)
            </p>
          </>
        ) : (
          <h2 id="hadith-of-the-day">Loading today&rsquo;s hadith</h2>
        )}
      </section>
    </>
  );
}

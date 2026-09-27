import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { formatEat } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Notice, PageHeader } from "../components/ui";
import { api, downloadReport } from "../lib/api";
import type { ReportItem } from "../types";

export function ReportsPage() {
  const { refreshAlerts } = useOutletContext<WorkspaceContext>();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState<"biweekly" | "monthly" | null>(null);
  const [ready, setReady] = useState(false);

  async function load() {
    const body = await api<{ reports: ReportItem[] }>("/api/reports");
    setReports(body.reports);
    setReady(true);
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await api("/api/notifications/read", { method: "POST" });
        await refreshAlerts();
        await load();
      } catch (caught) {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Reports could not be opened.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [refreshAlerts]);

  async function generate(period: "biweekly" | "monthly") {
    setBusy(period);
    setError("");
    setInfo("");
    try {
      const body = await api<{ report: { created: boolean } }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ period }),
      });
      await api("/api/notifications/read", { method: "POST" });
      await refreshAlerts();
      await load();
      setInfo(
        body.report.created === false
          ? "That report is already ready to download."
          : period === "biweekly"
            ? "The mid-month report is ready to download."
            : "The monthly report is ready to download.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be prepared.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        kicker="Files"
        title="Reports"
        lead="Each file is a full operations pack for the period that just ended. Dates and times are East Africa Time."
      >
        <div className="actions">
          <button type="button" className="ghost" disabled={busy !== null} onClick={() => void generate("biweekly")}>
            {busy === "biweekly" ? "Preparing…" : "Prepare mid-month report"}
          </button>
          <button type="button" className="ghost" disabled={busy !== null} onClick={() => void generate("monthly")}>
            {busy === "monthly" ? "Preparing…" : "Prepare monthly report"}
          </button>
        </div>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      {!ready && !error ? (
        <p className="loading-line">Opening reports…</p>
      ) : reports.length === 0 ? (
        <Empty>No reports yet. Prepare one when you want a PDF of the last period.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="table-caption">Prepared reports</caption>
            <thead>
              <tr>
                <th>Period</th>
                <th>Range</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.period === "biweekly" ? "Mid-month" : "Monthly"}</td>
                  <td>
                    {report.rangeStart} to {report.rangeEnd}
                  </td>
                  <td>{formatEat(report.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        void downloadReport(report.id, `markaz-${report.period}-${report.rangeStart}.pdf`).catch(
                          (caught: unknown) => {
                            setError(caught instanceof Error ? caught.message : "The report could not be downloaded.");
                          },
                        )
                      }
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

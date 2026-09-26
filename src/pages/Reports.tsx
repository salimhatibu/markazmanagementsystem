import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
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

  async function load() {
    const body = await api<{ reports: ReportItem[] }>("/api/reports");
    setReports(body.reports);
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await api("/api/notifications/read", { method: "POST" });
        await refreshAlerts();
        await load();
      } catch (caught) {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load reports.");
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
      await api("/api/reports", { method: "POST", body: JSON.stringify({ period }) });
      await api("/api/notifications/read", { method: "POST" });
      await refreshAlerts();
      await load();
      setInfo(`${period === "biweekly" ? "Biweekly" : "Monthly"} report is ready to download.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate the report.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader kicker="Files" title="Reports">
        <div className="actions">
          <button type="button" className="ghost" disabled={busy !== null} onClick={() => void generate("biweekly")}>
            {busy === "biweekly" ? "Generating" : "Generate biweekly"}
          </button>
          <button type="button" className="ghost" disabled={busy !== null} onClick={() => void generate("monthly")}>
            {busy === "monthly" ? "Generating" : "Generate monthly"}
          </button>
        </div>
      </PageHeader>
      <p>Each file is a full operations pack for the period that just ended. Schedules run on the 1st and the 15th in UTC after the site is published.</p>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      {reports.length === 0 ? <Empty>No reports yet.</Empty> : (
        <div className="table-wrap">
          <table>
            <caption className="micro">&gt; Generated reports</caption>
            <thead>
              <tr><th>Period</th><th>Range</th><th>Created</th><th>File</th></tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.period}</td>
                  <td>{report.rangeStart} to {report.rangeEnd}</td>
                  <td>{report.createdAt.slice(0, 16).replace("T", " ")} UTC</td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => void downloadReport(report.id, `markaz-${report.period}-${report.rangeStart}.pdf`).catch((caught: unknown) => {
                        setError(caught instanceof Error ? caught.message : "Could not download the report.");
                      })}
                    >
                      Download
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

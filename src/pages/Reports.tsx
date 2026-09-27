import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { formatEat, formatMoney, formatShortDate, label } from "../../shared/format";
import { LATE_ARRIVAL_DEDUCTION, applicantName, payoutPhone } from "../../shared/letterhead";
import { BankDetails, OfficialLetterhead } from "../components/OfficialLetterhead";
import type { WorkspaceContext } from "../components/Shell";
import { Empty, Notice, PageHeader, Panel } from "../components/ui";
import { api, downloadReport } from "../lib/api";
import type { FeeReceiptPreview, ReceiptScope, ReportItem } from "../types";

const VIEWS: { scope: ReceiptScope; period: "biweekly" | "monthly"; label: string }[] = [
  { scope: "current", period: "monthly", label: "This month" },
  { scope: "monthly", period: "monthly", label: "Last month" },
  { scope: "biweekly", period: "biweekly", label: "Mid-month" },
];

export function ReportsPage() {
  const { settings, refreshAlerts } = useOutletContext<WorkspaceContext>();
  const [scope, setScope] = useState<ReceiptScope>("current");
  const [preview, setPreview] = useState<FeeReceiptPreview | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState<ReceiptScope | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const period = VIEWS.find((view) => view.scope === scope)?.period ?? "monthly";

  async function loadList() {
    const body = await api<{ reports: ReportItem[] }>("/api/reports");
    setReports(body.reports);
  }

  async function loadPreview(next: ReceiptScope) {
    const body = await api<FeeReceiptPreview>(`/api/reports?scope=${next}`);
    setPreview(body);
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await api("/api/notifications/read", { method: "POST" });
        await refreshAlerts();
        await Promise.all([loadList(), loadPreview(scope)]);
        if (!cancel) setReady(true);
      } catch (caught) {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Reports could not be opened.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [refreshAlerts]);

  async function show(next: ReceiptScope) {
    setScope(next);
    setError("");
    try {
      await loadPreview(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This table could not be opened.");
    }
  }

  async function generate() {
    setBusy(scope);
    setError("");
    setInfo("");
    try {
      const body = await api<{ report: { created: boolean; id?: number } }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ period, scope }),
      });
      await api("/api/notifications/read", { method: "POST" });
      await refreshAlerts();
      await loadList();
      setInfo(
        body.report.created === false
          ? "That report is already ready to download."
          : "The report is ready to download.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be prepared.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    setError("");
    setInfo("");
    try {
      await api(`/api/reports/${id}`, { method: "DELETE" });
      await api("/api/notifications/read", { method: "POST" });
      await refreshAlerts();
      await loadList();
      setRemoving(null);
      setInfo("That PDF has been removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That PDF could not be removed.");
    }
  }

  const symbol = preview?.currencySymbol || settings.currencySymbol;
  const month = preview?.monthName?.toUpperCase() ?? "";

  return (
    <>
      <PageHeader
        kicker="Files"
        title="Reports"
        lead="The same letterhead, fees table, salary sheet, and paybill details used on the official papers. Dates are East Africa Time."
      >
        <div className="actions" data-guide="report-views">
          {VIEWS.map((view) => (
            <button
              key={view.scope}
              type="button"
              className="ghost"
              aria-pressed={scope === view.scope}
              onClick={() => void show(view.scope)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      {!ready && !error ? (
        <p className="loading-line">Opening this month’s fees…</p>
      ) : preview ? (
        <Panel tone="light" className="ledger">
          <OfficialLetterhead
            letterhead={preview.letterhead}
            title={`${month} REPORT`}
            preparedOn={formatShortDate(preview.preparedOn)}
          />
          <p className="ledger-range">
            {formatShortDate(preview.rangeStart)} to {formatShortDate(preview.rangeEnd)}
          </p>
          <h3 className="panel-title">Fees received</h3>
          {preview.lines.length === 0 ? (
            <Empty>No fees have entered the account in this period yet.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <caption className="table-caption">Money that entered the account</caption>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Section</th>
                    <th>M-Pesa ref no</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((line, index) => (
                    <tr key={`${line.paidOn}-${line.mpesaRef}-${index}`}>
                      <td data-label="#">{index + 1}</td>
                      <td data-label="Student">{line.studentName || line.admissionNumber || "—"}</td>
                      <td data-label="Section">{label(line.section)}</td>
                      <td data-label="M-Pesa ref no">{line.mpesaRef || "—"}</td>
                      <td data-label="Amount">{formatMoney(line.amount, symbol)}</td>
                      <td data-label="Date">{formatShortDate(line.paidOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="ledger-summary">{preview.summary}</p>
          <p className="ledger-total">
            Total amount received <strong>{formatMoney(preview.totalReceived, symbol)}</strong>
          </p>
          <h3 className="panel-title">Teachers&rsquo; salary{month ? ` (${month})` : ""}</h3>
          {preview.salaries.length === 0 ? (
            <Empty>No teachers recorded.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <caption className="table-caption">Teachers&rsquo; salary</caption>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Name of the applicant</th>
                    <th>Phone number</th>
                    <th>ID number</th>
                    <th>M-Pesa ref no</th>
                    <th>Date</th>
                    <th>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.salaries.map((line, index) => (
                    <tr key={`${line.name}-${line.paidOn}-${line.mpesaRef}-${index}`}>
                      <td data-label="No.">{index + 1}</td>
                      <td data-label="Name of the applicant">{applicantName(line.name, line.mpesaName)}</td>
                      <td data-label="Phone number">{payoutPhone(line.phone, line.mpesaNumber) || "—"}</td>
                      <td data-label="ID number">{line.nationalId || "—"}</td>
                      <td data-label="M-Pesa ref no">{line.mpesaRef || "—"}</td>
                      <td data-label="Date">{line.paidOn ? formatShortDate(line.paidOn) : "—"}</td>
                      <td data-label="Salary">{formatMoney(line.salary, symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="ledger-summary">
            NB: For each day&rsquo;s late arrival, Ksh {LATE_ARRIVAL_DEDUCTION} is deducted from the salary.
          </p>
          <p className="ledger-total">
            Total salaries <strong>{formatMoney(preview.totalSalaries, symbol)}</strong>
          </p>
          <button type="button" className="solid" data-guide="save-report" disabled={busy !== null} onClick={() => void generate()}>
            {busy ? "Preparing…" : "Save this report as a PDF"}
          </button>
        </Panel>
      ) : null}
      {preview ? (
        <Panel tone="dark">
          <BankDetails letterhead={preview.letterhead} />
        </Panel>
      ) : null}
      {!ready && !error ? null : (
        <Panel tone="light" className="saved-files">
          <p className="panel-title">Saved PDFs</p>
          <p className="saved-files-lead">
            Copies already prepared. These files sit apart from the official report above.
          </p>
          {reports.length === 0 ? (
            <Empty>No saved PDFs yet. Save one when you want a copy of the tables above.</Empty>
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
                      <td data-label="Period">{report.period === "biweekly" ? "Mid-month" : "Monthly"}</td>
                      <td data-label="Range">
                        {formatShortDate(report.rangeStart)} to {formatShortDate(report.rangeEnd)}
                      </td>
                      <td data-label="Created">{formatEat(report.createdAt)}</td>
                      <td>
                        {removing === report.id ? (
                          <span className="inline-confirm">
                            Remove this PDF?
                            <button type="button" className="ghost" onClick={() => void remove(report.id)}>
                              Yes, remove
                            </button>
                            <button type="button" className="text-button" onClick={() => setRemoving(null)}>
                              Keep it
                            </button>
                          </span>
                        ) : (
                          <span className="row-actions">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() =>
                                void downloadReport(report.id, `markaz-${report.period}-${report.rangeStart}.pdf`).catch(
                                  (caught: unknown) => {
                                    setError(
                                      caught instanceof Error ? caught.message : "The report could not be downloaded.",
                                    );
                                  },
                                )
                              }
                            >
                              Download PDF
                            </button>
                            <button type="button" className="text-button" onClick={() => setRemoving(report.id)}>
                              Remove
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}

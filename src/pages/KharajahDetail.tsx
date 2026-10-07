import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { formatMoney, formatShortDate, label } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import type { KharajahLeaver } from "../types";

function dateLabel(value: string) {
  return value ? formatShortDate(value) : "—";
}

export function KharajahDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useOutletContext<WorkspaceContext>();
  const [leaver, setLeaver] = useState<KharajahLeaver | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api<{ leaver: KharajahLeaver }>(`/api/kharajah/${id}`)
      .then((body) => setLeaver(body.leaver))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "This Kharajah record could not be opened."),
      );
  }, [id]);

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/kharajah/${id}`, { method: "DELETE" });
      navigate("/kharajah");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The record could not be removed.");
      setBusy(false);
    }
  }

  const symbol = settings.currencySymbol;
  if (!leaver) {
    return error ? <Notice>{error}</Notice> : <p className="loading-line">Opening this record…</p>;
  }

  return (
    <>
      <PageHeader kicker={leaver.admissionNumber} title={leaver.name} person>
        <Link className="ghost" to="/kharajah">
          Back to Kharajah
        </Link>
      </PageHeader>
      {error ? <Notice>{error}</Notice> : null}

      <div className="meta-row kharajah-summary">
        <div>
          <span className="kicker">Age</span>
          <strong>{leaver.age}</strong>
        </div>
        <div>
          <span className="kicker">Class time</span>
          <strong className="meta-word">{label(leaver.section)}</strong>
        </div>
        <div>
          <span className="kicker">Admitted</span>
          <strong className="meta-word">{dateLabel(leaver.admittedOn)}</strong>
        </div>
        <div>
          <span className="kicker">Left on</span>
          <strong className="meta-word">{dateLabel(leaver.leftOn)}</strong>
        </div>
        <div>
          <span className="kicker">Fees paid</span>
          <strong>{formatMoney(leaver.feesPaid, symbol)}</strong>
        </div>
        <div>
          <span className="kicker">Expected fees</span>
          <strong>{formatMoney(leaver.expectedFees, symbol)}</strong>
        </div>
      </div>

      <Panel tone="light" className="kharajah-sheet">
        <p className="panel-title">Reason for leaving</p>
        <p className="kharajah-reason">{leaver.leaveReason}</p>
        {leaver.notes ? (
          <>
            <p className="panel-title kharajah-notes-title">Notes</p>
            <p className="kharajah-reason">{leaver.notes}</p>
          </>
        ) : null}
      </Panel>

      <Panel tone="light" className="kharajah-sheet">
        <p className="panel-title">Details kept from the student record</p>
        <div className="record-facts">
          <div>
            <span className="kicker">Gender</span>
            <strong className="meta-word">{label(leaver.gender)}</strong>
          </div>
          <div>
            <span className="kicker">Date of birth</span>
            <strong className="meta-word">{dateLabel(leaver.dateOfBirth)}</strong>
          </div>
          <div>
            <span className="kicker">Admission fee</span>
            <strong className="meta-word">
              {leaver.admissionFeeCollected
                ? formatMoney(leaver.admissionFeeAmount, symbol)
                : "Not collected"}
            </strong>
          </div>
          <div>
            <span className="kicker">Guardian</span>
            <strong className="meta-word">{leaver.guardianName}</strong>
          </div>
          <div>
            <span className="kicker">Phone</span>
            <strong className="meta-word">{leaver.guardianPhone}</strong>
          </div>
          <div>
            <span className="kicker">Email</span>
            <strong className="meta-word">{leaver.guardianEmail}</strong>
          </div>
          {leaver.secondContactName || leaver.secondContactPhone || leaver.secondContactEmail ? (
            <>
              <div>
                <span className="kicker">Second contact</span>
                <strong className="meta-word">{leaver.secondContactName || "—"}</strong>
              </div>
              <div>
                <span className="kicker">Phone</span>
                <strong className="meta-word">{leaver.secondContactPhone || "—"}</strong>
              </div>
              <div>
                <span className="kicker">Email</span>
                <strong className="meta-word">{leaver.secondContactEmail || "—"}</strong>
              </div>
            </>
          ) : null}
        </div>
      </Panel>

      <div className="actions">
        {confirming ? (
          <div className="confirm-box" role="group" aria-label="Confirm permanent removal">
            <p>This permanently removes {leaver.name} from Kharajah. That cannot be undone.</p>
            <button type="button" className="solid" disabled={busy} onClick={() => void remove()}>
              Yes, remove this record
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>
              Keep this record
            </button>
          </div>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirming(true)}>
            Remove from Kharajah
          </button>
        )}
      </div>
    </>
  );
}

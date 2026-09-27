import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CURRENCY, MARKAZ_NAME } from "../../shared/format";
import type { WorkspaceContext } from "../components/Shell";
import { Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";

export function SettingsPage() {
  const { settings, refreshSettings } = useOutletContext<WorkspaceContext>();
  const [markazName, setMarkazName] = useState(settings.markazName ?? MARKAZ_NAME);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol ?? CURRENCY);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMarkazName(settings.markazName ?? MARKAZ_NAME);
    setCurrencySymbol(settings.currencySymbol ?? CURRENCY);
  }, [settings.markazName, settings.currencySymbol]);

  useEffect(() => {
    api<{ configured: boolean }>("/api/mail")
      .then((body) => setMailConfigured(body.configured))
      .catch(() => setMailConfigured(false));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ markazName, currencySymbol }),
      });
      await refreshSettings();
      setInfo("Settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        kicker="Office"
        title="Settings"
        lead="The name on the dashboard and the currency on every amount. Leave a field blank to keep the usual default."
      />
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <Panel tone="light">
        <form onSubmit={(event) => void save(event)} className="form-grid">
          <Field id="markaz-name" label="Markaz name" hint="Shown at the top of the home page.">
            <input
              id="markaz-name"
              value={markazName}
              onChange={(event) => setMarkazName(event.target.value)}
              placeholder="markaz"
            />
          </Field>
          <Field id="currency" label="Currency" hint="Amounts are in Kenyan shillings.">
            <input
              id="currency"
              value={currencySymbol}
              maxLength={16}
              onChange={(event) => setCurrencySymbol(event.target.value)}
              placeholder="KES"
            />
          </Field>
          <button className="solid" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      </Panel>
      <Panel tone="dark">
        <p className="panel-title">Fee reminders</p>
        {mailConfigured === null ? (
          <p>Checking whether email is ready…</p>
        ) : mailConfigured ? (
          <p>You can send a balance reminder from a student&rsquo;s record.</p>
        ) : (
          <p>
            Reminders stay off until the office mailbox is connected on the hosting site. The app will never pretend a
            message was sent.
          </p>
        )}
      </Panel>
    </>
  );
}

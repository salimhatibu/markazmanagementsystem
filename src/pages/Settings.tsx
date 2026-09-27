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
      setError(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader kicker="Office" title="Settings" />
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <Panel tone="light">
        <form onSubmit={(event) => void save(event)} className="form-grid">
          <Field id="markaz-name" label="Markaz name">
            <input id="markaz-name" value={markazName} onChange={(event) => setMarkazName(event.target.value)} />
          </Field>
          <Field id="currency" label="Currency symbol">
            <input id="currency" value={currencySymbol} maxLength={16} onChange={(event) => setCurrencySymbol(event.target.value)} />
          </Field>
          <button className="solid" type="submit" disabled={busy}>Save settings</button>
        </form>
        <p>The name is markaz and amounts are in KES. Leave a field blank to keep that default.</p>
      </Panel>
      <Panel tone="dark">
        <p className="micro">&gt; Mail</p>
        {mailConfigured === null ? (
          <p className="micro">&gt; Checking mail</p>
        ) : mailConfigured ? (
          <p>Balance alerts can be sent from a student record.</p>
        ) : (
          <p>
            Mail is not configured. Balance alerts stay off until SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and
            MARKAZ_FROM are set in the Netlify environment. The app will not pretend a message was sent.
          </p>
        )}
      </Panel>
    </>
  );
}

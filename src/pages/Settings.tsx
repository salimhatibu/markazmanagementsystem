import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CURRENCY, MARKAZ_NAME } from "../../shared/format";
import {
  ACCOUNT_NAME,
  ACCOUNT_NUMBER,
  BANK_NAME,
  OFFICIAL_ADDRESS,
  OFFICIAL_NAME,
  PAYBILL,
} from "../../shared/letterhead";
import type { WorkspaceContext } from "../components/Shell";
import { Field, Notice, PageHeader, Panel } from "../components/ui";
import { api } from "../lib/api";
import { startGuide } from "../lib/guide";

export function SettingsPage() {
  const { settings, refreshSettings } = useOutletContext<WorkspaceContext>();
  const [markazName, setMarkazName] = useState(settings.markazName ?? MARKAZ_NAME);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol ?? CURRENCY);
  const [address, setAddress] = useState(settings.address ?? OFFICIAL_ADDRESS);
  const [accountName, setAccountName] = useState(settings.accountName ?? ACCOUNT_NAME);
  const [bankName, setBankName] = useState(settings.bankName ?? BANK_NAME);
  const [paybill, setPaybill] = useState(settings.paybill ?? PAYBILL);
  const [accountNumber, setAccountNumber] = useState(settings.accountNumber ?? ACCOUNT_NUMBER);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMarkazName(settings.markazName ?? MARKAZ_NAME);
    setCurrencySymbol(settings.currencySymbol ?? CURRENCY);
    setAddress(settings.address ?? OFFICIAL_ADDRESS);
    setAccountName(settings.accountName ?? ACCOUNT_NAME);
    setBankName(settings.bankName ?? BANK_NAME);
    setPaybill(settings.paybill ?? PAYBILL);
    setAccountNumber(settings.accountNumber ?? ACCOUNT_NUMBER);
  }, [settings]);

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
        body: JSON.stringify({
          markazName,
          currencySymbol,
          address,
          accountName,
          bankName,
          paybill,
          accountNumber,
        }),
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
        lead="The short name on the home page, and the letterhead and bank details printed on every report."
      />
      {error ? <Notice>{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}
      <Panel tone="light" className="settings-letterhead">
        <form onSubmit={(event) => void save(event)} className="form-grid" data-guide="settings">
          <Field id="markaz-name" label="Short name" hint="Shown at the top of the pages.">
            <input
              id="markaz-name"
              value={markazName}
              onChange={(event) => setMarkazName(event.target.value)}
              placeholder="markaz"
            />
          </Field>
          <Field id="official-name" label="Name on letters" hint="Printed on fees and salary papers.">
            <input id="official-name" value={OFFICIAL_NAME} readOnly />
          </Field>
          <Field id="address" label="Postal address">
            <input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={OFFICIAL_ADDRESS}
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
          <Field id="account-name" label="Account name">
            <input
              id="account-name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder={ACCOUNT_NAME}
            />
          </Field>
          <Field id="bank-name" label="Bank">
            <input
              id="bank-name"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder={BANK_NAME}
            />
          </Field>
          <Field id="paybill" label="Paybill">
            <input id="paybill" value={paybill} onChange={(event) => setPaybill(event.target.value)} placeholder={PAYBILL} />
          </Field>
          <Field id="account-number" label="Account number">
            <input
              id="account-number"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder={ACCOUNT_NUMBER}
            />
          </Field>
          <button className="solid" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      </Panel>
      <Panel tone="light">
        <p className="panel-title">How to use this site</p>
        <p>
          A short walkthrough of home, students, fees, teachers, salaries, expenses, reports, and these settings. It
          is meant for someone opening the books on a new phone.
        </p>
        <button type="button" className="ghost guide-replay" onClick={() => startGuide()}>
          Walk me through the site
        </button>
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

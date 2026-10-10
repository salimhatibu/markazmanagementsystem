import type { ReactNode } from "react";
import { EmptyTrayIcon } from "./Motifs";

export function PageHeader({
  kicker,
  title,
  lead,
  person,
  children,
}: {
  kicker: string;
  title: string;
  lead?: string;
  person?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <p className="kicker">{kicker}</p>
      <div className="page-header-row">
        <h1 className={person ? "person-title" : undefined}>{title}</h1>
        {children}
      </div>
      {lead ? <p className="page-lead">{lead}</p> : null}
    </header>
  );
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "ok" }) {
  return (
    <p className={tone === "ok" ? "notice ok" : "notice"} role={tone === "ok" ? "status" : "alert"}>
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <EmptyTrayIcon className="empty-icon" />
      <p>{children}</p>
    </div>
  );
}

export function Panel({
  tone,
  children,
  className = "",
}: {
  tone: "light" | "dark";
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel panel-${tone} ${className}`.trim()}>{children}</section>;
}

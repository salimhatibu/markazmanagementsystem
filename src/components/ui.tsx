import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <p className="micro">&gt; {kicker}</p>
      <div className="page-header-row">
        <h1>{title}</h1>
        {children}
      </div>
    </header>
  );
}

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="micro" htmlFor={id}>
        &gt; {label}
      </label>
      {children}
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
  return <p className="empty">{children}</p>;
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

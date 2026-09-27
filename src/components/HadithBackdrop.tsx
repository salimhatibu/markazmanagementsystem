import type { ReactNode } from "react";

function Motif({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 3.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function RoseMotif({ className }: { className?: string }) {
  return (
    <Motif className={className}>
      <path fill="currentColor" opacity="0.14" d="M52 128c22-6 34 8 30 22-24 12-48 4-50-10-2-10 8-10 20-12Z" />
      <path {...stroke} d="M70 40c18 8 28 28 22 46" />
      <path {...stroke} d="M130 48c16 14 18 36 6 52" />
      <path {...stroke} d="M158 96c8 18-2 38-20 48" />
      <path {...stroke} d="M138 154c-18 14-42 12-58 2" />
      <path {...stroke} d="M70 160c-20 2-36-14-38-32" />
      <path {...stroke} d="M38 96c-2-20 12-40 32-48" />
      <circle cx="100" cy="104" r="28" stroke="currentColor" strokeWidth="3.2" />
      <path {...stroke} d="M100 82c10 8 14 20 8 30-8-6-16-8-24-4 4-12 10-20 16-26Z" />
      <circle cx="100" cy="108" r="7" fill="currentColor" />
    </Motif>
  );
}

function OpenBookMotif({ className }: { className?: string }) {
  return (
    <Motif className={className}>
      <path
        {...stroke}
        d="M28 52c30-10 52-4 72 18 20-22 42-28 72-18v104c-32-8-54 4-72 24-18-20-40-32-72-24V52Z"
      />
      <path {...stroke} d="M100 70 V170" />
      <path {...stroke} d="M46 78 H86 M46 96 H86 M46 114 H78" />
      <path {...stroke} d="M114 78 H154 M114 96 H154 M114 114 H146" />
    </Motif>
  );
}

function QalamMotif({ className }: { className?: string }) {
  return (
    <Motif className={className}>
      <path {...stroke} d="M44 168 136 48c8-10 24-10 32 0l4 4c10 10 10 24 0 34L80 176" />
      <path {...stroke} d="M44 168 28 188 52 176" />
      <path {...stroke} d="M128 56 72 140" />
    </Motif>
  );
}

function MosqueMotif({ className }: { className?: string }) {
  return (
    <Motif className={className}>
      <path {...stroke} d="M36 88 V172 M36 70 44 48 52 70 V88" />
      <path {...stroke} d="M164 88 V172 M164 70 172 48 180 70 V88" />
      <circle cx="44" cy="42" r="6" stroke="currentColor" strokeWidth="3.2" />
      <circle cx="172" cy="42" r="6" stroke="currentColor" strokeWidth="3.2" />
      <path {...stroke} d="M100 34c30 16 42 42 42 66H58c0-24 12-50 42-66Z" />
      <path {...stroke} d="M52 100 H148 V172 H52 Z" />
      <path {...stroke} d="M100 118c12 0 20 10 20 22v32H80v-32c0-12 8-22 20-22Z" />
    </Motif>
  );
}

function PhoneMotif({ className }: { className?: string }) {
  return (
    <Motif className={className}>
      <rect x="62" y="24" width="76" height="152" rx="16" stroke="currentColor" strokeWidth="3.2" />
      <rect x="74" y="46" width="52" height="104" rx="6" stroke="currentColor" strokeWidth="3.2" />
      <path {...stroke} d="M88 34 H112" />
      <circle cx="100" cy="162" r="5" stroke="currentColor" strokeWidth="3.2" />
    </Motif>
  );
}

const motifs = [RoseMotif, OpenBookMotif, QalamMotif, MosqueMotif, PhoneMotif];

export function HadithBackdrop() {
  return (
    <div className="hadith-backdrop" aria-hidden="true">
      <div className="hadith-wash" />
      {motifs.map((Item, index) => (
        <Item key={index} className={`hadith-motif hadith-motif-${index + 1}`} />
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

type IconProps = { className?: string };

function Stroke({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconBold(_props: IconProps) {
  return (
    <Stroke>
      <path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 12h7.5a3.5 3.5 0 0 1 0 7H7z" />
    </Stroke>
  );
}

export function IconItalic() {
  return (
    <Stroke>
      <path d="M10 5h8M6 19h8M14 5 10 19" />
    </Stroke>
  );
}

export function IconUnderline() {
  return (
    <Stroke>
      <path d="M7 5v7a5 5 0 0 0 10 0V5" />
      <path d="M5 19h14" />
    </Stroke>
  );
}

export function IconStrike() {
  return (
    <Stroke>
      <path d="M5 12h14" />
      <path d="M16 7.5A4 4 0 0 0 8.5 8" />
      <path d="M8 16.5A4 4 0 0 0 15.5 16" />
    </Stroke>
  );
}

export function IconHighlight() {
  return (
    <Stroke>
      <path d="M4 20h7l9-9-4-4-9 9v4z" />
      <path d="m14 7 4 4" />
    </Stroke>
  );
}

export function IconCode() {
  return (
    <Stroke>
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
    </Stroke>
  );
}

export function IconHeading() {
  return (
    <Stroke>
      <path d="M6 5v14M18 5v14M6 12h12" />
    </Stroke>
  );
}

export function IconSubhead() {
  return (
    <Stroke>
      <path d="M6 6v12M14 6v12M6 12h8" />
      <path d="M17 14v4M20 14v4M17 16h3" />
    </Stroke>
  );
}

export function IconList() {
  return (
    <Stroke>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" />
    </Stroke>
  );
}

export function IconNumbers() {
  return (
    <Stroke>
      <path d="M10 7h10M10 12h10M10 17h10" />
      <path d="M5 8V6h2v6M5 18h3M5 16h2a1 1 0 0 1 0 2 1 1 0 0 1 0 2H5" />
    </Stroke>
  );
}

export function IconQuote() {
  return (
    <Stroke>
      <path d="M7 11h4v6H6v-4a5 5 0 0 1 5-5" />
      <path d="M15 11h4v6h-5v-4a5 5 0 0 1 5-5" />
    </Stroke>
  );
}

export function IconAlignLeft() {
  return (
    <Stroke>
      <path d="M4 7h16M4 12h10M4 17h14" />
    </Stroke>
  );
}

export function IconAlignCenter() {
  return (
    <Stroke>
      <path d="M4 7h16M7 12h10M5 17h14" />
    </Stroke>
  );
}

export function IconAlignRight() {
  return (
    <Stroke>
      <path d="M4 7h16M10 12h10M6 17h14" />
    </Stroke>
  );
}

export function IconLink() {
  return (
    <Stroke>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
    </Stroke>
  );
}

export function IconPicture() {
  return (
    <Stroke>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m20 16-4.5-4.5L8 19" />
    </Stroke>
  );
}

export function IconVideo() {
  return (
    <Stroke>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3z" />
    </Stroke>
  );
}

export function IconYoutube() {
  return (
    <Stroke>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="m10 9 6 3-6 3z" fill="currentColor" stroke="none" />
    </Stroke>
  );
}

export function IconLine() {
  return (
    <Stroke>
      <path d="M5 12h14" />
    </Stroke>
  );
}

export function IconUndo() {
  return (
    <Stroke>
      <path d="M9 8 5 12l4 4" />
      <path d="M5 12h9a5 5 0 0 1 0 10H8" />
    </Stroke>
  );
}

export function IconRedo() {
  return (
    <Stroke>
      <path d="m15 8 4 4-4 4" />
      <path d="M19 12H10a5 5 0 0 0 0 10h6" />
    </Stroke>
  );
}

export function IconClear() {
  return (
    <Stroke>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="m8 7 1 12h6l1-12" />
    </Stroke>
  );
}

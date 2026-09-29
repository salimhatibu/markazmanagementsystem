import type { ReactNode } from "react";

type IconProps = { className?: string };

export function QuranIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        d="M16 6c-3.2 1.2-6.4 1.2-9.6 0v18c3.2 1.2 6.4 1.2 9.6 0 3.2 1.2 6.4 1.2 9.6 0V6c-3.2 1.2-6.4 1.2-9.6 0Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M16 6.5v17.2" />
    </svg>
  );
}

export function PenIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        d="M20.5 5.5 26.5 11.5 12 26H6v-6L20.5 5.5Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M17.5 8.5 23.5 14.5" />
    </svg>
  );
}

export function FeatherIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 27.2 11.2 20.4C8.6 14.8 12.2 8.2 20 4.8c2.2-1 4.6-.6 5.6 1.2 1.2 2 .2 4.6-2.2 6.8-4.8 4.4-10.2 6.6-12.2 6.2"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 27.2 13 24.6 11.2 20.4"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M10.8 19.2c2.6-1.6 7-5 9.8-9.2M13.6 15.8c2.2-1.8 5.4-4.8 7.2-7.4M16.4 12.6c1.6-1.6 3.6-3.6 4.8-5.4"
      />
    </svg>
  );
}

export function CrescentIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.2 5.2a10.2 10.2 0 1 0 8.4 15.6 8.2 8.2 0 1 1-8.4-15.6Z"
      />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.2 9.4C12.4 7.6 9.4 6.8 6 6.8a1.2 1.2 0 0 0-1.2 1.2v14.4c0 .7.5 1.2 1.2 1.2 3.1 0 5.8.7 8.3 2.3.3.2.6.2.9.1v-16Z"
      />
      <path
        fill="currentColor"
        d="M16.8 9.4c2.8-1.8 5.8-2.6 9.2-2.6.7 0 1.2.5 1.2 1.2v14.4c0 .7-.5 1.2-1.2 1.2-3.1 0-5.8.7-8.3 2.3-.3.2-.6.2-.9.1v-16Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M16 9.6v16.8" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M25.2 6.8l-2.8 2.8M9.6 22.4l-2.8 2.8" />
      </g>
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        d="M16 3 19.2 12.8 29 16 19.2 19.2 16 29 12.8 19.2 3 16 12.8 12.8 16 3Z"
      />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M8 8 24 24M24 8 8 24"
      />
    </svg>
  );
}

export function BooksStackIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M3.6 20.8h24.8v6.6H3.6z" />
        <path d="M7.8 20.8v6.6M25.2 21.8v4.6" />
        <path d="M4.6 13.8h22.8v6.6H4.6z" />
        <path d="M8.6 13.8v6.6M25 14.8v4.6" />
        <path d="M5.6 6.8h20.8v6.6H5.6z" />
        <path d="M9.4 6.8v6.6M24.6 7.8v4.6" />
      </g>
    </svg>
  );
}

export function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <BooksStackIcon />
    </div>
  );
}

function StrokeIcon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function NavHomeIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M3 11 L12 3 L21 11" />
      <path d="M5 9 V21 H19 V9" />
    </StrokeIcon>
  );
}

export function NavPeopleIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20 C3 16 6 14 9 14 C12 14 15 16 15 20" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 20 C16 17.5 17.5 16 19.5 16 C21 16 22 17 22 19" />
    </StrokeIcon>
  );
}

export function NavLedgerIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9 H16 M8 13 H16 M8 17 H12" />
    </StrokeIcon>
  );
}

export function NavChartIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M4 18 L9 12 L13 16 L20 7" />
      <path d="M14 7 H20 V13" />
    </StrokeIcon>
  );
}

export function NavFileIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M7 3 H14 L19 8 V21 H7 Z" />
      <path d="M14 3 V8 H19" />
    </StrokeIcon>
  );
}

export function NavBlogIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M5 5 H19 V20 H5 Z" />
      <path d="M9 5 V20" />
      <path d="M12 9 H16 M12 13 H16" />
    </StrokeIcon>
  );
}

export function NavGearIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4 V7 M12 17 V20 M4 12 H7 M17 12 H20 M6.2 6.2 L8.3 8.3 M15.7 15.7 L17.8 17.8 M17.8 6.2 L15.7 8.3 M8.3 15.7 L6.2 17.8" />
    </StrokeIcon>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4 C9.8 7.8 11 7 12.2 7 C13.6 7 14.6 7.9 14.6 9.2 C14.6 10.6 13.4 11.2 12.5 11.8 C12 12.2 11.8 12.6 11.8 13.3" />
      <path d="M12 16.6 V16.7" />
    </StrokeIcon>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
    </StrokeIcon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M12 5 V19 M5 12 H19" />
    </StrokeIcon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M5 8 H19" />
      <path d="M8 8 V6 H16 V8" />
      <path d="M7 8 V20 H17 V8" />
      <path d="M10 11 V17 M14 11 V17" />
    </StrokeIcon>
  );
}

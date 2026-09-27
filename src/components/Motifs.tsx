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

export function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <QuranIcon />
      <PenIcon />
      <CrescentIcon />
      <StarIcon />
    </div>
  );
}

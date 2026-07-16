export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="15" fill="currentColor" className="text-foreground" />
      <circle cx="10.5" cy="16" r="3" fill="var(--background)" />
      <rect x="15" y="14.5" width="8" height="3" rx="1.5" fill="var(--background)" />
      <circle cx="24" cy="16" r="2" fill="var(--background)" />
    </svg>
  )
}

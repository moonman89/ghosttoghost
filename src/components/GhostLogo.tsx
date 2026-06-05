interface GhostLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

export default function GhostLogo({
  size = 24,
  className = "",
  title,
}: GhostLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={!title}
    >
      {title && <title>{title}</title>}
      <path
        d="M16 3C9.5 3 5 8 5 14.5V26.5c0 0 2.2-2.4 4.5-1.8 1.2.3 2.2 1.5 3.5 2 1.3-.5 2.3-1.7 3.5-2 2.3-.6 4.5 1.8 4.5 1.8V14.5C21 8 17 3 16 3Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="1.35" fill="currentColor" />
      <circle cx="20" cy="14" r="1.35" fill="currentColor" />
    </svg>
  );
}

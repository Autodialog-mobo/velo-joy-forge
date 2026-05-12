export function VelopassMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#2ECC8A" />
      <path
        d="M24 54 L42 72 L76 30"
        fill="none"
        stroke="#0D1F3C"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

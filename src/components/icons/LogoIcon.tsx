// src/components/icons/LogoIcon.tsx
export default function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.5" // Slightly thinner lines for a more refined look
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Abstract representation of data flow / algorithm */}
      <path d="M6.5 17.5L3 14L6.5 10.5" />
      <path d="M10 21L14 3" />
      <path d="M17.5 10.5L21 14L17.5 17.5" />
    </svg>
  );
}

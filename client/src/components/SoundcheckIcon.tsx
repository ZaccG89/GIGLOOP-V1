import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  intensity?: number;
};

export function SoundcheckIcon({ intensity = 0, ...props }: Props) {
  const a = Math.max(0, Math.min(1, intensity));
  const op = 0.55 + a * 0.35;

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6.5 9.2c-1 1-1.5 2.1-1.5 2.8s.5 1.8 1.5 2.8" opacity={op} />
      <path d="M17.5 9.2c1 1 1.5 2.1 1.5 2.8s-.5 1.8-1.5 2.8" opacity={op} />
      <path d="M9 14.8v-5.6" opacity={0.7 + a * 0.3} />
      <path d="M12 16v-8" opacity={0.85 + a * 0.15} />
      <path d="M15 14.2V9.8" opacity={0.7 + a * 0.3} />
      <path d="M12 6.2h.01" opacity={0.25 + a * 0.35} />
    </svg>
  );
}
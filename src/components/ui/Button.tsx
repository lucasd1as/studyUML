import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-xp-500 text-ink-950 hover:bg-xp-400 active:bg-xp-300 shadow-[0_8px_30px_-10px_rgba(242,181,68,0.7)]",
  secondary: "bg-ink-700 text-ink-100 hover:bg-ink-600 active:bg-ink-600",
  ghost: "bg-transparent text-ink-200 hover:bg-ink-800",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xp-400 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}

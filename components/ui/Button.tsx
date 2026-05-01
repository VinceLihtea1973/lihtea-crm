import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "toolbar" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-teal text-white hover:bg-teal-2 shadow-sm",
  secondary:
    "bg-surface text-navy border border-border hover:bg-bg",
  ghost:
    "bg-transparent text-text-2 hover:bg-bg",
  toolbar:
    "bg-surface text-text-1 border border-border hover:bg-bg text-[12px]",
  danger:
    "bg-lh-red text-white hover:opacity-90",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal/40",
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

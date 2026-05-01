import { cn } from "@/lib/cn";

type ChipColor = "navy" | "teal" | "gold" | "green" | "red" | "blue" | "purple" | "amber";

const COLORS: Record<ChipColor, string> = {
  navy:   "bg-navy text-white",
  teal:   "bg-teal-bg text-teal-2 border border-teal-border",
  gold:   "bg-gold-bg text-[#8b6914]",
  green:  "bg-lh-green-bg text-lh-green",
  red:    "bg-lh-red-bg text-lh-red",
  blue:   "bg-lh-blue-bg text-lh-blue",
  purple: "bg-lh-purple-bg text-lh-purple",
  amber:  "bg-lh-amber-bg text-lh-amber",
};

export function Chip({
  color = "teal",
  children,
  className,
}: {
  color?: ChipColor;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold",
        COLORS[color],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Score circle (ICP) — reprise 1:1 du composant de la démo.
 */
export function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-lh-green-bg text-lh-green border-lh-green/30"
      : score >= 50
        ? "bg-lh-amber-bg text-lh-amber border-lh-amber/30"
        : "bg-lh-red-bg text-lh-red border-lh-red/30";
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-full grid place-items-center text-[13px] font-extrabold font-mono border",
        color
      )}
    >
      {score}
    </div>
  );
}

const PALETTE = [
  "#0d9488",
  "#0f2b46",
  "#2563eb",
  "#7c3aed",
  "#d97706",
  "#059669",
  "#dc2626",
];

export function Avatar({
  name,
  seed,
  size = 36,
}: {
  name: string;
  seed?: number | string;
  size?: number;
}) {
  const initials = name
    .replace(/&/g, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const key =
    typeof seed === "number"
      ? seed
      : [...(seed ?? name)].reduce((s, c) => s + c.charCodeAt(0), 0);
  const color = PALETTE[key % PALETTE.length];

  return (
    <div
      className="rounded-full grid place-items-center font-extrabold text-white flex-none"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.38),
      }}
    >
      {initials}
    </div>
  );
}

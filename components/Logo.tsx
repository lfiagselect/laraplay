// LARAPLAY — Wordmark logo (style Netflix)

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "text-5xl md:text-6xl" : size === "md" ? "text-3xl" : "text-xl";
  return (
    <span className={`logo-wordmark ${sizeClass} uppercase select-none`}>
      LARAPLAY
    </span>
  );
}

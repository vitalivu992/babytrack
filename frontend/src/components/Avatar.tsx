import { cn, initials } from "../lib/utils";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-3xl",
};

const GRADIENTS = [
  "from-brand-300 to-pink-soft",
  "from-sky-soft to-brand-300",
  "from-mint-soft to-sky-soft",
  "from-peach-soft to-pink-soft",
  "from-brand-400 to-brand-200",
];

/** Deterministic pastel gradient avatar from a name; shows initials or photo. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = GRADIENTS[hash % GRADIENTS.length];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white shadow-sm",
        SIZES[size],
        gradient,
        className,
      )}
      aria-label={name}
      role="img"
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

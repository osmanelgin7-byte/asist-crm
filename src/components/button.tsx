import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50",
        size === "sm" ? "px-3.5 py-2 text-sm" : "px-4 py-2.5 text-sm",
        variant === "primary" && "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-[0.98]",
        variant === "accent" && "btn-brand text-white active:scale-[0.98]",
        variant === "secondary" && "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-indigo-200",
        variant === "ghost" && "text-zinc-600 hover:bg-indigo-50 hover:text-indigo-700",
        variant === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

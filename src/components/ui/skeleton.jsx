import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="skeleton"
      className={cn("relative overflow-hidden bg-accent animate-pulse rounded-md before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent", className)}
      {...props} />)
  );
}

export { Skeleton }

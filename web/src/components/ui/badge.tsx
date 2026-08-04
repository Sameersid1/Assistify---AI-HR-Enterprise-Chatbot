import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/50",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        outline:
          "border-zinc-200 text-zinc-700 bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
        active:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400",
        pending:
          "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-400",
        error:
          "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-400",
        inactive:
          "border-zinc-200 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

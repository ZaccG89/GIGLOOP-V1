import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-nonefocus:ring-2 focus:ring-purple-500/40",
  {
    variants: {
      variant: {
        default: `
          bg-gradient-to-r from-purple-600 to-purple-500
          text-white
          shadow-[0_0_10px_rgba(139,92,246,0.4)]
          hover:from-purple-500 hover:to-purple-400
        `,

        secondary: `
          bg-[#0b0f1a]
          text-zinc-300
          border border-white/5
          hover:bg-white/5 hover:text-white
        `,

        ghost: `
          text-zinc-400
          hover:text-white
          hover:bg-white/5
        `,

        outline: `
          border border-purple-500/30
          text-white
          hover:bg-purple-500/10
        `,
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

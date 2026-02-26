import { ButtonHTMLAttributes, InputHTMLAttributes, forwardRef } from "react";
import { cn } from "./layout";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 active-press flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variant === 'primary' && "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(29,185,84,0.3)]",
          variant === 'secondary' && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === 'outline' && "bg-transparent border border-white/20 text-white hover:bg-white/5",
          variant === 'danger' && "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex w-full rounded-xl border border-white/10 bg-input/50 px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("bg-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden", className)}>
    {children}
  </div>
);

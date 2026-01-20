import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={isLoading || props.disabled}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed",

                    // Variants
                    variant === "primary" &&
                    "bg-gradient-to-r from-teal-accent to-[#0d6b63] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-transparent",
                    variant === "secondary" &&
                    "bg-white/10 text-white hover:bg-white/20 border border-white/10",
                    variant === "danger" &&
                    "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
                    variant === "ghost" &&
                    "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",

                    // Sizes
                    size === "sm" && "px-3 py-1.5 text-xs",
                    size === "md" && "px-6 py-2.5 text-sm",
                    size === "lg" && "px-8 py-3.5 text-base",

                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

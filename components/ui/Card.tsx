import { HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "glass" | "solid";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "glass", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-2xl transition-all",
                    variant === "glass" && "bg-white/5 backdrop-blur-md border border-white/10",
                    variant === "solid" && "bg-primary-dim border border-white/5",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";

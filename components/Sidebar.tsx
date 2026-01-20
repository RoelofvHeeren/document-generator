"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, LayoutDashboard, FileText, Settings, Palette, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Image from "next/image";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/", icon: LayoutDashboard },
        { label: "Brand Kit", href: "/brand-kit", icon: Palette }, // Changed icon from Copy to Palette
        { label: "Templates", href: "/templates", icon: FileText },
        { label: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <aside
            className={cn(
                "h-screen bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300 relative z-50",
                collapsed ? "w-20" : "w-64" // Changed width from w-72 to w-64
            )}
        >
            {/* Header / Logo */}
            <div className="h-20 flex items-center px-6 border-b border-white/10">
                {!collapsed ? (
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8">
                            <Image
                                src="/elvison-logo.png"
                                alt="Elvison Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="font-serif text-xl font-bold tracking-tight text-white">
                            Elvison OS
                        </span>
                    </div>
                ) : (
                    <div className="w-full flex justify-center">
                        <div className="relative w-8 h-8">
                            <Image
                                src="/elvison-logo.png"
                                alt="Elvison Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Collapse Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 z-50 p-1 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/20",
                    collapsed ? "-right-3" : "-right-3" // Position adjusted for both states
                )}
            >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <nav className="flex flex-1 flex-col gap-2 px-4 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group relative flex items-center gap-3 rounded-lg py-3 px-3 text-sm font-medium transition-all duration-300",
                                isActive
                                    ? "bg-teal-accent/20 text-teal-accent"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                                    isActive ? "text-teal-accent" : "text-gray-400 group-hover:text-white"
                                )}
                            />
                            {!collapsed && <span>{item.label}</span>}
                            {isActive && !collapsed && (
                                <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-teal-accent" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                {!collapsed && (
                    <p className="text-xs text-gray-500 text-center">Version 0.1.0</p>
                )}
            </div>
        </aside>
    );
}

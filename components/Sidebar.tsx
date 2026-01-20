"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, LayoutDashboard, FileText, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/", icon: LayoutDashboard },
        { label: "Brand Kit", href: "/brand-kit", icon: Copy },
        { label: "Templates", href: "/templates", icon: FileText },
        { label: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <aside
            className={cn(
                "sticky top-0 h-screen shrink-0 flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 z-50",
                collapsed ? "w-20" : "w-72"
            )}
        >
            <div className="flex h-20 items-center justify-between px-6">
                {!collapsed && (
                    <span className="font-serif text-2xl font-bold tracking-tight text-white">
                        Alvison OS
                    </span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>
            </div>

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

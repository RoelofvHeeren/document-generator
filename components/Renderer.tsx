import React from "react";
import { DocumentComponent } from "@/types/document";
import { DocumentTheme, fifthAvenueTheme } from "@/lib/themes";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { mapFont } from "@/utils/fontMapper";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface RendererProps {
    components: DocumentComponent[];
    theme?: DocumentTheme;
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    onUpdate?: (id: string, updates: Partial<DocumentComponent>) => void;
}

export function Renderer({
    components,
    theme = fifthAvenueTheme,
    selectedId,
    onSelect,
    onUpdate
}: RendererProps) {
    const [draggingId, setDraggingId] = React.useState<string | null>(null);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const [compOffset, setCompOffset] = React.useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent, component: DocumentComponent) => {
        if (selectedId !== component.id) return;
        if ((e.target as HTMLElement).isContentEditable) return;

        setDraggingId(component.id);
        setDragStart({ x: e.clientX, y: e.clientY });
        setCompOffset({ x: component.x || 0, y: component.y || 0 });
        e.preventDefault();
    };

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        if (!draggingId) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        // Note: This assumes a 1:1 scale for simplicity in this calculation,
        // though the parent has a scale(0.8). We'd ideally divide by scale.
        const SCALE = 0.8;

        onUpdate?.(draggingId, {
            x: compOffset.x + (dx / SCALE),
            y: compOffset.y + (dy / SCALE)
        });
    }, [draggingId, dragStart, compOffset, onUpdate]);

    const handleMouseUp = React.useCallback(() => {
        setDraggingId(null);
    }, []);

    React.useEffect(() => {
        if (draggingId) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        } else {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [draggingId, handleMouseMove, handleMouseUp]);

    // Inject theme variables into a dedicated style object
    const themeStyles = {
        "--doc-primary": theme.colors.primary,
        "--doc-secondary": theme.colors.secondary,
        "--doc-accent": theme.colors.accent,
        "--doc-bg": theme.colors.background,
        "--doc-surface": theme.colors.surface,
        "--doc-font-title": theme.fonts.title,
        "--doc-font-body": theme.fonts.body,
    } as React.CSSProperties;

    return (
        <div
            className="w-full h-full relative"
            style={themeStyles}
            onClick={() => onSelect?.(null)}
        >
            {components.map((component) => {
                const isSelected = selectedId === component.id;

                // Base styles for positioning
                const style: React.CSSProperties = {
                    position: "absolute",
                    left: component.x,
                    top: component.y,
                    width: component.width,
                    height: component.height,
                    transform: component.rotation ? `rotate(${component.rotation}deg)` : undefined,
                    cursor: isSelected ? "move" : "pointer",
                    userSelect: "none",
                    ...component.style, // Apply overrides
                };

                const selectionOverlay = isSelected && (
                    <div className="absolute inset-0 border-2 border-teal-500 pointer-events-none z-50">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full" />
                    </div>
                );

                if (component.type === "text") {
                    return (
                        <div
                            key={component.id}
                            style={{
                                ...style,
                                fontFamily: component.font ? mapFont(component.font) : "var(--doc-font-body)",
                                color: "var(--doc-primary)",
                                outline: "none",
                                userSelect: isSelected ? "none" : "auto"
                            }}
                            className={cn(
                                "z-10 transition-shadow",
                                isSelected && "z-20 shadow-xl ring-1 ring-teal-500/20"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(component.id);
                            }}
                            onDoubleClick={(e) => {
                                // Enable editing on double click
                                (e.currentTarget as HTMLElement).contentEditable = "true";
                                (e.currentTarget as HTMLElement).focus();
                            }}
                            onMouseDown={(e) => handleMouseDown(e, component)}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                                e.currentTarget.contentEditable = "false";
                                const newContent = e.currentTarget.innerHTML;
                                if (newContent !== component.content) {
                                    onUpdate?.(component.id, { content: newContent });
                                }
                            }}
                            dangerouslySetInnerHTML={{ __html: component.content || "" }}
                        >
                            {selectionOverlay}
                        </div>
                    );
                }

                if (component.type === "image") {
                    return (
                        <div
                            key={component.id}
                            style={style}
                            className={cn(
                                "z-10 transition-shadow",
                                isSelected && "z-20 shadow-xl ring-1 ring-teal-500/20"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(component.id);
                            }}
                            onMouseDown={(e) => handleMouseDown(e, component)}
                        >
                            <img
                                src={component.src}
                                alt={component.label}
                                className="w-full h-full object-cover pointer-events-none"
                            />
                            {selectionOverlay}
                        </div>
                    );
                }

                if (component.type === "container") {
                    return (
                        <div
                            key={component.id}
                            style={{
                                ...style,
                                backgroundColor: "var(--doc-surface)",
                                borderColor: "var(--doc-accent)"
                            }}
                            className={cn(
                                "z-0 border backdrop-blur-md",
                                isSelected && "ring-2 ring-teal-500"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(component.id);
                            }}
                        >
                            {selectionOverlay}
                        </div>
                    );
                }

                if (component.type === "shape") {
                    return (
                        <div
                            key={component.id}
                            style={{
                                ...style,
                                backgroundColor: style.backgroundColor || "var(--doc-primary)",
                                borderRadius: style.borderRadius || "0"
                            }}
                            className={cn(
                                "z-0",
                                isSelected && "ring-2 ring-teal-500"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(component.id);
                            }}
                        >
                            {selectionOverlay}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

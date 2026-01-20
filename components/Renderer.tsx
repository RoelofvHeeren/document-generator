import { DocumentComponent } from "@/types/document";
import { DocumentTheme, fifthAvenueTheme } from "@/lib/themes";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface RendererProps {
    components: DocumentComponent[];
    theme?: DocumentTheme;
}

export function Renderer({ components, theme = fifthAvenueTheme }: RendererProps) {
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
        >
            {components.map((component) => {
                // Base styles for positioning
                const style: React.CSSProperties = {
                    position: "absolute",
                    left: component.x,
                    top: component.y,
                    width: component.width,
                    height: component.height,
                    ...component.style, // Apply overrides
                };

                if (component.type === "text") {
                    return (
                        <div
                            key={component.id}
                            style={{
                                ...style,
                                fontFamily: "var(--doc-font-body)",
                                color: "var(--doc-primary)"
                            }}
                            className="z-10"
                            dangerouslySetInnerHTML={{ __html: component.content || "" }}
                        />
                    );
                }

                if (component.type === "image") {
                    return (
                        <div key={component.id} style={style} className="z-10 overflow-hidden">
                            <img
                                src={component.src}
                                alt={component.label}
                                className="w-full h-full object-cover"
                            />
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
                            className="z-0 border backdrop-blur-md"
                        />
                    );
                }

                return null;
            })}
        </div>
    );
}

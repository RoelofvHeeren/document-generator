export type ComponentType = "text" | "image" | "container" | "video";

export interface DocumentComponent {
    id: string;
    type: ComponentType;
    // Position for drag & drop (absolute positioning on A4)
    x?: number;
    y?: number;
    width?: number;
    height?: number;

    // Content
    content?: string; // HTML or text
    src?: string; // For images/videos
    style?: Record<string, string>; // CSS overrides

    // Metadata for AI
    label?: string; // e.g., "Project Title", "Hero Image"
    description?: string; // Instructions for AI: "High quality villa exterior"
}

export interface DocumentPage {
    id: string;
    name: string; // e.g., "Cover Page", "Executive Summary"
    background?: string; // Color or Image URL
    components: DocumentComponent[];
}

export interface DocumentTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail: string; // URL
    pages: DocumentPage[];
}

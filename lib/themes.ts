export interface DocumentTheme {
    id: string;
    name: string;
    colors: {
        primary: string;   // Main header color
        secondary: string; // Sub-text color
        accent: string;    // Highlights
        background: string;
        surface: string;   // Cards/Containers
    };
    fonts: {
        title: string;
        body: string;
        code: string;
    };
}

export const fifthAvenueTheme: DocumentTheme = {
    id: "fifth-avenue",
    name: "Fifth Avenue Properties",
    colors: {
        primary: "#000000",
        secondary: "#1A1A1A",
        accent: "#D4C5A8", // Tan / Gold
        background: "#F5F5F3", // Light Gray / Off-white
        surface: "#FFFFFF",
    },
    fonts: {
        title: `"Instrument Serif", serif`,
        body: `"Inter", sans-serif`,
        code: `"JetBrains Mono", monospace`,
    }
};

export const alvisonTheme: DocumentTheme = {
    id: "alvison",
    name: "Alvison OS Default",
    colors: {
        primary: "#FFFFFF",
        secondary: "#9CA3AF",
        accent: "#139187", // Teal
        background: "#000000",
        surface: "rgba(255, 255, 255, 0.05)",
    },
    fonts: {
        title: `"Instrument Serif", serif`,
        body: `"Plus Jakarta Sans", sans-serif`,
        code: `"JetBrains Mono", monospace`,
    }
};

export const themes: Record<string, DocumentTheme> = {
    "fifth-avenue": fifthAvenueTheme,
    "alvison": alvisonTheme,
};

import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  subsets: ["latin"],
  style: "italic",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elvison OS",
  description: "Advanced Document Generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jakarta.variable} ${instrument.variable} ${jetbrains.variable} antialiased bg-black text-white`}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="fixed top-0 left-0 w-full h-full object-cover -z-10 opacity-40"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CONGRUENCE · Neural Grid Protocol",
  description: "Alien platform puzzle miniapp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="scanlines min-h-screen bg-[var(--alien-void)] overflow-x-hidden">
        <div className="max-w-[390px] mx-auto relative min-h-screen">
          {/* Plasma grid background */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <div
              style={{
                backgroundImage: `
                  linear-gradient(var(--alien-border) 1px, transparent 1px),
                  linear-gradient(90deg, var(--alien-border) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
                opacity: 0.12,
                position: "absolute",
                inset: 0,
              }}
            />
            {/* Corner accent decorations */}
            <div
              className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
              style={{
                borderTop: "1px solid var(--alien-plasma)",
                borderLeft: "1px solid var(--alien-plasma)",
                opacity: 0.4,
              }}
            />
            <div
              className="absolute top-0 right-0 w-12 h-12 pointer-events-none"
              style={{
                borderTop: "1px solid var(--alien-plasma)",
                borderRight: "1px solid var(--alien-plasma)",
                opacity: 0.4,
              }}
            />
          </div>

          {/* Main content */}
          <div className="relative z-10">
            <Providers>{children}</Providers>
          </div>
        </div>
      </body>
    </html>
  );
}

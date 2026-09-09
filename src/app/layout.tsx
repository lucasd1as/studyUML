import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "studyUML",
  description: "Gamified, ADHD-friendly study sessions. Five questions at a time.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ink-950 text-ink-100">
        <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}

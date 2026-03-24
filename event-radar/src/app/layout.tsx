import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Events for Christian",
  description: "Curated London events from 30+ sources — think tanks, universities, lecture series & more. Keyword-matched to your interests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

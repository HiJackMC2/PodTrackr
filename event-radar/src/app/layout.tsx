import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventRadar — London Events for Christian",
  description: "Curated London events from UKCLA, Fabian Society, Pints of Knowledge & MCA. Keyword-matched to your interests, no AI tokens burned.",
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

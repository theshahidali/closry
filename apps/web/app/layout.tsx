import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Closry — Financial Narrative Engine",
  description: "AI-generated board-ready financial narratives for SMBs",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-neutral-200 bg-white">
              <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="text-lg font-semibold">
                  closry
                </Link>
                <nav className="flex gap-6 text-sm text-neutral-600">
                  <Link href="/" className="hover:text-neutral-900">
                    Overview
                  </Link>
                  <span className="text-neutral-400">Connections</span>
                  <span className="text-neutral-400">Narrative</span>
                  <span className="text-neutral-400">Documents</span>
                </nav>
              </div>
            </header>
            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
              {children}
            </main>
            <footer className="border-t border-neutral-200 bg-white">
              <div className="max-w-6xl mx-auto px-6 py-3 text-xs text-neutral-500">
                Closry · multi-tenant financial narrative engine
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
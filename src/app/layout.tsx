import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SGM - Support Goods & Maintenance",
  description: "Sistem Support Goods & Maintenance untuk Industrial Gas Plant (Batulicin, Tanjung, Kendari).",
  icons: {
    icon: [
      { url: "/icon.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2" },
    ],
    shortcut: "/icon.png?v=2",
    apple: "/icon.png?v=2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="icon" href="/icon.png?v=2" type="image/png" />
        <link rel="shortcut icon" href="/icon.png?v=2" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png?v=2" />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-800 font-sans">{children}</body>
    </html>
  );
}

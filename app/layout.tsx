import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEM SmartDisiplin | SK Ranggu",
  description: "Sistem pengisian, semakan dan analisis rekod salah laku murid SK Ranggu.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className="antialiased">{children}</body>
    </html>
  );
}

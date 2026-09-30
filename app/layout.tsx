import type { Metadata, Viewport } from "next";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEM SmartDisiplin | SK Ranggu",
  description: "Sistem pengisian, semakan dan analisis rekod salah laku murid SK Ranggu.",
  manifest: "/manifest.webmanifest",
  applicationName: "HEM SmartDisiplin",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SmartDisiplin" },
  icons: {
    icon: [{ url: "/favicon-48.png", sizes: "48x48", type: "image/png" }],
    shortcut: "/favicon-48.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#0c3765", colorScheme: "light" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className="antialiased"><PwaRegister />{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { PWARegister } from "../components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy Stocks MVP",
  description: "Fantasy football style stock competition",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fantasy Stocks"
  },
  icons: {
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1118"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}

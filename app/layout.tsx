import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "react-calendar/dist/Calendar.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade Journal",
  description: "投資判断を記録し、振り返るためのトレードジャーナル",
  applicationName: "Trade Journal",
  appleWebApp: {
    capable: true,
    title: "Trade Journal",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#060b16",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-[#060b16] antialiased`}
    >
      <body className="min-h-screen w-full min-w-0 max-w-full bg-[#060b16] text-slate-50">
        <div id="app-root" className="min-h-screen w-full min-w-0 max-w-full bg-[#060b16]">
          {children}
        </div>
      </body>
    </html>
  );
}

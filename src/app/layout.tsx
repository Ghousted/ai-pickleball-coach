import type { Metadata, Viewport } from "next";
import { Archivo, Fugaz_One, Plus_Jakarta_Sans } from "next/font/google";
import { Shell } from "@/components/shell";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-jakarta" });
const archivo = Archivo({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-archivo" });
const fugaz = Fugaz_One({ subsets: ["latin"], weight: "400", variable: "--font-fugaz" });

export const metadata: Metadata = {
  title: "AI Coach",
  description: "Film a clip. Get coached. Earn XP.",
  appleWebApp: { capable: true, title: "AI Coach", statusBarStyle: "default" },
  icons: {
    // src/app/favicon.ico adds the .ico link. The SVG is for browsers that prefer it.
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#042330",
  width: "device-width",
  initialScale: 1,
  // No viewport-fit=cover: iOS keeps the app clear of the notch and the home bar by itself.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${archivo.variable} ${fugaz.variable}`}>
      <body>
        <Shell>{children}</Shell>
        <SwRegister />
      </body>
    </html>
  );
}

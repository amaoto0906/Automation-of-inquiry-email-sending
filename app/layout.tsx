import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import "./ui-polish.css";
import "./theme-dark.css";
import { ThemeProvider } from "@/components/theme-provider";

// Latin・数字は Inter、日本語は Noto Sans JP（日本サイト定番）。next/font でセルフホスト最適化。
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-noto-jp",
  // CJKフォントは大きいためプリロードしない（swapで非ブロッキング読込）
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Outreach Hub",
    template: "%s | Outreach Hub",
  },
  description: "問い合わせフォーム送信業務を、安全かつ効率的に管理するコントロールセンター",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${notoSansJP.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ui-polish.css";
import "./theme-dark.css";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "成长秘书 | Growth Companion",
  description: "把现实生活变成可持续的 RPG 成长系统。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

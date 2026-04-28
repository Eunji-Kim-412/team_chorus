import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PawSori",
  description: "여러 AI 전문가에게 동시에 물어보는 반려동물 케어 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

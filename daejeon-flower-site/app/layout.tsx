import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "대전꽃백화점",
  description: "대전꽃백화점 모바일 주문 홈페이지",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

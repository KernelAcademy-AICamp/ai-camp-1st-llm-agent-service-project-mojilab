import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { GenerationProvider } from "@/contexts/GenerationContext";
import KakaoScript from "@/components/KakaoScript";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mojilab - 이모티콘 생성 서비스",
  description: "AI로 쉽고 빠르게 이모티콘을 만들어보세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} font-sans antialiased`}>
        <KakaoScript />
        <AuthProvider>
          <GenerationProvider>
            {children}
          </GenerationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LayoutWrapper from "@/components/LayoutWrapper";
import { SolanaProvider } from "@/components/SolanaProvider";
import { CategoryProvider } from "@/lib/CategoryContext";
import { ModalProvider } from "@/lib/ModalContext";
import { PriceProvider } from "@/lib/PriceContext";
import AchievementNotification from "@/components/achievements/AchievementNotification";
import WalletSuccessModal from "@/components/WalletSuccessModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const adrianeStyle = Libre_Baskerville({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-adriane",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://djinn.markets'),
  title: "Djinn Markets | Prediction Markets on Solana",
  description: "Trade on the future. Create markets, bet on outcomes, earn rewards. The most premium prediction market experience on Solana.",
  keywords: ["prediction markets", "solana", "crypto", "betting", "djinn", "defi", "web3"],
  authors: [{ name: "Djinn Markets" }],
  creator: "Djinn Markets",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://djinn.markets",
    siteName: "Djinn Markets",
    title: "Djinn Markets | Prediction Markets on Solana",
    description: "Trade on the future. Create markets, bet on outcomes, earn rewards.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Djinn Markets - The Future is Priced In",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Djinn Markets | Prediction Markets on Solana",
    description: "Trade on the future. The most premium prediction market experience.",
    images: ["/og-image.png"],
    creator: "@DjinnMarkets",
  },
  icons: {
    icon: [
      { url: '/star.png', sizes: '64x64', type: 'image/png' },
      { url: '/star.png', sizes: '128x128', type: 'image/png' },
    ],
    apple: '/star.png',
  },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${adrianeStyle.variable} antialiased bg-black text-white flex flex-col min-h-screen`}
      >
        <SolanaProvider>
          <React.Suspense fallback={null}>
            <CategoryProvider>
              <ModalProvider>
                <PriceProvider>
                  <LayoutWrapper>
                    <AchievementNotification />
                    <WalletSuccessModal />
                    <main className="pt-20 flex-grow">
                      {children}
                    </main>
                  </LayoutWrapper>
                  <Footer />
                </PriceProvider>
              </ModalProvider>
            </CategoryProvider>
          </React.Suspense>
        </SolanaProvider>
      </body>
    </html>
  );
}
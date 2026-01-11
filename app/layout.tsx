import type { Metadata } from "next";
import { Geist, Geist_Mono, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SolanaProvider } from "@/components/SolanaProvider";
import { CategoryProvider } from "@/lib/CategoryContext";
import AchievementNotification from "@/components/achievements/AchievementNotification";

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
  title: "Djinn",
  description: "The future is priced in.",
  icons: {
    icon: [
      { url: '/star.png', sizes: '64x64', type: 'image/png' },
      { url: '/star.png', sizes: '128x128', type: 'image/png' },
    ],
    apple: '/star.png',
  },
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
          <CategoryProvider>
            <Navbar />
            <AchievementNotification />
            <main className="pt-20 flex-grow">
              {children}
            </main>
            <Footer />
          </CategoryProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
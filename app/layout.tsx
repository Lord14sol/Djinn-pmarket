import type { Metadata } from "next";
import { Geist, Geist_Mono, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
  title: "Djinn Markets",
  description: "The future is priced in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        // FONDO NEGRO FORZADO (bg-black). Esto elimina la posibilidad de franjas grises.
        className={`${geistSans.variable} ${geistMono.variable} ${adrianeStyle.variable} antialiased bg-black text-white flex flex-col min-h-screen`}
      >
        <Navbar />
        <main className="pt-32 flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
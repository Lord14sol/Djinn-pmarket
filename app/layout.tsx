import type { Metadata } from "next";
// 1. IMPORTAMOS LA FUENTE "Libre Baskerville" (Estilo Adriane Text)
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

// 2. CONFIGURAMOS LA FUENTE
const adrianeStyle = Libre_Baskerville({
  weight: "700", // Bold
  subsets: ["latin"],
  variable: "--font-adriane", // La guardamos en una variable
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
        // 3. AGREGAMOS LA VARIABLE font-adriane AL BODY
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
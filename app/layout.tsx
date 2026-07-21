import type { Metadata } from "next";
import {
  Inter,
  Plus_Jakarta_Sans,
  Playfair_Display,
  Bodoni_Moda,
  DM_Serif_Display,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Customer Intake Portal — The Owner Toolkit",
  description:
    "A beautifully designed inquiry portal for your business. Built with The Owner Toolkit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${playfair.variable} ${bodoni.variable} ${dmSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

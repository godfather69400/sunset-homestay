import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { PROPERTY } from "@/lib/constants";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(PROPERTY.siteUrl),
  title: {
    default: `${PROPERTY.name} · Bir Billing — Book Direct & Save`,
    template: `%s · ${PROPERTY.name}`,
  },
  description:
    "Book Sunset Point Homestay in Bir Billing directly and skip the 15-20% OTA commission MakeMyTrip, Goibibo and Airbnb charge. Pay a partial advance, message the owner directly on WhatsApp, and cancel easily if plans change.",
  keywords: [
    "Sunset Point Homestay",
    "Bir Billing homestay",
    "Bir homestay direct booking",
    "Bir Billing paragliding stay",
    "cheap homestay Bir",
    "book direct Bir Himachal",
  ],
  alternates: { canonical: PROPERTY.siteUrl },
  openGraph: {
    title: `${PROPERTY.name} · Bir Billing`,
    description: PROPERTY.tagline,
    url: PROPERTY.siteUrl,
    siteName: PROPERTY.name,
    images: [PROPERTY.heroImage],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROPERTY.name} · Bir Billing`,
    description: PROPERTY.tagline,
    images: [PROPERTY.heroImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${outfit.variable} font-sans`}>
        <Header />
        {children}
        <Footer />
        <WhatsAppFAB />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

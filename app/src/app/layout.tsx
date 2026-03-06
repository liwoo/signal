import type { Metadata, Viewport } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "SIGNAL is a narrative coding game where you teach yourself Go by helping Maya Chen — a cryptography researcher trapped in a research facility — escape through code. Every challenge is a real Go problem. Every line you write matters.";

export const metadata: Metadata = {
  title: "SIGNAL — Learn Go by keeping someone alive",
  description,
  manifest: "/manifest.json",
  openGraph: {
    title: "SIGNAL",
    description,
    siteName: "SIGNAL",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: 'Dr. Maya Chen pixel art avatar with speech bubble: fmt.Println("Help Me!")',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGNAL — Learn Go by keeping someone alive",
    description,
    images: ["/og.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SIGNAL",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#040810",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${orbitron.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

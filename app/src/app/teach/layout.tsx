import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

/**
 * The teacher console wears its own design system (see `.teacher-ui` in
 * globals.css). Its own scroll container, because the game locks body scroll
 * on small screens.
 */
export default function TeachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`teacher-ui ${geistSans.variable} ${geistMono.variable} fixed inset-0 overflow-y-auto antialiased`}>
      {children}
    </div>
  );
}

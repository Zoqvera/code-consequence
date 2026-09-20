import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { StructuredData } from "@/components/structured-data";
import { buildSiteSchemas } from "@/lib/schema";
import { siteName, siteUrl } from "@/lib/seo";
import "./globals.css";
import "./ux.css";
import "./navigation-expansion.css";
import "./mobile-overflow.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

const gaMeasurementId = process.env.GA_MEASUREMENT_ID?.trim();
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  applicationName: siteName,
  title: { default: siteName, template: `%s | ${siteName}` },
  description: "Independent reporting and analysis on the political, social and environmental consequences of artificial intelligence.",
  creator: siteName,
  publisher: siteName,
  verification: googleSiteVerification
    ? { google: googleSiteVerification }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#f3f0e7",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <StructuredData data={buildSiteSchemas()} />
        {gaMeasurementId ? <GoogleAnalytics measurementId={gaMeasurementId} /> : null}
        {children}
      </body>
    </html>
  );
}

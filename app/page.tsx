import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, siteName } from "@/lib/seo";

const description =
  "Independent reporting and analysis on the political, social and environmental consequences of artificial intelligence.";

export const metadata: Metadata = {
  title: siteName,
  description,
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      en: absoluteUrl("/en"),
      "pt-BR": absoluteUrl("/pt-BR"),
      "x-default": absoluteUrl("/"),
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootPage() {
  return (
    <main className="shell page-pad">
      <p className="eyebrow">Code & Consequence</p>
      <h1>Choose your language</h1>
      <p className="lead">Select the edition you want to read.</p>
      <div className="language-choices">
        <Link className="button" href="/en">English</Link>
        <Link className="button button-secondary" href="/pt-BR">Português</Link>
      </div>
    </main>
  );
}

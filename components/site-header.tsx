import Link from "next/link";
import { dictionary, otherLocale, type Locale } from "@/lib/i18n";

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = dictionary[locale];
  const alternate = otherLocale(locale);
  return (
    <header className="site-header">
      <Link className="brand" href={`/${locale}`} aria-label="Code & Consequence home">
        <span>CODE</span><span className="brand-amp">&</span><span>CONSEQUENCE</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href={`/${locale}`}>{d.nav.home}</Link>
        <Link href={`/${locale}/initiatives`}>{d.nav.initiatives}</Link>
        <Link href={`/${locale}/events`}>{d.nav.events}</Link>
        <Link href={`/${locale}/topics`}>{d.nav.topics}</Link>
        <Link href={`/${locale}/about`}>{d.nav.about}</Link>
      </nav>
      <Link className="language-switch" href={`/${alternate}`}>{d.language}</Link>
    </header>
  );
}

import Link from "next/link";
import { dictionary, otherLocale, type Locale } from "@/lib/i18n";

function NavigationLinks({ locale }: { locale: Locale }) {
  const d = dictionary[locale];

  return (
    <>
      <Link href={`/${locale}`}>{d.nav.home}</Link>
      <Link href={`/${locale}/initiatives`}>{d.nav.initiatives}</Link>
      <Link href={`/${locale}/radar`}>{d.nav.radar}</Link>
      <Link href={`/${locale}/events`}>{d.nav.events}</Link>
      <Link href={`/${locale}/topics`}>{d.nav.topics}</Link>
      <Link href={`/${locale}/about`}>{d.nav.about}</Link>
    </>
  );
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = dictionary[locale];
  const alternate = otherLocale(locale);
  const pt = locale === "pt-BR";

  return (
    <header className="site-header">
      <Link className="brand" href={`/${locale}`} aria-label="Code & Consequence home">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-lockup">
          <span>CODE</span>
          <span className="brand-amp">&</span>
          <span>CONSEQUENCE</span>
        </span>
      </Link>

      <nav className="main-nav" aria-label={pt ? "Navegação principal" : "Main navigation"}>
        <NavigationLinks locale={locale} />
      </nav>

      <div className="header-actions">
        <Link className="language-switch" href={`/${alternate}`} aria-label={pt ? "Mudar idioma" : "Change language"}>
          {d.language}
        </Link>

        <details className="mobile-menu">
          <summary aria-label={pt ? "Abrir menu de navegação" : "Open navigation menu"}>
            <span className="menu-icon" aria-hidden="true" />
            <span className="menu-label">Menu</span>
          </summary>
          <nav className="mobile-nav" aria-label={pt ? "Navegação móvel" : "Mobile navigation"}>
            <NavigationLinks locale={locale} />
          </nav>
        </details>
      </div>
    </header>
  );
}

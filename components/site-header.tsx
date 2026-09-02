"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { SiteSearch, type SearchItem } from "@/components/site-search";
import { dictionary, otherLocale, type Locale } from "@/lib/i18n";

function NavigationLinks({
  locale,
  pathname,
  onNavigate,
}: {
  locale: Locale;
  pathname: string;
  onNavigate?: () => void;
}) {
  const d = dictionary[locale];
  const items = [
    { href: `/${locale}`, label: d.nav.home },
    { href: `/${locale}/initiatives`, label: d.nav.initiatives },
    { href: `/${locale}/radar`, label: d.nav.radar },
    { href: `/${locale}/events`, label: d.nav.events },
    { href: `/${locale}/topics`, label: d.nav.topics },
    { href: `/${locale}/about`, label: d.nav.about },
  ];

  const isActive = (href: string) => href === `/${locale}` ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function SiteHeader({ locale, searchItems }: { locale: Locale; searchItems: SearchItem[] }) {
  const d = dictionary[locale];
  const alternate = otherLocale(locale);
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const pt = locale === "pt-BR";
  const alternateHref = pathname.replace(/^\/(en|pt-BR)(?=\/|$)/, `/${alternate}`) || `/${alternate}`;
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeMobileMenu = useCallback(() => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  }, []);

  return (
    <>
      <header className="site-header">
        <Link className="brand" href={`/${locale}`} aria-label="Code & Consequence home" onClick={closeMobileMenu}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-lockup">
            <span>CODE</span>
            <span className="brand-amp">&</span>
            <span>CONSEQUENCE</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label={pt ? "Navegação principal" : "Main navigation"}>
          <NavigationLinks locale={locale} pathname={pathname} />
        </nav>

        <div className="header-actions">
          <button
            className="search-toggle"
            type="button"
            aria-label={pt ? "Buscar no Code & Consequence" : "Search Code & Consequence"}
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            onClick={() => {
              closeMobileMenu();
              setSearchOpen(true);
            }}
          >
            <span className="search-label">{pt ? "Buscar" : "Search"}</span>
            <span className="search-icon" aria-hidden="true">⌕</span>
          </button>

          <Link className="language-switch" href={alternateHref} aria-label={pt ? "Switch to English" : "Mudar para português"} onClick={closeMobileMenu}>
            {d.language}
          </Link>

          <details className="mobile-menu" ref={mobileMenuRef}>
            <summary aria-label={pt ? "Abrir menu de navegação" : "Open navigation menu"}>
              <span className="menu-icon" aria-hidden="true" />
              <span className="menu-label">Menu</span>
            </summary>
            <nav className="mobile-nav" aria-label={pt ? "Navegação móvel" : "Mobile navigation"}>
              <NavigationLinks locale={locale} pathname={pathname} onNavigate={closeMobileMenu} />
            </nav>
          </details>
        </div>
      </header>

      <SiteSearch locale={locale} items={searchItems} open={searchOpen} onClose={closeSearch} />
    </>
  );
}

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const pt = locale === "pt-BR";

  return (
    <footer className="site-footer">
      <div>
        <strong>Code & Consequence</strong>
        <p>{pt ? "Poder, sociedade e planeta na era da IA." : "Power, society and planet in the age of AI."}</p>
        <p className="footer-note">
          <Link href={`/${locale}/about`}>{pt ? "Sobre" : "About"}</Link>
          {" · "}
          <Link href={`/${locale}/methodology`}>{pt ? "Metodologia" : "Methodology"}</Link>
          {" · "}
          <Link href={`/${locale}/weekly`}>Faultlines Weekly</Link>
          {" · "}
          <Link href={`/${locale}/sources`}>{pt ? "Fontes" : "Sources"}</Link>
          {" · "}
          <Link href={`/${locale}/dossiers`}>{pt ? "Dossiês" : "Dossiers"}</Link>
        </p>
      </div>
      <p className="footer-note">
        © {new Date().getFullYear()} Code & Consequence
        <br />
        Desenvolvido por <a href="https://zoqvera.com" target="_blank" rel="noopener noreferrer">Zoqvera</a>.
      </p>
    </footer>
  );
}

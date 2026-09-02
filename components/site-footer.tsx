import type { Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="site-footer">
      <div><strong>Code & Consequence</strong><p>{locale === "en" ? "Power, society and planet in the age of AI." : "Poder, sociedade e planeta na era da IA."}</p></div>
      <p className="footer-note">
        © {new Date().getFullYear()} Code & Consequence
        <br />
        Desenvolvido por <a href="https://zoqvera.com" target="_blank" rel="noopener noreferrer">Zoqvera</a>.
      </p>
    </footer>
  );
}

import Link from "next/link";

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

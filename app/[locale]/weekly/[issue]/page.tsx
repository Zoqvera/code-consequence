import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaultlinesIssueView } from "@/components/faultlines-issue";
import { faultlinesIssues, getFaultlinesIssue } from "@/lib/faultlines";
import { isLocale, locales } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return faultlinesIssues.flatMap((issue) =>
    locales.map((locale) => ({ locale, issue: issue.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; issue: string }>;
}): Promise<Metadata> {
  const { locale, issue: issueId } = await params;
  if (!isLocale(locale)) return {};

  const issue = getFaultlinesIssue(issueId);
  if (!issue) return {};

  const pt = locale === "pt-BR";
  return buildMetadata({
    locale,
    title: `Faultlines Weekly · ${issue.id}`,
    description: pt
      ? `Edição ${issue.id} do Faultlines Weekly, derivada do corpus publicado do Code & Consequence.`
      : `Faultlines Weekly issue ${issue.id}, derived from the published Code & Consequence corpus.`,
    path: `/weekly/${issue.id}`,
  });
}

export default async function WeeklyIssuePage({
  params,
}: {
  params: Promise<{ locale: string; issue: string }>;
}) {
  const { locale, issue: issueId } = await params;
  if (!isLocale(locale)) notFound();

  const issue = getFaultlinesIssue(issueId);
  if (!issue) notFound();

  const pt = locale === "pt-BR";

  return (
    <div className="shell page-pad">
      <Link className="back-link" href={`/${locale}/weekly`}>
        ← Faultlines Weekly
      </Link>

      <p className="eyebrow">{pt ? "Arquivo semanal" : "Weekly archive"}</p>
      <h1 className="page-title">Faultlines Weekly · {issue.id}</h1>
      <p className="page-intro">
        {pt
          ? "Esta edição é uma composição determinística de registros já publicados e verificados no observatório."
          : "This issue is a deterministic composition of records already published and verified by the observatory."}
      </p>

      <FaultlinesIssueView issue={issue} locale={locale} />
    </div>
  );
}

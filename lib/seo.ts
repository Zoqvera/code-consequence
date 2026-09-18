import type { Metadata } from "next";
import type { Locale } from "./i18n";

const DEFAULT_SITE_URL = "https://zoqvera.github.io/code-consequence";

export const siteName = "Code & Consequence";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "");

type MetadataKind = "website" | "article";

type BuildMetadataInput = {
  locale: Locale;
  title: string;
  description: string;
  path?: string;
  kind?: MetadataKind;
  publishedTime?: string;
};

function normalizePath(path = "") {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function localizedPath(locale: Locale, path = "") {
  return `/${locale}${normalizePath(path)}`;
}

export function absoluteUrl(path = "") {
  const normalized = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${siteUrl}${normalized}`;
}

export function languageAlternates(path = "") {
  return {
    en: absoluteUrl(localizedPath("en", path)),
    "pt-BR": absoluteUrl(localizedPath("pt-BR", path)),
    "x-default": absoluteUrl(localizedPath("en", path)),
  };
}

export function buildMetadata({
  locale,
  title,
  description,
  path = "",
  kind = "website",
  publishedTime,
}: BuildMetadataInput): Metadata {
  const canonical = absoluteUrl(localizedPath(locale, path));
  const openGraphLocale = locale === "pt-BR" ? "pt_BR" : "en_US";
  const alternateLocale = locale === "pt-BR" ? ["en_US"] : ["pt_BR"];

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: kind,
      siteName,
      title,
      description,
      url: canonical,
      locale: openGraphLocale,
      alternateLocale,
      ...(kind === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

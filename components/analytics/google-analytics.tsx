"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type GoogleAnalyticsProps = {
  measurementId: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CHATGPT_REFERRAL_SESSION_KEY = "cc:chatgpt-referral-tracked";

function getGtag() {
  window.dataLayer = window.dataLayer ?? [];

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  return window.gtag;
}

function getLocale(pathname: string) {
  if (pathname.startsWith("/pt-BR/") || pathname === "/pt-BR") {
    return "pt-BR";
  }

  if (pathname.startsWith("/en/") || pathname === "/en") {
    return "en";
  }

  return "unknown";
}

function getTopicSlug(pathname: string) {
  const match = pathname.match(/^\/(?:en|pt-BR)\/topics\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function isChatGptReferral() {
  const source = new URLSearchParams(window.location.search)
    .get("utm_source")
    ?.toLowerCase();

  if (source === "chatgpt.com") {
    return true;
  }

  if (!document.referrer) {
    return false;
  }

  try {
    const hostname = new URL(document.referrer).hostname.toLowerCase();
    return hostname === "chatgpt.com" || hostname.endsWith(".chatgpt.com");
  } catch {
    return false;
  }
}

function shouldTrackChatGptReferral() {
  if (!isChatGptReferral()) {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(CHATGPT_REFERRAL_SESSION_KEY)) {
      return false;
    }

    window.sessionStorage.setItem(CHATGPT_REFERRAL_SESSION_KEY, "1");
  } catch {
    return true;
  }

  return true;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    const gtag = getGtag();

    if (!initialized.current) {
      gtag("js", new Date());
      gtag("config", measurementId, { send_page_view: false });
      initialized.current = true;
    }

    const pagePath = `${pathname}${window.location.search}`;
    const locale = getLocale(pathname);
    const topicSlug = getTopicSlug(pathname);

    gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
      content_language: locale,
    });

    if (topicSlug) {
      gtag("event", "topic_pillar_view", {
        topic_slug: topicSlug,
        content_language: locale,
        page_path: pagePath,
      });
    }

    if (shouldTrackChatGptReferral()) {
      gtag("event", "generative_referral_landing", {
        provider: "chatgpt",
        content_language: locale,
        page_path: pagePath,
        topic_slug: topicSlug ?? "none",
      });
    }
  }, [measurementId, pathname]);

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}

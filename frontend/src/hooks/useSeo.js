import { useEffect } from "react";

/**
 * Lightweight per-page SEO hook.  Updates document.title and the
 * description / og: / twitter: meta tags whenever the route mounts.
 * No external library required.
 */
export default function useSeo({ title, description, path = "" }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} · Pep Girl`
      : "Pep Girl — Peptide Vendors, Price Comparison & Education";
    document.title = fullTitle;

    const setMeta = (selector, value) => {
      const el = document.head.querySelector(selector);
      if (el && value !== undefined && value !== null) el.setAttribute("content", value);
    };

    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="twitter:description"]', description);
    }
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[name="twitter:title"]', fullTitle);

    const canon = document.head.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", `https://pepgirl.com${path}`);
    setMeta('meta[property="og:url"]', `https://pepgirl.com${path}`);
  }, [title, description, path]);
}

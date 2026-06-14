import { useEffect } from "react";

const SITE = "https://pepgirl.com";
const JSONLD_ATTR = "data-seo-jsonld";

/**
 * Lightweight per-page SEO hook. Updates document.title, the
 * description / og: / twitter: meta tags, canonical, and (optionally)
 * injects one or more JSON-LD structured-data scripts that Google can
 * read as soon as the page renders.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} [opts.path]      - URL path (defaults to "")
 * @param {string} [opts.keywords]  - comma-separated keyword string
 * @param {Array<object>} [opts.jsonLd] - array of JSON-LD objects to inject
 */
export default function useSeo({ title, description, path = "", keywords, jsonLd }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} · Pep Girl`
      : "Pep Girl — Peptide Vendors, Price Comparison & Education";
    document.title = fullTitle;

    const setMeta = (selector, value) => {
      const el = document.head.querySelector(selector);
      if (el && value !== undefined && value !== null) el.setAttribute("content", value);
    };
    const ensureMeta = (attr, name, value) => {
      let el = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="twitter:description"]', description);
    }
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[name="twitter:title"]', fullTitle);

    if (keywords) ensureMeta("name", "keywords", keywords);

    const url = `${SITE}${path}`;
    const canon = document.head.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", url);
    setMeta('meta[property="og:url"]', url);

    // Inject / replace JSON-LD
    // First clear any previously injected scripts owned by this hook
    document.head
      .querySelectorAll(`script[type="application/ld+json"][${JSONLD_ATTR}]`)
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));

    if (Array.isArray(jsonLd)) {
      jsonLd.forEach((obj) => {
        if (!obj || typeof obj !== "object") return;
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.setAttribute(JSONLD_ATTR, "1");
        s.textContent = JSON.stringify(obj);
        document.head.appendChild(s);
      });
    }

    return () => {
      // Cleanup JSON-LD on unmount so we don't carry over to other routes
      document.head
        .querySelectorAll(`script[type="application/ld+json"][${JSONLD_ATTR}]`)
        .forEach((el) => el.parentNode && el.parentNode.removeChild(el));
    };
  }, [title, description, path, keywords, jsonLd]);
}

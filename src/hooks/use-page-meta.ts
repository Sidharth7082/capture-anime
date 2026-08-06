import { useEffect } from "react";

const SITE_NAME = "CaptureOrDie";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-route SEO: sets the document title, meta description and OpenGraph /
 * Twitter tags so each page is shareable and indexable on its own.
 */
export function usePageMeta(title: string, description?: string, ogImage?: string, canonicalPath?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    upsertMeta("property", "og:title", title || SITE_NAME);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", window.location.origin + (canonicalPath ?? window.location.pathname));
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title || SITE_NAME);

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    if (ogImage) {
      upsertMeta("property", "og:image", ogImage);
      upsertMeta("name", "twitter:image", ogImage);
    }
  }, [title, description, ogImage, canonicalPath]);
}

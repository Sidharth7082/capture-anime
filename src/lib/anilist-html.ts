import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// AniList description handling.
//
// The backend returns the AniList `description` field as raw HTML (it can
// contain <br>, <i>/<b>, <a href>, lists, code, and spoiler markers ~!…!~)
// and usually ends with a "(Source: …)" footer. Nothing from that payload is
// ever injected into the DOM without first passing through DOMPurify, so
// <script>/<iframe>/on* handlers etc. are stripped even if upstream data
// turns out to be hostile.
// ---------------------------------------------------------------------------

/** Remove the trailing "(Source: …)" footer (and any trailing whitespace). */
export function stripSourceFooter(html: string): string {
  return html.replace(/(?:\s*\(Source:\s*[^)]*\)\s*)+$/i, "").trim();
}

/** Neutralize AniList spoiler markers (~!text!~ → text) — no <details>, no blur, just plain text. */
export function handleSpoilers(html: string): string {
  return html.replace(/~!/g, "").replace(/!~/g, "");
}

// Only these tags survive sanitization; everything else (script, iframe,
// style, form, on* attributes, javascript: URLs…) is removed by DOMPurify.
const ALLOWED_TAGS = [
  "a", "b", "i", "em", "strong", "u", "s", "strike", "br",
  "p", "ul", "ol", "li", "blockquote", "code", "pre", "span",
  "sub", "sup", "h1", "h2", "h3", "h4", "h5", "h6",
];

// Force any link the description contains to open in a new tab, never with
// opener access to our page.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.hasAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Sanitize an AniList HTML description for safe rendering.
 * Returns "" when nothing safe remains.
 */
export function sanitizeAniListHtml(html: string): string {
  if (!html) return "";
  const cleaned = handleSpoilers(stripSourceFooter(html));
  return DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "title"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|#|\/)/i,
  });
}

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#039;": "'", "&#39;": "'", "&#34;": '"', "&nbsp;": " ", "&apos;": "'",
};

/** Decode the common HTML entities a description may contain. */
export function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#039|#39|nbsp|apos);/g, (m) => ENTITY_MAP[m] ?? m);
}

/**
 * Convert an AniList HTML description into clean plain text: <br> and block
 * elements become line breaks, tags are removed, entities are decoded, the
 * "(Source: …)" footer is dropped.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  const cleaned = handleSpoilers(stripSourceFooter(html));
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  doc.querySelectorAll("p, div, li, blockquote, h1, h2, h3, h4, h5, h6").forEach((el) => {
    el.append("\n");
  });
  const text = doc.body.textContent ?? "";
  return decodeEntities(text).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

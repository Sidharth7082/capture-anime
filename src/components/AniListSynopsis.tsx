import React from "react";
import { sanitizeAniListHtml } from "@/lib/anilist-html";

interface Props {
  /** Raw AniList HTML description (may be null/undefined/empty). */
  html?: string | null;
  className?: string;
  emptyText?: string;
}

/**
 * Renders an AniList HTML description safely: the HTML is sanitized with
 * DOMPurify first (tags/attributes whitelisted, links forced to open in a
 * new tab with noopener), the "(Source: …)" footer is stripped, and spoiler
 * markers are neutralized. Only then is it injected via dangerouslySetInnerHTML.
 */
const AniListSynopsis: React.FC<Props> = ({ html, className, emptyText = "No synopsis available." }) => {
  const clean = sanitizeAniListHtml(html ?? "");
  if (!clean) {
    return <p className={className}>{emptyText}</p>;
  }
  // Safe: `clean` has passed through DOMPurify with an allowlist.
  return <p className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
};

export default AniListSynopsis;

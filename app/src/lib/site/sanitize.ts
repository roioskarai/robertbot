// Best-effort HTML sanitizer for admin-authored "custom HTML" SECTIONS.
//
// Note: the global Custom Code Manager (site-wide custom JS / header / footer
// scripts) is intentional owner-authored script injection and is restricted to
// super_admin — it is NOT passed through here. This sanitizer is for content
// sections, where executable script is never desired.

const SCRIPT_TAG = /<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi;
const STYLE_TAG = /<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi;
const ON_ATTR = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi;

export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(SCRIPT_TAG, "")
    .replace(STYLE_TAG, "")
    .replace(ON_ATTR, "")
    .replace(JS_URL, "$1=$2#$2");
}

/** Validate custom CSS/JS size + obvious problems before storing. Returns an
 *  error message (Hebrew) or null when acceptable. */
export function validateCustomCode(
  code: string,
  kind: "css" | "js" | "html",
  maxKb = 64,
): string | null {
  if (code.length > maxKb * 1024) return `הקוד ארוך מדי (מקסימום ${maxKb}KB)`;
  if (kind === "css" && /<\s*\/?\s*script/i.test(code))
    return "אסור לכלול תגי script בתוך CSS";
  return null;
}

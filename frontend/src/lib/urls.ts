/**
 * Only http(s) links are rendered as links. A job URL comes from an imported file, and a
 * "javascript:" URL in an href would run code when clicked.
 */
export function isWebUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

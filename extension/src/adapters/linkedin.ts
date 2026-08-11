import type { ExtractedPost, SiteAdapter } from "./types";

// LinkedIn's class names are obfuscated and churn; data-* URN attributes are
// the stable anchors. All selectors live here and nowhere else.
const POST_SELECTOR = '[data-id^="urn:li:activity"], [data-urn^="urn:li:activity"]';

const TEXT_SELECTORS = [
  ".update-components-update-v2__commentary",
  ".update-components-text",
  ".feed-shared-update-v2__description",
];

const SEE_MORE_CLASS = ".feed-shared-inline-show-more-text__see-more-less-toggle";

function findTextElement(post: Element): Element | null {
  for (const selector of TEXT_SELECTORS) {
    const el = post.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/…?\s*see more\s*$/i, "")
    .trim();
}

function isTruncated(post: Element): boolean {
  if (post.querySelector(SEE_MORE_CLASS)) return true;
  return [...post.querySelectorAll("button")].some((b) => /see more/i.test(b.textContent ?? ""));
}

function withText(el: HTMLElement, id: string): ExtractedPost | null {
  const text = normalizeText(findTextElement(el)?.textContent ?? "");
  if (text === "") return null;
  return { id, element: el, text, truncated: isTruncated(el) };
}

function toPost(el: Element): ExtractedPost | null {
  const id = el.getAttribute("data-id") ?? el.getAttribute("data-urn");
  if (!id || !(el instanceof HTMLElement)) return null;
  return withText(el, id);
}

function findPosts(root: ParentNode): ExtractedPost[] {
  const out: ExtractedPost[] = [];
  const seen = new Set<string>();
  for (const el of root.querySelectorAll(POST_SELECTOR)) {
    const post = toPost(el);
    if (post && !seen.has(post.id)) {
      seen.add(post.id);
      out.push(post);
    }
  }
  return out;
}

export const linkedInAdapter: SiteAdapter = { name: "linkedin-feed", findPosts };

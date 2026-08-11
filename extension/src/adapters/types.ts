/** A post extracted from a host page. */
export interface ExtractedPost {
  /** Stable id for caching, e.g. LinkedIn's activity URN. */
  id: string;
  /** The card element to decorate. */
  element: HTMLElement;
  /** Normalised post text as currently rendered. */
  text: string;
  /** True when the host page has clamped the text ("…see more"). */
  truncated: boolean;
}

/**
 * A site adapter is the only code allowed to know a host page's DOM.
 * Supporting a new site means writing a new adapter, nothing else (ADR 0002).
 */
export interface SiteAdapter {
  name: string;
  findPosts(root: ParentNode): ExtractedPost[];
}

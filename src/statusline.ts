export interface StatusParts {
  model: string;
  status: string;
  branch?: string | null;
  credits?: string | null;
}

/** Render the one-line status: model · status · ⎇ branch · ◆ credits (empty parts omitted). */
export function formatStatusLine(parts: StatusParts): string {
  return [
    `model: ${parts.model}`,
    parts.status,
    parts.branch ? `⎇ ${parts.branch}` : "",
    parts.credits ? `◆ ${parts.credits}` : "",
  ]
    .filter((segment) => segment.length > 0)
    .join(" · ");
}

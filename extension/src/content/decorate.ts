import type { Tier } from "../core/types";

export interface DecorationView {
  tier: Tier | null;
  partial: boolean;
}

const COLORS: Record<Tier, string> = {
  green: "#1a7f37",
  yellow: "#b58900",
  red: "#c62828",
};

const BADGE_TEXT: Record<Tier, string> = {
  green: "AI tells: low",
  yellow: "AI tells: medium",
  red: "AI tells: high",
};

const BADGE_CLASS = "aitm-badge";

export function badgeLabel(view: DecorationView): string {
  const base = view.tier ? BADGE_TEXT[view.tier] : "AI tells: n/a";
  return view.partial ? `${base} ◐` : base;
}

function ensureBadge(el: HTMLElement, onOpen: () => void): HTMLButtonElement {
  const existing = el.querySelector<HTMLButtonElement>(`.${BADGE_CLASS}`);
  if (existing) return existing;
  const badge = el.ownerDocument.createElement("button");
  badge.className = BADGE_CLASS;
  badge.style.cssText =
    "position:absolute;top:8px;right:8px;z-index:10;font:600 11px/1.6 sans-serif;" +
    "padding:1px 10px;border-radius:12px;border:none;color:#fff;cursor:pointer;";
  badge.addEventListener("click", (event) => {
    event.stopPropagation();
    onOpen();
  });
  el.appendChild(badge);
  return badge;
}

function applyOutline(el: HTMLElement, tier: Tier | null): void {
  if (tier) {
    el.style.outline = `3px solid ${COLORS[tier]}`;
    el.style.outlineOffset = "-3px";
  } else {
    el.style.outline = "";
    el.style.outlineOffset = "";
  }
}

function ensurePositioned(el: HTMLElement): void {
  const position = el.ownerDocument.defaultView?.getComputedStyle(el).position ?? "";
  if (position === "" || position === "static") el.style.position = "relative";
}

/**
 * Border + badge for one post card. Idempotent: LinkedIn re-renders wipe
 * inline styles, so callers re-invoke this freely on every scan.
 */
export function decoratePost(el: HTMLElement, view: DecorationView, onOpen: () => void): void {
  ensurePositioned(el);
  applyOutline(el, view.tier);
  const badge = ensureBadge(el, onOpen);
  badge.style.background = view.tier ? COLORS[view.tier] : "#757575";
  badge.textContent = badgeLabel(view);
  el.dataset.aitmTier = view.tier ?? "none";
}

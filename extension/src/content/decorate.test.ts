// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { badgeLabel, decoratePost } from "./decorate";

function card(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

describe("decoratePost", () => {
  it("outlines the card in the tier colour and adds a badge", () => {
    const el = card();
    decoratePost(el, { tier: "red", partial: false }, () => {});
    expect(el.style.outline).toContain("#c62828");
    const badge = el.querySelector("button.aitm-badge")!;
    expect(badge.textContent).toBe("AI tells: high");
    expect(el.dataset.aitmTier).toBe("red");
  });

  it("is idempotent — repeat calls keep a single badge and update it", () => {
    const el = card();
    decoratePost(el, { tier: "green", partial: false }, () => {});
    decoratePost(el, { tier: "yellow", partial: true }, () => {});
    expect(el.querySelectorAll(".aitm-badge")).toHaveLength(1);
    expect(el.querySelector(".aitm-badge")!.textContent).toBe("AI tells: medium ◐");
  });

  it("shows a grey no-verdict badge without an outline when abstaining", () => {
    const el = card();
    decoratePost(el, { tier: null, partial: false }, () => {});
    expect(el.style.outline).toBe("");
    expect(el.querySelector(".aitm-badge")!.textContent).toBe("AI tells: n/a");
  });

  it("opens the report when the badge is clicked", () => {
    const el = card();
    const onOpen = vi.fn();
    decoratePost(el, { tier: "green", partial: false }, onOpen);
    (el.querySelector(".aitm-badge") as HTMLButtonElement).click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("produces a 2px outline and compact badge styles in compact mode", () => {
    const el = card();
    decoratePost(el, { tier: "green", partial: false, compact: true }, () => {});
    expect(el.style.outline).toContain("2px");
    expect(el.style.outlineOffset).toBe("-2px");
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(badge.style.top).toBe("4px");
    expect(badge.style.right).toBe("4px");
    expect(badge.style.fontSize).toBe("10px");
    expect(badge.style.padding).toBe("0px 8px");
  });

  it("switches from compact to non-compact by updating the single badge", () => {
    const el = card();
    decoratePost(el, { tier: "red", partial: false, compact: true }, () => {});
    decoratePost(el, { tier: "red", partial: false, compact: false }, () => {});
    expect(el.querySelectorAll(".aitm-badge")).toHaveLength(1);
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(el.style.outline).toContain("3px");
    expect(el.style.outlineOffset).toBe("-3px");
    expect(badge.style.top).toBe("8px");
    expect(badge.style.right).toBe("8px");
    expect(badge.style.fontSize).toBe("11px");
    expect(badge.style.padding).toBe("1px 10px");
  });
});

describe("badgeLabel", () => {
  it("marks partial analyses", () => {
    expect(badgeLabel({ tier: "green", partial: true })).toBe("AI tells: low ◐");
  });
});

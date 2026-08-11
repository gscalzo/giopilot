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
});

describe("badgeLabel", () => {
  it("marks partial analyses", () => {
    expect(badgeLabel({ tier: "green", partial: true })).toBe("AI tells: low ◐");
  });
});

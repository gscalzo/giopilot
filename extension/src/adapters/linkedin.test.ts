// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { linkedInAdapter } from "./linkedin";

function feed(html: string): ParentNode {
  document.body.innerHTML = html;
  return document;
}

describe("linkedInAdapter", () => {
  it("extracts posts keyed by activity URN", () => {
    const root = feed(`
      <div data-id="urn:li:activity:111">
        <span class="update-components-text">First post text here.</span>
      </div>
      <div data-urn="urn:li:activity:222">
        <span class="update-components-text">Second post text here.</span>
      </div>
    `);
    const posts = linkedInAdapter.findPosts(root);
    expect(posts.map((p) => p.id)).toEqual(["urn:li:activity:111", "urn:li:activity:222"]);
    expect(posts[0]!.text).toBe("First post text here.");
    expect(posts[0]!.truncated).toBe(false);
  });

  it("marks clamped posts as truncated and strips the see-more suffix", () => {
    const root = feed(`
      <div data-id="urn:li:activity:333">
        <span class="update-components-text">A long story about growth…see more</span>
        <button class="feed-shared-inline-show-more-text__see-more-less-toggle">…see more</button>
      </div>
    `);
    const posts = linkedInAdapter.findPosts(root);
    expect(posts[0]!.truncated).toBe(true);
    expect(posts[0]!.text).toBe("A long story about growth");
  });

  it("detects truncation from a generic see-more button", () => {
    const root = feed(`
      <div data-id="urn:li:activity:444">
        <span class="update-components-text">Clamped text</span>
        <button>…see more</button>
      </div>
    `);
    expect(linkedInAdapter.findPosts(root)[0]!.truncated).toBe(true);
  });

  it("skips posts without extractable text and dedupes repeated URNs", () => {
    const root = feed(`
      <div data-id="urn:li:activity:555"><img alt="just media"></div>
      <div data-id="urn:li:activity:666">
        <span class="update-components-text">Kept.</span>
      </div>
      <div data-id="urn:li:activity:666">
        <span class="update-components-text">Duplicate URN.</span>
      </div>
    `);
    const posts = linkedInAdapter.findPosts(root);
    expect(posts.map((p) => p.id)).toEqual(["urn:li:activity:666"]);
  });

  it("normalises non-breaking spaces", () => {
    const root = feed(`
      <div data-id="urn:li:activity:777">
        <span class="update-components-text">Hello&nbsp;world</span>
      </div>
    `);
    expect(linkedInAdapter.findPosts(root)[0]!.text).toBe("Hello world");
  });
});

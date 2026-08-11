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
    const items = linkedInAdapter.findItems(root);
    expect(items.map((p) => p.id)).toEqual(["urn:li:activity:111", "urn:li:activity:222"]);
    expect(items[0]!.kind).toBe("post");
    expect(items[0]!.text).toBe("First post text here.");
    expect(items[0]!.truncated).toBe(false);
  });

  it("marks clamped posts as truncated and strips the see-more suffix", () => {
    const root = feed(`
      <div data-id="urn:li:activity:333">
        <span class="update-components-text">A long story about growth…see more</span>
        <button class="feed-shared-inline-show-more-text__see-more-less-toggle">…see more</button>
      </div>
    `);
    const items = linkedInAdapter.findItems(root);
    expect(items[0]!.truncated).toBe(true);
    expect(items[0]!.text).toBe("A long story about growth");
  });

  it("detects truncation from a generic see-more button", () => {
    const root = feed(`
      <div data-id="urn:li:activity:444">
        <span class="update-components-text">Clamped text</span>
        <button>…see more</button>
      </div>
    `);
    expect(linkedInAdapter.findItems(root)[0]!.truncated).toBe(true);
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
    const items = linkedInAdapter.findItems(root);
    expect(items.map((p) => p.id)).toEqual(["urn:li:activity:666"]);
  });

  it("normalises non-breaking spaces", () => {
    const root = feed(`
      <div data-id="urn:li:activity:777">
        <span class="update-components-text">Hello&nbsp;world</span>
      </div>
    `);
    expect(linkedInAdapter.findItems(root)[0]!.text).toBe("Hello world");
  });

  it("extracts a comment nested inside a post as a separate item", () => {
    const root = feed(`
      <div data-id="urn:li:activity:111">
        <span class="update-components-text">Post commentary text.</span>
        <article class="comments-comment-entity" data-id="urn:li:comment:(urn:li:activity:111,222)">
          <span class="comments-comment-item__main-content">Comment text here.</span>
        </article>
      </div>
    `);
    const items = linkedInAdapter.findItems(root);
    expect(items).toHaveLength(2);

    const post = items.find((i) => i.kind === "post");
    const comment = items.find((i) => i.kind === "comment");
    expect(post!.id).toBe("urn:li:activity:111");
    expect(post!.text).toBe("Post commentary text.");
    expect(comment!.id).toBe("urn:li:comment:(urn:li:activity:111,222)");
    expect(comment!.text).toBe("Comment text here.");
  });

  it("marks a comment truncated by its own see-more button without truncating the post", () => {
    const root = feed(`
      <div data-id="urn:li:activity:333">
        <span class="update-components-text">Post text, not clamped.</span>
        <article class="comments-comment-entity" data-id="urn:li:comment:(urn:li:activity:333,444)">
          <span class="comments-comment-item__main-content">Clamped comment…see more</span>
          <button>…see more</button>
        </article>
      </div>
    `);
    const items = linkedInAdapter.findItems(root);
    const post = items.find((i) => i.kind === "post");
    const comment = items.find((i) => i.kind === "comment");
    expect(post!.truncated).toBe(false);
    expect(comment!.truncated).toBe(true);
    expect(comment!.text).toBe("Clamped comment");
  });

  it("skips a comment container without a data-id", () => {
    const root = feed(`
      <div data-id="urn:li:activity:555">
        <span class="update-components-text">Post text.</span>
        <article class="comments-comment-entity">
          <span class="comments-comment-item__main-content">Orphan comment.</span>
        </article>
      </div>
    `);
    const items = linkedInAdapter.findItems(root);
    expect(items.map((i) => i.kind)).toEqual(["post"]);
  });
});

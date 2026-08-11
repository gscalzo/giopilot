/**
 * Content-script orchestrator (browser glue — logic lives in tested modules).
 * Heuristics run for every discovered post; the cloud judge is only consulted
 * for posts that actually enter the viewport, and results are cached by URN.
 */
import { linkedInAdapter } from "../adapters/linkedin";
import type { ExtractedPost } from "../adapters/types";
import { analyze } from "../core/analyze";
import { hashText } from "../core/hash";
import { scoreText } from "../core/score";
import type { Flag } from "../core/types";
import type { JudgeResult } from "../judge/types";
import type { JudgeRequestMessage, JudgeResponseMessage } from "../messages";
import { combine, type Verdict } from "../verdict";
import { decoratePost } from "./decorate";
import { openReportModal } from "./modal";
import { buildReport } from "./report";

interface PostState {
  post: ExtractedPost;
  hash: string;
  flags: Flag[];
  judge: JudgeResult | null;
  verdict: Verdict;
  judgeRequested: boolean;
}

const states = new Map<string, PostState>();
const elementIds = new WeakMap<Element, string>();

function decorate(state: PostState): void {
  decoratePost(
    state.post.element,
    { tier: state.verdict.tier, partial: state.post.truncated },
    () => {
      openReportModal(
        document,
        buildReport(state.post.text, state.flags, state.verdict, state.judge, state.post.truncated),
      );
    },
  );
}

function applyJudgeResponse(state: PostState, response: JudgeResponseMessage | undefined): void {
  if (!response?.ok) return;
  state.judge = response.result;
  state.verdict = combine(state.verdict.heuristic, response.result);
  decorate(state);
}

function requestJudgement(state: PostState): void {
  if (state.judgeRequested || state.verdict.abstain) return;
  state.judgeRequested = true;
  const message: JudgeRequestMessage = {
    type: "aitm-judge",
    text: state.post.text,
    hash: state.hash,
  };
  chrome.runtime.sendMessage(message, (response: JudgeResponseMessage | undefined) => {
    void chrome.runtime.lastError; // swallow "no receiver" errors
    applyJudgeResponse(state, response);
  });
}

const viewport = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const id = elementIds.get(entry.target);
    const state = id ? states.get(id) : undefined;
    if (entry.isIntersecting && state) requestJudgement(state);
  }
});

function process(post: ExtractedPost): void {
  const hash = hashText(post.text);
  const existing = states.get(post.id);
  if (existing && existing.hash === hash) {
    existing.post = post; // element may have been re-rendered
    decorate(existing);
  } else {
    const flags = analyze(post.text);
    const verdict = combine(scoreText(post.text, flags), null);
    const state: PostState = { post, hash, flags, judge: null, verdict, judgeRequested: false };
    states.set(post.id, state);
    decorate(state);
  }
  elementIds.set(post.element, post.id);
  viewport.observe(post.element);
}

function scan(): void {
  for (const post of linkedInAdapter.findPosts(document)) process(post);
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

const debouncedScan = debounce(scan, 400);
new MutationObserver(debouncedScan).observe(document.body, { childList: true, subtree: true });
scan();

/**
 * LLMs cannot reliably return character offsets, so the cloud judge returns
 * exact quotes instead and we locate them here (see ADR 0001).
 */

export interface Span {
  start: number;
  end: number;
}

export function locateQuote(text: string, quote: string): Span | null {
  if (quote === "") return null;
  let index = text.indexOf(quote);
  if (index < 0) index = text.toLowerCase().indexOf(quote.toLowerCase());
  return index < 0 ? null : { start: index, end: index + quote.length };
}

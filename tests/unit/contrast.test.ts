import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function channel(value: number) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function readRootTokens() {
  const css = readFileSync(
    path.resolve(import.meta.dirname, "../../src/app/globals.css"),
    "utf8",
  );
  const block = css.match(/:root\s*\{([^}]+)\}/)?.[1];
  if (!block) {
    throw new Error("missing :root tokens");
  }
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

describe("palette contrast", () => {
  const tokens = readRootTokens();

  it("muted on cement meets WCAG AA for normal text", () => {
    expect(
      contrastRatio(tokens["text-muted"], tokens["surface-cement"]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("does not regress cream on aubergine, acid on aubergine, or aubergine on acid", () => {
    expect(
      contrastRatio(tokens["text-cream"], tokens["ink-aubergine"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokens["accent-acid"], tokens["ink-aubergine"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokens["ink-aubergine"], tokens["accent-acid"]),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

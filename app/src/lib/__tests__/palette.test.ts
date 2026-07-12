import { describe, it, expect } from "vitest";
import { rankMatch, filterPalette } from "@/lib/palette";

const entries = [
  { labelHe: "משתמשים", keywords: "/admin/users" },
  { labelHe: "סוכני AI", keywords: "/admin/agents" },
  { labelHe: "יומן פעולות", keywords: "/admin/audit" },
  { labelHe: "הרץ את כל הסוכנים (טיוטה)", keywords: "orchestrator dry" },
];

describe("rankMatch", () => {
  it("ranks a prefix match best", () => {
    expect(rankMatch({ labelHe: "משתמשים" }, "משת")).toBe(0);
  });

  it("ranks a word-start match above a mid-substring", () => {
    expect(rankMatch({ labelHe: "יומן פעולות" }, "פע")).toBe(1);
    expect(rankMatch({ labelHe: "הרשמות אחרונות" }, "שמות")).toBe(2);
  });

  it("falls back to keyword match", () => {
    expect(rankMatch({ labelHe: "סוכני AI", keywords: "/admin/agents" }, "agents")).toBe(3);
  });

  it("is case-insensitive on latin keywords", () => {
    expect(rankMatch({ labelHe: "x", keywords: "Orchestrator" }, "orch")).toBe(3);
  });

  it("returns -1 for no match, neutral for empty query", () => {
    expect(rankMatch({ labelHe: "משתמשים" }, "zzz")).toBe(-1);
    expect(rankMatch({ labelHe: "משתמשים" }, "")).toBe(2);
    expect(rankMatch({ labelHe: "משתמשים" }, "   ")).toBe(2);
  });
});

describe("filterPalette", () => {
  it("drops non-matches and sorts by rank then original order", () => {
    const out = filterPalette(entries, "סוכ");
    expect(out.map((e) => e.labelHe)).toEqual(["סוכני AI", "הרץ את כל הסוכנים (טיוטה)"]);
  });

  it("returns everything for an empty query, preserving order", () => {
    const out = filterPalette(entries, "");
    expect(out).toHaveLength(entries.length);
    expect(out[0].labelHe).toBe("משתמשים");
  });

  it("matches via keywords when the label doesn't", () => {
    const out = filterPalette(entries, "audit");
    expect(out.map((e) => e.labelHe)).toEqual(["יומן פעולות"]);
  });

  it("returns empty for a total miss", () => {
    expect(filterPalette(entries, "zzzzz")).toEqual([]);
  });
});

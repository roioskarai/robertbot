import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/agents/runner";

describe("extractJson", () => {
  it("parses clean JSON", () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    const raw = '```json\n{"items":["x"]}\n```';
    expect(extractJson<{ items: string[] }>(raw)).toEqual({ items: ["x"] });
  });

  it("slices the first balanced object out of prose", () => {
    const raw = 'הנה התוצאה שביקשת:\n{"ok":true, "n": 2}\nבהצלחה!';
    expect(extractJson<{ ok: boolean; n: number }>(raw)).toEqual({ ok: true, n: 2 });
  });

  it("handles arrays wrapped in prose", () => {
    const raw = "להלן: [1,2,3] סוף";
    expect(extractJson<number[]>(raw)).toEqual([1, 2, 3]);
  });

  it("throws on garbage", () => {
    expect(() => extractJson("אין כאן שום JSON")).toThrow();
  });
});

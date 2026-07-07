import { describe, it, expect } from "vitest";
import { compareValues, sortRows, paginate, bucketByDay } from "@/lib/table";

describe("table — sort helpers", () => {
  it("compareValues: nulls first, numbers numerically, strings he-locale", () => {
    expect(compareValues(null, 5)).toBeLessThan(0);
    expect(compareValues(5, null)).toBeGreaterThan(0);
    expect(compareValues(2, 10)).toBeLessThan(0); // numeric, not lexicographic
    expect(compareValues("א", "ב")).toBeLessThan(0);
    expect(compareValues(false, true)).toBeLessThan(0);
  });

  it("sortRows is stable and non-mutating", () => {
    const rows = [{ id: "a", n: 2 }, { id: "b", n: 1 }, { id: "c", n: 2 }];
    const asc = sortRows(rows, (r) => r.n, "asc");
    expect(asc.map((r) => r.id)).toEqual(["b", "a", "c"]); // ties keep original order
    expect(rows[0].id).toBe("a"); // original untouched
    const desc = sortRows(rows, (r) => r.n, "desc");
    expect(desc.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("paginate clamps page and reports totals", () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ id: String(i) }));
    const p1 = paginate(rows, 1, 20);
    expect(p1.rows).toHaveLength(20);
    expect(p1.pages).toBe(3);
    const p3 = paginate(rows, 3, 20);
    expect(p3.rows).toHaveLength(5);
    const over = paginate(rows, 99, 20); // clamps to last page
    expect(over.page).toBe(3);
    const under = paginate(rows, 0, 20); // clamps to first
    expect(under.page).toBe(1);
    expect(paginate([], 1, 20).pages).toBe(1); // always ≥1 page
  });

  it("bucketByDay zero-fills the window and counts matching days", () => {
    const today = new Date("2026-07-07T12:00:00Z");
    const series = bucketByDay(
      ["2026-07-07T09:00:00Z", "2026-07-07T20:00:00Z", "2026-07-05T01:00:00Z", "2020-01-01T00:00:00Z"],
      3,
      today,
    );
    expect(series).toHaveLength(3);
    expect(series.map((s) => s.date)).toEqual(["2026-07-05", "2026-07-06", "2026-07-07"]);
    expect(series.find((s) => s.date === "2026-07-07")?.count).toBe(2);
    expect(series.find((s) => s.date === "2026-07-06")?.count).toBe(0);
    expect(series.find((s) => s.date === "2026-07-05")?.count).toBe(1);
    // the 2020 date is outside the window → ignored
  });
});

import { describe, it, expect } from "vitest";
import { visibleNavGroups } from "@/lib/admin-nav-core";

const GROUPS = [
  { label: "לוח בקרה", items: [{ href: "/admin" }] },
  { label: "מערכת ואתר", items: [
    { href: "/admin/system" },
    { href: "/admin/site", perm: "content.read" },
    { href: "/admin/site/code", perm: "code.write" },
  ] },
];

describe("visibleNavGroups", () => {
  it("shows perm-less items and permitted items, hiding the rest", () => {
    const out = visibleNavGroups(GROUPS, (p) => p === "content.read");
    const system = out.find((g) => g.label === "מערכת ואתר")!;
    const hrefs = system.items.map((i) => i.href);
    expect(hrefs).toContain("/admin/system"); // no perm → always shown
    expect(hrefs).toContain("/admin/site"); // content.read granted
    expect(hrefs).not.toContain("/admin/site/code"); // code.write denied
  });

  it("keeps a group with at least one visible item", () => {
    const out = visibleNavGroups(GROUPS, () => false);
    expect(out.map((g) => g.label)).toEqual(["לוח בקרה", "מערכת ואתר"]);
  });

  it("drops a group whose every item is permission-gated and denied", () => {
    const gated = [{ label: "רק מוגן", items: [{ href: "/x", perm: "team.manage" }] }];
    expect(visibleNavGroups(gated, () => false)).toEqual([]);
  });

  it("preserves group and item order", () => {
    const out = visibleNavGroups(GROUPS, () => true);
    expect(out[0].label).toBe("לוח בקרה");
    expect(out[1].items.map((i) => i.href)).toEqual(["/admin/system", "/admin/site", "/admin/site/code"]);
  });
});

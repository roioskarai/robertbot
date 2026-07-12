// Pure permission-filtering for the admin sidebar groups. Kept out of the
// client AdminShell (which imports CSS modules + icons) so it can be unit-tested.

export interface NavItemLike {
  href: string;
  perm?: string;
}

export interface NavGroupLike<I extends NavItemLike> {
  label: string;
  items: I[];
}

/**
 * Filter each group's items by permission (items without a `perm` are always
 * shown), then drop any group left with nothing to show. Order is preserved.
 */
export function visibleNavGroups<I extends NavItemLike>(
  groups: NavGroupLike<I>[],
  hasPerm: (perm: string) => boolean,
): { label: string; items: I[] }[] {
  return groups
    .map((g) => ({ label: g.label, items: g.items.filter((i) => !i.perm || hasPerm(i.perm)) }))
    .filter((g) => g.items.length > 0);
}

/**
 * Maps space-separated original class names to their CSS-module-scoped
 * equivalents. Lets us keep the design's original class strings in JSX
 * (e.g. c("btn btn-primary")) while CSS Modules isolate them per page.
 * Unknown names pass through unchanged.
 */
export function scoped(styles: Record<string, string>) {
  return (names: string): string =>
    names
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => styles[n] ?? n)
      .join(" ");
}

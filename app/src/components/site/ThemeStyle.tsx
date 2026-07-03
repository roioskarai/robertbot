// Server component: injects the active theme as CSS-variable overrides for the
// marketing pages WITHOUT touching the locked CSS modules.
//
// The marketing wrapper carries both `data-marketing` and `data-rb-theme`, so the
// selector `[data-marketing][data-rb-theme]` (specificity 0,0,2,0) beats the
// module's own `.landing` token declarations (0,0,1,0). Dark-mode overrides use
// an even more specific selector. We override the *variables* the locked CSS
// already consumes, so colors/fonts/radius propagate everywhere automatically.

import type { ThemeTokens } from "@/lib/site/types";

/** Strip anything that could break out of a CSS value. Values are admin-authored
 *  but we defend in depth anyway. */
function v(value: string | number | undefined, fallback: string | number = ""): string {
  if (value === undefined || value === null) return String(fallback);
  return String(value).replace(/[<>{};]/g, "").trim();
}

export default function ThemeStyle({ theme }: { theme: ThemeTokens }) {
  const { colors: cl, typography: ty, layout: ly, dark } = theme;
  const sel = "[data-marketing][data-rb-theme]";

  const lightVars = [
    `--bg:${v(cl.bg)}`,
    cl.bgGrad ? `--bg-grad:${v(cl.bgGrad)}` : "",
    `--white:${v(cl.white)}`,
    `--green:${v(cl.green)}`,
    `--green-d:${v(cl.greenD)}`,
    `--green-pale:${v(cl.greenPale)}`,
    `--purple:${v(cl.purple)}`,
    `--purple-pale:${v(cl.purplePale)}`,
    `--t1:${v(cl.t1)}`,
    `--t2:${v(cl.t2)}`,
    `--t3:${v(cl.t3)}`,
    `--t4:${v(cl.t4)}`,
    `--bdr:${v(cl.bdr)}`,
    `--bdr2:${v(cl.bdr2)}`,
    `--shadow:${v(ly.shadow)}`,
    `--shadow-md:${v(ly.shadowMd)}`,
    `--r:${v(ly.radius)}px`,
    `--r-lg:${v(ly.radiusLg)}px`,
    `font-family:${v(ty.fontFamily, "var(--font-rubik), sans-serif")}`,
    `font-size:${v(ty.baseSize, 16)}px`,
    `line-height:${v(ty.lineHeight, 1.6)}`,
    `letter-spacing:${v(ty.letterSpacing, 0)}px`,
  ].filter(Boolean).join(";");

  const darkVars = dark.enabled
    ? [
        dark.bg ? `--bg:${v(dark.bg)}` : "",
        dark.t1 ? `--t1:${v(dark.t1)}` : "",
        dark.white ? `--white:${v(dark.white)}` : "",
      ].filter(Boolean).join(";")
    : "";

  const css =
    `${sel}{${lightVars}}` +
    (darkVars ? `html[data-theme="dark"] ${sel}{${darkVars}}` : "");

  return (
    <>
      {ty.googleFont ? (
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            ty.googleFont,
          )}:wght@300;400;500;600;700;800;900&display=swap`}
          rel="stylesheet"
        />
      ) : null}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}

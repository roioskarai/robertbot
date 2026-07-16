import { useId, type CSSProperties } from "react";

type LogoVariant = "mark" | "wordmark";
type LogoTheme = "light" | "dark";

const MARK_GRADIENT = {
  light: { from: "#15181C", to: "#565F68" },
  dark: { from: "#E8EAED", to: "#9AA3AC" },
} as const;

const CHECK_GRADIENT = {
  light: { from: "#3A424A", mid: "#5C8267", to: "#5FA36A" },
  dark: { from: "#5C8267", mid: "#5FA36A", to: "#7BC787" },
} as const;

// "obert" outlined from Poppins 600 (font-size 52, baseline y=56, start x=56 in
// the 212×82 viewBox). Baked to vector paths on purpose: rendering the wordmark
// as live <text> depended on next/font's Poppins latin face winning over its
// Arial size-adjust fallback inside an SVG — it didn't, so letters landed on
// fallback metrics and the word broke into "obe rt". Outlines are metric-exact
// and immune to any font load race. Regenerate via app/outline_wordmark.py.
const WORDMARK_PATH =
  "M57.768 41.596000000000004Q57.768 37.176 59.718 33.796Q61.668 30.416 65.048 28.57Q68.428 26.724 72.588 26.724Q76.74799999999999 26.724 80.12799999999999 28.57Q83.508 30.416 85.458 33.796Q87.408 37.176 87.408 41.596000000000004Q87.408 46.016 85.406 49.396Q83.404 52.776 79.99799999999999 54.622Q76.592 56.468 72.38 56.468Q68.22 56.468 64.892 54.622Q61.564 52.776 59.666 49.396Q57.768 46.016 57.768 41.596000000000004ZM79.92 41.596000000000004Q79.92 37.488 77.762 35.278Q75.604 33.068 72.484 33.068Q69.364 33.068 67.25800000000001 35.278Q65.152 37.488 65.152 41.596000000000004Q65.152 45.704 67.206 47.914Q69.26 50.124 72.38 50.124Q74.356 50.124 76.098 49.162000000000006Q77.84 48.2 78.88 46.276Q79.92 44.352000000000004 79.92 41.596000000000004Z M109.56 26.724Q113.25200000000001 26.724 116.242 28.544Q119.232 30.364 120.974 33.718Q122.71600000000001 37.072 122.71600000000001 41.492000000000004Q122.71600000000001 45.912 120.974 49.318Q119.232 52.724000000000004 116.242 54.596000000000004Q113.25200000000001 56.468 109.56 56.468Q106.336 56.468 103.918 55.194Q101.5 53.92 100.044 51.892V56.0H92.764V17.520000000000003H100.044V31.404Q101.44800000000001 29.324 103.918 28.024Q106.388 26.724 109.56 26.724ZM107.636 33.120000000000005Q105.66 33.120000000000005 103.918 34.134Q102.176 35.147999999999996 101.11 37.072Q100.044 38.996 100.044 41.596000000000004Q100.044 44.196 101.11 46.12Q102.176 48.044 103.918 49.058Q105.66 50.072 107.636 50.072Q109.664 50.072 111.406 49.032000000000004Q113.148 47.992000000000004 114.214 46.068Q115.28 44.144 115.28 41.492000000000004Q115.28 38.891999999999996 114.214 36.994Q113.148 35.096000000000004 111.406 34.108000000000004Q109.664 33.120000000000005 107.636 33.120000000000005Z M154.592 43.78H133.532Q133.792 46.9 135.716 48.668Q137.64000000000001 50.436 140.448 50.436Q144.504 50.436 146.22 46.952H154.072Q152.824 51.112 149.288 53.790000000000006Q145.752 56.468 140.604 56.468Q136.444 56.468 133.142 54.622Q129.84 52.776 127.994 49.396Q126.148 46.016 126.148 41.596000000000004Q126.148 37.124 127.968 33.744Q129.788 30.364 133.06400000000002 28.544Q136.34 26.724 140.604 26.724Q144.712 26.724 147.962 28.492Q151.212 30.26 153.006 33.510000000000005Q154.8 36.760000000000005 154.8 40.972Q154.8 42.532 154.592 43.78ZM147.26 38.891999999999996Q147.208 36.084 145.232 34.394000000000005Q143.256 32.704 140.39600000000002 32.704Q137.692 32.704 135.846 34.342Q134.0 35.980000000000004 133.584 38.891999999999996Z M176.224 26.776V34.42H174.29999999999998Q170.868 34.42 169.12599999999998 36.032000000000004Q167.384 37.644000000000005 167.384 41.648V56.0H160.10399999999998V27.192H167.384V31.664Q168.78799999999998 29.376 171.04999999999998 28.076Q173.31199999999998 26.776 176.224 26.776Z M189.588 33.172V47.108000000000004Q189.588 48.564 190.29 49.214Q190.992 49.864 192.656 49.864H196.036V56.0H191.46Q182.256 56.0 182.256 47.056V33.172H178.824V27.192H182.256V20.068000000000005H189.588V27.192H196.036V33.172Z";

/**
 * Robert wordmark/mark, rendered as inline SVG (not next/image) so the
 * linear-gradient defs keep working — Next's image optimizer flattens SVGs
 * and breaks gradients. Only the light theme has real artwork today; dark
 * uses a computed gradient until real dark-theme assets are supplied.
 */
export default function Logo({
  variant,
  theme,
  className,
  style,
}: {
  variant: LogoVariant;
  theme: LogoTheme;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const markId = `${uid}-mark`;
  const checkId = `${uid}-check`;
  const mg = MARK_GRADIENT[theme];
  const cg = CHECK_GRADIENT[theme];

  const gradients = (
    <defs>
      <linearGradient id={markId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={mg.from} />
        <stop offset="1" stopColor={mg.to} />
      </linearGradient>
      <linearGradient id={checkId} x1="0" y1="0" x2="1" y2="0.7">
        <stop offset="0" stopColor={cg.from} />
        <stop offset="0.45" stopColor={cg.mid} />
        <stop offset="1" stopColor={cg.to} />
      </linearGradient>
    </defs>
  );

  const mark = (
    <>
      <g stroke={`url(#${markId})`} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M20 18 V 46" />
        <path d="M20 18 h 8 a 8.5 8.5 0 0 1 0 17 h -8" />
      </g>
      <path d="M28 35 L 35 46 L 51 26" stroke={`url(#${checkId})`} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );

  if (variant === "mark") {
    return (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className={className} style={style} role="img" aria-label="Robert">
        {gradients}
        {mark}
      </svg>
    );
  }

  return (
    <svg width="212" height="82" viewBox="0 0 212 82" className={className} style={style} role="img" aria-label="Robert">
      {gradients}
      <g transform="translate(2,9)">{mark}</g>
      <path d={WORDMARK_PATH} fill={`url(#${markId})`} />
    </svg>
  );
}

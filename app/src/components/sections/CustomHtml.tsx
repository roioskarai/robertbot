import { sanitizeHtml } from "@/lib/site/sanitize";
import type { CustomHtmlProps } from "@/lib/site/types";

export default function CustomHtml({ props }: { props: CustomHtmlProps }) {
  return (
    <div
      className="rb-custom-html"
      style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 48px" }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.html) }}
    />
  );
}

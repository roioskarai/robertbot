import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import { sanitizeHtml } from "@/lib/site/sanitize";
import type { RichTextProps } from "@/lib/site/types";

const c = scoped(styles);

// Article body for blog posts / rich content pages. Reuses the page section
// wrapper for spacing; content is sanitized admin-authored HTML.
export default function RichTextSection({ props }: { props: RichTextProps }) {
  return (
    <section className={c("sec")}>
      <div
        className="rb-richtext"
        style={{ maxWidth: 760, margin: "0 auto", color: "var(--t2)", fontSize: 17, lineHeight: 1.8 }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.html) }}
      />
    </section>
  );
}

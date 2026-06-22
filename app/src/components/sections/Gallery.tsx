import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
/* eslint-disable @next/next/no-img-element */
import type { GalleryProps } from "@/lib/site/types";

const c = scoped(styles);

export default function Gallery({ props }: { props: GalleryProps }) {
  return (
    <section className={c("sec")}>
      {props.title ? (
        <div className={c("sh rv")}>
          <h2 className={c("sec-title")}>{props.title}</h2>
        </div>
      ) : null}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {(props.images ?? []).map((img, i) => (
          <img
            key={i}
            src={img.url}
            alt={img.alt ?? ""}
            className={c("rv")}
            style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "var(--r)" }}
            loading="lazy"
          />
        ))}
      </div>
    </section>
  );
}

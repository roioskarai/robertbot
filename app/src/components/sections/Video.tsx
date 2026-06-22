import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { VideoProps } from "@/lib/site/types";

const c = scoped(styles);

function embedUrl(p: VideoProps): string {
  if (p.provider === "youtube") {
    const id =
      p.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? p.url;
    return `https://www.youtube.com/embed/${id}`;
  }
  if (p.provider === "vimeo") {
    const id = p.url.match(/vimeo\.com\/(\d+)/)?.[1] ?? p.url;
    return `https://player.vimeo.com/video/${id}`;
  }
  return p.url;
}

export default function Video({ props }: { props: VideoProps }) {
  return (
    <section className={c("sec")}>
      {props.title ? (
        <div className={c("sh rv")}>
          <h2 className={c("sec-title")}>{props.title}</h2>
        </div>
      ) : null}
      <div
        className={c("rv")}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {props.provider === "file" ? (
          <video
            src={props.url}
            controls
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        ) : (
          <iframe
            src={embedUrl(props)}
            title={props.title ?? "video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        )}
      </div>
    </section>
  );
}

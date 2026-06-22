import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { TestimonialsProps } from "@/lib/site/types";

const c = scoped(styles);

export default function Testimonials({ props }: { props: TestimonialsProps }) {
  return (
    <div className={c("sec-full")}>
      <div className={c("sec-full-inner")}>
        <div className={c("sh rv")}>
          {props.tag ? <div className={c("tag to")}>{props.tag}</div> : null}
          <h2 className={c("sec-title")}>{props.title}</h2>
        </div>
        <div className={c("testimonials")}>
          {(props.items ?? []).map((t, i) => (
            <div className={c("testi rv")} key={i}>
              <div className={c("testi-stars")}>{"★".repeat(t.stars ?? 5)}</div>
              <p className={c("testi-text")}>{t.text}</p>
              <div className={c("testi-author")}>
                <div
                  className={c("testi-av")}
                  style={{ background: t.avatarBg, color: t.avatarColor }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className={c("testi-name")}>{t.name}</div>
                  <div className={c("testi-role")}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { FeaturesProps } from "@/lib/site/types";
import { nl2br } from "./shared";

const c = scoped(styles);

export default function Features({ props }: { props: FeaturesProps }) {
  return (
    <div className={c("sec-full")}>
      <div className={c("sec-full-inner")} id="features">
        <div className={c("sh rv")}>
          {props.tag ? <div className={c("tag tp")}>{props.tag}</div> : null}
          <h2 className={c("sec-title")}>{nl2br(props.title)}</h2>
          {props.subtitle ? <p className={c("sec-sub")}>{props.subtitle}</p> : null}
        </div>
        <div className={c("feats-grid")}>
          {(props.items ?? []).map((f, i) => (
            <div className={c("feat rv")} key={i}>
              <div className={c("feat-ic " + (f.iconClass ?? "ic-g"))}>{f.icon}</div>
              <div className={c("feat-body")}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
